from django.core.management.base import BaseCommand
from apps.users.models import User
from apps.blog.models import Post, Tag


class Command(BaseCommand):
    help = 'Seeds the database with sample users and posts'

    def handle(self, *args, **options):
        if not User.objects.filter(email='demo@example.com').exists():
            user = User.objects.create_user(email='demo@example.com', password='DemoPass123')
            user.profile.bio = 'Demo user'
            user.profile.save()
        else:
            user = User.objects.get(email='demo@example.com')

        t1, _ = Tag.objects.get_or_create(name='django')
        t2, _ = Tag.objects.get_or_create(name='python')

        Post.objects.create(title='Welcome to ExpectException', content='This is a demo post', author=user, status=Post.STATUS_PUBLISHED)
        self.stdout.write(self.style.SUCCESS('Seeded the database.'))
