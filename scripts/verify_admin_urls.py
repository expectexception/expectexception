import os
import sys
import django
from django.urls import reverse, NoReverseMatch

# Setup Django environment
sys.path.append('/home/rjt/expexcV2/expectexception')
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "expectexception.settings")
django.setup()

def check_url(name):
    try:
        url = reverse(name)
        print(f"✅ PASS: {name} -> {url}")
        return True
    except NoReverseMatch:
        print(f"❌ FAIL: {name} -> NoReverseMatch")
        return False
    except Exception as e:
        print(f"❌ FAIL: {name} -> Error: {e}")
        return False

def verify_all_sidebar_links():
    print("--- Verifying Admin Sidebar Links ---")
    
    # List of all links defined in settings.UNFOLD['SIDEBAR']
    links_to_check = [
        "admin:index",
        "admin:users_user_changelist",
        "admin:blog_post_changelist",
        "admin:chatbot_message_changelist",
        "admin:services_downloadableresource_changelist",
        "admin:services_serverhealth_changelist",
        "admin:services_loganalysis_changelist",
        "admin:services_toolusage_changelist",
        # "admin:services_server_status_api", # Not in sidebar but check consistency
    ]
    
    failures = 0
    for name in links_to_check:
        if not check_url(name):
            failures += 1
            
    print("\n--- Summary ---")
    if failures == 0:
        print("🎉 ALL CHECKS PASSED. Admin sidebar should render.")
    else:
        print(f"⚠️ FOUND {failures} BROKEN LINKS. These will cause 500 Errors.")

if __name__ == "__main__":
    verify_all_sidebar_links()
