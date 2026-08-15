import requests
try:
    r = requests.get('http://localhost:8000/api/services/')
    print(f"Status: {r.status_code}")
    data = r.json()
    # Handle list or paginated result
    results = data.get('results', data) if isinstance(data, dict) else data
    
    found = False
    for s in results:
        print(f"- {s.get('title')} ({s.get('path')})")
        if 'Markdown' in s.get('title', ''):
            found = True
            
    if found:
        print("\nSUCCESS: Markdown Preview is in the API response.")
    else:
        print("\nFAILURE: Markdown Preview is NOT in the API response.")
        
except Exception as e:
    print(e)
