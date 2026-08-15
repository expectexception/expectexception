
import os
import django
from django.urls import resolve, Resolver404

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'expectexception.settings')
django.setup()

paths_to_check = [
    '/api/services/tools/',
    '/api/services/log-analysis/',
    '/api/services/analytics-dashboard/',
    '/admin/',
]

for path in paths_to_check:
    try:
        match = resolve(path)
        print(f"Path: {path} -> OK (view: {match.view_name})")
    except Resolver404:
        print(f"Path: {path} -> 404 (Not Found)")
    except Exception as e:
        print(f"Path: {path} -> Error: {e}")
