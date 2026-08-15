import os
import sys
import django

# Setup Django environment so settings and .env are loaded
sys.path.append('/home/rjt/expexcV2/expectexception')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'expectexception.settings')
django.setup()

from apps.services.mongodb import get_mongodb_client, get_mongodb_db

print("Connecting to MongoDB Atlas...")
client = get_mongodb_client()
if client:
    print("SUCCESS: Successfully connected and authenticated with MongoDB Atlas!")
    db = get_mongodb_db()
    if db is not None:
        print(f"Database: {db.name}")
        # List collections to verify access permissions
        collections = db.list_collection_names()
        print(f"Collections present in database: {collections}")
    else:
        print("ERROR: Database instance could not be retrieved.")
else:
    print("FAILED: Could not connect to MongoDB Atlas. Please check your credentials and IP access list.")
