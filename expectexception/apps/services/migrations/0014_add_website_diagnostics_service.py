from django.db import migrations


def add_website_diagnostics_service(apps, schema_editor):
    Service = apps.get_model('services', 'Service')

    Service.objects.update_or_create(
        path='/services/website-diagnostics',
        defaults={
            'title': 'Website Diagnostics',
            'description': 'Run DNS lookup and redirect-chain inspection from a single dashboard.',
            'icon': 'Terminal',
            'category': 'developer',
            'popularity': 79,
            'tags': ['dns', 'redirect', 'headers', 'debug'],
            'color': 'info',
            'is_active': True,
        },
    )


def remove_website_diagnostics_service(apps, schema_editor):
    Service = apps.get_model('services', 'Service')
    Service.objects.filter(path='/services/website-diagnostics').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('services', '0013_add_redirect_inspector_and_dns_lookup_services'),
    ]

    operations = [
        migrations.RunPython(add_website_diagnostics_service, reverse_code=remove_website_diagnostics_service),
    ]
