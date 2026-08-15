import os
import sys
import django
from django.urls import reverse
from django.conf import settings

# Setup Django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'expectexception.settings')
django.setup()

def verify_links():
    sidebar = settings.UNFOLD['SIDEBAR']['navigation']
    all_passed = True
    
    print("Verifying Sidebar Links...")
    
    for section in sidebar:
        print(f"\nSection: {section.get('title', 'Unknown')}")
        for item in section.get('items', []):
            title = item.get('title', 'Unknown')
            link_promise = item.get('link')
            
            # reverse_lazy objects need to be cast to string or evaluated
            try:
                # The promise is evaluated when used as string
                url = str(link_promise)
                print(f"  [PASS] {title} -> {url}")
            except Exception as e:
                print(f"  [FAIL] {title} -> Error resolving: {e}")
                all_passed = False
                
    if all_passed:
        print("\nSUCCESS: All sidebar links verified.")
    else:
        print("\nFAILURE: Some sidebar links are broken.")
        sys.exit(1)

if __name__ == '__main__':
    verify_links()
