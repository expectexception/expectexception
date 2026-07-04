"""
Runs the same seeding as `manage.py seed_service_blogs` automatically on
migrate. Render has no shell access on the free tier, so this was the only
way to get these 12 SEO landing posts onto its database — entrypoint.sh
already runs `migrate --noinput` on every deploy. Idempotent (matches by
slug, safe to re-run), so this is a permanent no-op once posts exist.
"""
from django.db import migrations


def seed_service_blogs(apps, schema_editor):
    from django.core.management import call_command
    call_command('seed_service_blogs')


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('blog', '0003_comment_parent'),
        ('users', '0004_add_subscription'),
    ]

    operations = [
        migrations.RunPython(seed_service_blogs, noop),
    ]
