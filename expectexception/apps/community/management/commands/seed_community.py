from django.core.management.base import BaseCommand
from apps.community.models import Category


class Command(BaseCommand):
    help = 'Seed community categories'

    def handle(self, *args, **kwargs):
        categories = [
            {'name': 'General', 'description': 'General discussion and announcements', 'icon': 'Forum', 'color': '#3dfc55', 'order': 1},
            {'name': 'Help & Support', 'description': 'Get help with tools and bugs', 'icon': 'Help', 'color': '#00e5ff', 'order': 2},
            {'name': 'Developer Tools', 'description': 'Discussions about dev tools on the platform', 'icon': 'Code', 'color': '#a78bfa', 'order': 3},
            {'name': 'Show & Tell', 'description': 'Share what you built using ExpectException', 'icon': 'RocketLaunch', 'color': '#f59e0b', 'order': 4},
            {'name': 'Feature Requests', 'description': 'Suggest new features and improvements', 'icon': 'Star', 'color': '#ec4899', 'order': 5},
            {'name': 'Bug Reports', 'description': 'Report issues and bugs you find', 'icon': 'BugReport', 'color': '#ef4444', 'order': 6},
            {'name': 'AI & Machine Learning', 'description': 'AI tools, models, and discussions', 'icon': 'Psychology', 'color': '#10b981', 'order': 7},
        ]
        for cat_data in categories:
            cat, created = Category.objects.get_or_create(name=cat_data['name'], defaults=cat_data)
            status = 'Created' if created else 'Already exists'
            self.stdout.write(f'{status}: {cat.name}')
        self.stdout.write(self.style.SUCCESS('Community categories seeded.'))
