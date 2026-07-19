"""
Seeds the remaining 49 SEO-optimized service blogs automatically on migrate.
This ensures that all 61 service tools have dedicated, search-indexable landing articles.
"""
from django.db import migrations


def seed_service_blogs(apps, schema_editor):
    from django.core.management import call_command
    call_command('seed_service_blogs')


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('blog', '0004_seed_service_blogs'),
    ]

    operations = [
        migrations.RunPython(seed_service_blogs, noop),
    ]
