"""Ollama service for chat completions."""
import logging
import time
import requests
from typing import Generator, Optional, Dict, Any, List
from django.conf import settings

logger = logging.getLogger(__name__)


class OllamaService:
    """Service for interacting with Ollama API."""
    
    def __init__(self):
        self.base_url = getattr(settings, 'OLLAMA_BASE_URL', 'http://localhost:11434')
        self.model = getattr(settings, 'CHATBOT_MODEL', 'phi3:mini')
        self.max_tokens = getattr(settings, 'CHATBOT_MAX_TOKENS', 2048)
    
    def is_available(self) -> bool:
        """Check if Ollama server is running."""
        try:
            response = requests.get(f"{self.base_url}/api/tags", timeout=5)
            return response.status_code == 200
        except requests.RequestException:
            return False
    
    def get_models(self) -> List[str]:
        """Get list of available models."""
        try:
            response = requests.get(f"{self.base_url}/api/tags", timeout=10)
            if response.status_code == 200:
                data = response.json()
                return [model['name'] for model in data.get('models', [])]
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
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            model: Model to use (defaults to settings.CHATBOT_MODEL)
            stream: Whether to stream the response
            
        Yields:
            Response text chunks
        """
        model = model or self.model
        url = f"{self.base_url}/api/chat"
        
        payload = {
            "model": model,
            "messages": messages,
            "stream": stream,
            "options": {
                "num_predict": self.max_tokens,
            }
        }
        
        try:
            with requests.post(url, json=payload, stream=stream, timeout=120) as response:
                response.raise_for_status()
                
                if stream:
                    for line in response.iter_lines():
                        if line:
                            import json
                            data = json.loads(line)
                            if 'message' in data and 'content' in data['message']:
                                yield data['message']['content']
                            if data.get('done', False):
                                break
                else:
                    data = response.json()
                    if 'message' in data and 'content' in data['message']:
                        yield data['message']['content']
                        
        except requests.RequestException as e:
            logger.error(f"Ollama chat error: {e}")
            yield f"Error: Unable to connect to AI model. Please try again later."
    
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
