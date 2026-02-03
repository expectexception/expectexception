"""Ollama service for chat completions."""
import logging
import time
import requests
import httpx
import json
from typing import Generator, AsyncGenerator, Optional, Dict, Any, List
from django.conf import settings

logger = logging.getLogger(__name__)


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
            return response.status_code == 200
        except requests.RequestException:
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
                retry_count += 1
                if retry_count > max_retries:
                    logger.error("Ollama chat failed after retries")
                    yield "Error: AI Service is busy or unreachable. Please try again."
                else:
                    time.sleep(1)
                    
            except requests.RequestException as e:
                logger.error(f"Ollama chat error: {e}")
                yield f"Error: {str(e)}"
                return
    
    async def chat_async(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """
        Send async chat request to Ollama and yield streaming response.
        Uses httpx with SSL verification disabled for flexibility.
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
                "num_ctx": 4096, # Reduced context for speed
                "temperature": 0.7,
            }
        }
        
        client = self.get_async_client()
        
        try:
            async with client.stream("POST", url, json=payload) as response:
                if response.status_code != 200:
                    error_text = await response.aread()
                    logger.error(f"Ollama async error {response.status_code}: {error_text}")
                    yield "Error: AI model failed to respond."
                    return

                async for line in response.aiter_lines():
                    if line:
                        try:
                            data = json.loads(line)
                            if 'message' in data and 'content' in data['message']:
                                yield data['message']['content']
                            if data.get('done', False):
                                break
                        except json.JSONDecodeError:
                            continue
                                
        except httpx.TimeoutException:
            logger.error("Ollama async chat timeout")
            yield "Error: Model took too long to respond. It might be large or busy."
        except Exception as e:
            logger.error(f"Ollama async chat error: {e}")
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
