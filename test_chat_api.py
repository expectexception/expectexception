import requests
import json
import sys

# Try both localhost and 127.0.0.1
URLS = [
    "http://localhost:8000/api/chatbot/chat/",
    "http://127.0.0.1:8000/api/chatbot/chat/"
]

def test_chat():
    payload = {
        "message": "Hello, are you working?",
        "conversation_id": None,
        "system_prompt": "You are a helpful assistant."
    }
    
    success = False
    
    for url in URLS:
        print(f"Testing URL: {url}...")
        try:
            with requests.post(url, json=payload, stream=True, timeout=10) as response:
                if response.status_code == 200:
                    print(f"✅ Connection successful to {url}")
                    print("Streaming response:")
                    for line in response.iter_lines():
                        if line:
                            decoded = line.decode('utf-8')
                            if decoded.startswith('data: '):
                                data = json.loads(decoded[6:])
                                if 'chunk' in data:
                                    print(data['chunk'], end='', flush=True)
                                if 'done' in data and data['done']:
                                    print("\n\n✅ Stream completed successfully")
                                    success = True
                    break
                else:
                    print(f"❌ Failed with status code: {response.status_code}")
                    print(response.text)
        except Exception as e:
            print(f"❌ Error connecting to {url}: {e}")
            
    if not success:
        print("\n❌ All connection attempts failed. Please check if the Django server is running.")
        sys.exit(1)

if __name__ == "__main__":
    test_chat()
