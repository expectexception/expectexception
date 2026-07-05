"""Ollama service for chat completions."""
import logging
import time
import requests
import httpx
import json
from typing import Generator, AsyncGenerator, Optional, Dict, Any, List
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)

# Concurrency cap: without this, every simultaneous chat request hits the
# same GPU-backed Ollama instance with no admission control, so N users
# chatting at once just makes all N requests slower/timeout together
# instead of failing fast for the (N+1)th. Backed by Redis (django-redis
# CACHES backend) so the counter is process-wide across all gunicorn
# workers, not per-process.
MAX_CONCURRENT_CHATS = getattr(settings, 'CHATBOT_MAX_CONCURRENT', 3)
_ACTIVE_CHATS_KEY = 'chatbot:active_calls'
_ACTIVE_CHATS_TTL = 300  # safety net: self-heals if a release is ever missed


def acquire_chat_slot() -> bool:
    """Try to claim one of the limited concurrent-chat slots. Returns False
    if the server is already at capacity — caller should respond with a
    "busy" message rather than proceeding."""
    added = cache.add(_ACTIVE_CHATS_KEY, 1, timeout=_ACTIVE_CHATS_TTL)
    if added:
        return True
    try:
        count = cache.incr(_ACTIVE_CHATS_KEY)
    except ValueError:
        # Key expired between add() and incr() — race is harmless, just retry once.
        cache.add(_ACTIVE_CHATS_KEY, 1, timeout=_ACTIVE_CHATS_TTL)
        return True
    if count > MAX_CONCURRENT_CHATS:
        release_chat_slot()
        return False
    return True


def release_chat_slot() -> None:
    try:
        cache.decr(_ACTIVE_CHATS_KEY)
    except ValueError:
        pass  # already expired/reset — nothing to release


class OllamaService:
    """Service for interacting with Ollama API."""

    _client: Optional[httpx.AsyncClient] = None

    def __init__(self):
        self.base_url = getattr(settings, 'OLLAMA_BASE_URL', 'http://localhost:11434')
        self.model = getattr(settings, 'CHATBOT_MODEL', 'phi3:mini')
        self.max_tokens = getattr(settings, 'CHATBOT_MAX_TOKENS', 2048)
    
    def get_async_client(self) -> httpx.AsyncClient:
        """Get or create singleton async client."""
        if self._client is None or self._client.is_closed:
            timeout = httpx.Timeout(300.0, connect=20.0)
            # Use HTTP/2 for better concurrency
            self._client = httpx.AsyncClient(
                timeout=timeout, 
                verify=False,
                http2=True 
            )
        return self._client

    def is_available(self) -> bool:
        """Check if Ollama server is running."""
        try:
            # Handle both http and https, skip verification for local common cases if needed
            response = requests.get(f"{self.base_url}/api/tags", timeout=5, verify=False)
            is_ok = response.status_code == 200
            if is_ok:
                logger.info(f"✓ Ollama available at {self.base_url}")
            return is_ok
        except requests.RequestException as e:
            logger.warning(f"✗ Ollama unavailable at {self.base_url}: {e}")
            return False
    
    def get_models(self) -> List[Dict[str, Any]]:
        """Get detailed list of available models."""
        try:
            response = requests.get(f"{self.base_url}/api/tags", timeout=10, verify=False)
            if response.status_code == 200:
                data = response.json()
                return data.get('models', [])
            return []
        except requests.RequestException as e:
            logger.error(f"Failed to get models: {e}")
            return []

    def get_running_models(self) -> List[Dict[str, Any]]:
        """Get list of currently loaded/running models."""
        try:
            response = requests.get(f"{self.base_url}/api/ps", timeout=10, verify=False)
            if response.status_code == 200:
                data = response.json()
                return data.get('models', [])
            return []
        except requests.RequestException as e:
            logger.error(f"Failed to get running models: {e}")
            return []

    def model_info(self, model_name: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Get detailed info about a specific model (size, parameters, quantization)."""
        model_name = model_name or self.model
        try:
            response = requests.post(
                f"{self.base_url}/api/show",
                json={"name": model_name},
                timeout=15,
                verify=False,
            )
            if response.status_code == 200:
                return response.json()
            return None
        except requests.RequestException as e:
            logger.error(f"Failed to get model info for {model_name}: {e}")
            return None

    def pull_model(self, model_name: str) -> Dict[str, Any]:
        """Pull/download a model from Ollama Hub.

        Returns a status dict with 'status' key.
        Note: This is a blocking call and can take minutes for large models.
        """
        try:
            response = requests.post(
                f"{self.base_url}/api/pull",
                json={"name": model_name, "stream": False},
                timeout=600,  # 10 min timeout for large models
                verify=False,
            )
            if response.status_code == 200:
                logger.info(f"Successfully pulled model: {model_name}")
                return {"status": "success", "model": model_name}
            else:
                error = response.text
                logger.error(f"Failed to pull model {model_name}: {error}")
                return {"status": "error", "error": error}
        except requests.RequestException as e:
            logger.error(f"Pull model request failed for {model_name}: {e}")
            return {"status": "error", "error": str(e)}

    def delete_model(self, model_name: str) -> Dict[str, Any]:
        """Delete a model from Ollama."""
        try:
            response = requests.delete(
                f"{self.base_url}/api/delete",
                json={"name": model_name},
                timeout=30,
                verify=False,
            )
            if response.status_code == 200:
                logger.info(f"Deleted model: {model_name}")
                return {"status": "success", "model": model_name}
            else:
                error = response.text
                logger.error(f"Failed to delete model {model_name}: {error}")
                return {"status": "error", "error": error}
        except requests.RequestException as e:
            logger.error(f"Delete model request failed for {model_name}: {e}")
            return {"status": "error", "error": str(e)}

    def chat(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        stream: bool = True
    ) -> Generator[str, None, None]:
        """
        Send chat request to Ollama and yield streaming response.
        """
        model = model or self.model
        url = f"{self.base_url}/api/chat"
        
        payload = {
            "model": model,
            "messages": messages,
            "stream": stream,
            "keep_alive": "5m",
            "options": {
                "num_predict": self.max_tokens,
                "num_ctx": 4096,
                "temperature": 0.7,
            }
        }
        
        max_retries = 2
        retry_count = 0
        
        while retry_count <= max_retries:
            try:
                # verify=False for local https support
                with requests.post(url, json=payload, stream=stream, timeout=120, verify=False) as response:
                    response.raise_for_status()
                    
                    if stream:
                        for line in response.iter_lines():
                            if line:
                                try:
                                    data = json.loads(line)
                                    if 'message' in data and 'content' in data['message']:
                                        yield data['message']['content']
                                    if data.get('done', False):
                                        break
                                except json.JSONDecodeError:
                                    continue
                    else:
                        data = response.json()
                        if 'message' in data and 'content' in data['message']:
                            yield data['message']['content']
                    return 
                            
            except (requests.Timeout, requests.ConnectionError):
                # Transient — worth retrying.
                retry_count += 1
                if retry_count > max_retries:
                    logger.error("Ollama chat failed after retries")
                    yield "Error: AI Service is busy or unreachable. Please try again."
                else:
                    time.sleep(1)

            except requests.HTTPError as e:
                status_code = e.response.status_code if e.response is not None else None
                if status_code == 404:
                    # Permanent — the model isn't pulled/available; retrying won't help.
                    logger.error(f"Ollama model not found (404): {model}")
                    yield "Error: The AI model isn't available right now."
                else:
                    logger.error(f"Ollama chat HTTP error: {status_code}")
                    yield "Error: AI Service is temporarily unavailable. Please try again."
                return

            except requests.RequestException as e:
                logger.error(f"Ollama chat error: {type(e).__name__}")
                yield "Error: AI Service is temporarily unavailable. Please try again."
                return
    
    async def chat_async(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """
        Send async chat request to Ollama and yield streaming response.
        Uses httpx with SSL verification disabled for flexibility.
        Implements exponential backoff retry.
        """
        model = model or self.model
        url = f"{self.base_url}/api/chat"
        
        payload = {
            "model": model,
            "messages": messages,
            "stream": True,
            "keep_alive": "5m",
            "options": {
                "num_predict": self.max_tokens,
                "num_ctx": 4096,
                "temperature": 0.7,
            }
        }
        
        max_retries = 3
        import asyncio

        for attempt in range(max_retries):
            client = self.get_async_client()

            try:
                async with client.stream("POST", url, json=payload, timeout=300.0) as response:
                    if response.status_code == 404:
                        # Permanent — the model isn't pulled/available. Retrying
                        # identical requests against a model that doesn't exist
                        # just wastes 3 rounds of backoff for the same failure.
                        error_text = await response.aread()
                        logger.error(f"Ollama model not found (404): {error_text}")
                        yield "Error: The AI model isn't available right now."
                        return
                    if response.status_code != 200:
                        error_text = await response.aread()
                        logger.error(f"Ollama async error {response.status_code}: {error_text}")
                        if attempt < max_retries - 1:
                            wait = 2 ** attempt
                            logger.info(f"Retrying Ollama chat in {wait}s (attempt {attempt + 1}/{max_retries})")
                            await asyncio.sleep(wait)
                            continue
                        yield "Error: AI model failed to respond."
                        return

                    async for line in response.aiter_lines():
                        if line:
                            try:
                                data = json.loads(line)
                                if 'message' in data and 'content' in data['message']:
                                    chunk = data['message']['content']
                                    if chunk:
                                        yield chunk
                                if data.get('done', False):
                                    break
                            except json.JSONDecodeError as e:
                                logger.debug(f"JSON parse error in stream: {e}")
                                continue
                    return  # Success — exit retry loop

            except httpx.TimeoutException:
                if attempt < max_retries - 1:
                    wait = 2 ** attempt
                    logger.warning(f"Ollama timeout, retrying in {wait}s (attempt {attempt + 1}/{max_retries})")
                    await asyncio.sleep(wait)
                else:
                    logger.error("Ollama async chat timeout after all retries")
                    yield "Error: Model took too long to respond. It might be large or busy."

            except Exception as e:
                if attempt < max_retries - 1:
                    wait = 2 ** attempt
                    logger.warning(f"Ollama error: {e}, retrying in {wait}s (attempt {attempt + 1}/{max_retries})")
                    await asyncio.sleep(wait)
                else:
                    logger.error(f"Ollama async chat error: {e}", exc_info=True)
                    yield f"Error: Connection to AI failed ({type(e).__name__})."

    def generate_title(self, first_message: str) -> str:
        """Generate a conversation title from the first message."""
        messages = [
            {
                "role": "system",
                "content": "Generate a very short title (3-5 words) for a conversation that starts with the following message. Only output the title, nothing else."
            },
            {"role": "user", "content": first_message}
        ]
        
        try:
            url = f"{self.base_url}/api/chat"
            payload = {
                "model": self.model,
                "messages": messages,
                "stream": False,
                "options": {"num_predict": 20}
            }
            
            response = requests.post(url, json=payload, timeout=30)
            if response.status_code == 200:
                data = response.json()
                title = data.get('message', {}).get('content', '').strip()
                return title[:50] if title else "New Chat"
            return "New Chat"
        except Exception as e:
            logger.error(f"Failed to generate title: {e}")
            return "New Chat"


# Singleton instance
ollama_service = OllamaService()

