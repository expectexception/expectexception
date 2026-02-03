import os
import sys
import django
from django.urls import reverse, NoReverseMatch
import urllib.request
import urllib.error
import time

# Setup Django environment
sys.path.append('/home/rjt/expexcV2/expectexception')
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "expectexception.settings")
django.setup()

BASE_URL = "http://127.0.0.1:8000"

def check_reverse(name, args=None, kwargs=None):
    try:
        url = reverse(name, args=args, kwargs=kwargs)
        print(f"✅ CONF: {name} -> {url}")
        return url
    except NoReverseMatch:
        print(f"❌ CONF: {name} -> NoReverseMatch")
        return None
    except Exception as e:
        print(f"❌ CONF: {name} -> Error: {e}")
        return None

def check_request(path):
    url = f"{BASE_URL}{path}"
    try:
        req = urllib.request.Request(url)
        # Verify 500 errors are NOT happening. 
        # 401/403/302 are ACCEPTABLE because we are unauthenticated script.
        # 200 is GREAT.
        with urllib.request.urlopen(req) as response:
            print(f"✅ HTTP: {path} -> {response.status} OK")
            return True
    except urllib.error.HTTPError as e:
        if e.code in [401, 403]:
            print(f"✅ HTTP: {path} -> {e.code} (Auth Protected - Expected)")
            return True
        elif e.code == 404:
             print(f"⚠️ HTTP: {path} -> 404 Not Found")
             return False
        elif e.code == 500:
            print(f"❌ HTTP: {path} -> 500 INTERNAL SERVER ERROR")
            return False
        else:
             print(f"⚠️ HTTP: {path} -> {e.code}")
             return True # Acceptable
    except urllib.error.URLError as e:
        print(f"❌ HTTP: {path} -> Connection Failed: {e.reason}")
        return False
    except Exception as e:
        print(f"❌ HTTP: {path} -> Error: {e}")
        return False

def verify_system():
    print("=== 1. VERIFYING CONFIGURATION (Reverse URL Lookups) ===")
    
    # Sidebar Links
    sidebar = [
        "admin:index",
        "admin:blog_post_changelist", 
        "admin:chatbot_message_changelist",
        "admin:services_serverhealth_changelist",
        "admin:services_loganalysis_changelist",
    ]
    for name in sidebar:
        check_reverse(name)

    # Chatbot API
    print("\n--- Chatbot API Config ---")
    check_reverse('chatbot_status')
    check_reverse('chatbot_chat')
    check_reverse('chatbot_conversations')
    
    # Services API
    print("\n--- Services API Config ---")
    check_reverse('server-status-api') # /api/services/server-status-api/
    # check_reverse('server-health') # /api/services/server-health/ (TemplateView)
    
    print("\n\n=== 2. VERIFYING RUNTIME (Live HTTP Requests) ===")
    
    # Check Admin Page (The one that was crashing)
    # Redirects to login usually
    check_request("/admin/")
    
    # Check Server Status API
    # Redirects to login (staff_member_required causes 302 to login or 200 if permissive)
    # Actually urllib follows redirects automatically? No, standard opener might.
    # Default opener follows redirects. So if it goes to /admin/login/ it returns 200.
    check_request("/api/services/server-status-api/")
    
    # Check Chatbot URLs
    # Likely 401 Unauthenticated
    check_request("/api/chatbot/conversations/")
    check_request("/api/chatbot/status/")

if __name__ == "__main__":
    verify_system()
