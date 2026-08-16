"""Re-runs seed_service_blogs to propagate two fixes into every environment.

Migrations 0004/0005 already applied on Render and the local GPU server, so
changing seed_service_blogs.py or service_blog_data.py alone would not
re-run there - Django only tracks whether a migration ran, not whether its
RunPython function's behavior changed since. This migration exists purely
to get entrypoint.sh's `migrate --noinput` to invoke the updated command:

- Author reassignment: every existing post has always been re-saved with
  whichever account seed_service_blogs.py resolves as author on each run,
  so re-running it also fixes any environment where that resolved to
  demo@example.com or a personal-email superuser (see the hardened
  @expectexception.com preference in seed_service_blogs.py).
- 5 new service posts (EXIF Viewer, SQL Formatter, Colour Blindness
  Simulator, Readability Analyzer, Loan Calculator) added to
  service_blog_data.py after 0005 was written.
"""

from django.db import migrations


def reseed_service_blogs(apps, schema_editor):
    from django.core.management import call_command

    call_command("seed_service_blogs")


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("blog", "0005_seed_remaining_blogs"),
    ]

    operations = [
        migrations.RunPython(reseed_service_blogs, noop),
    ]
