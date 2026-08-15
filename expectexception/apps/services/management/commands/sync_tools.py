
import json
import os
from django.core.management.base import BaseCommand
from django.conf import settings
from apps.services.models import Service

class Command(BaseCommand):
    help = 'Syncs tools configuration from frontend tools.json to database'

    def handle(self, *args, **kwargs):
        # Path to tools.json (relative to backend root)
        # Assuming structure:
        # /home/rjt/expexcV2/
        #   Prefix/ (backend root where manage.py is)
        #   frontendExpExc/src/data/tools.json
        
        # Adjust path based on project structure
        # BASE_DIR is expectexception/expectexception (usually) or expectexception/
        # We need to go up to V2 root
        
        # Using specific absolute path for reliability in this environment
        json_path = '/home/rjt/expexcV2/frontendExpExc/src/data/tools.json'
        
        if not os.path.exists(json_path):
            self.stdout.write(self.style.ERROR(f'tools.json not found at {json_path}'))
            return

        with open(json_path, 'r') as f:
            tools = json.load(f)

        updated_count = 0
        created_count = 0

        for tool in tools:
            # Map JSON fields to Model fields
            # JSON: title, description, path, icon, color, popularity, category, tags
            # Model: title, description, path, icon, color, popularity, category, tags (might be string or ArrayField)
            
            defaults = {
                'description': tool['description'],
                'icon': tool['icon'],
                'color': tool['color'],
                'popularity': tool['popularity'],
                'category': tool['category'],
                'tags': tool['tags'], # Django Arrayfield handles list directly if configured, else needs CSV
                'is_active': True
            }

            obj, created = Service.objects.update_or_create(
                path=tool['path'], # Use path as unique identifier
                defaults=defaults
            )
            
            # Also update title if it changed (update_or_create uses lookups for finding)
            if not created and obj.title != tool['title']:
                obj.title = tool['title']
                obj.save()

            if created:
                created_count += 1
                self.stdout.write(f"Created: {tool['title']}")
            else:
                updated_count += 1
                self.stdout.write(f"Updated: {tool['title']}")

        self.stdout.write(self.style.SUCCESS(f'Successfully synced tools. Created: {created_count}, Updated: {updated_count}'))
