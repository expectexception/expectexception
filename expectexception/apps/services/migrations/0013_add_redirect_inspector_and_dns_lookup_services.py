from django.db import migrations


def add_redirect_inspector_and_dns_lookup_services(apps, schema_editor):
    Service = apps.get_model('services', 'Service')

    Service.objects.update_or_create(
        path='/services/redirect-inspector',
        defaults={
            'title': 'Redirect Chain + Header Inspector',
            'description': 'Follow redirect hops and inspect final security/cache headers (CSP, CORS, HSTS) for a URL.',
            'icon': 'AltRoute',
            'category': 'developer',
            'popularity': 79,
            'tags': ['redirect', 'headers', 'http', 'debug'],
            'color': 'info',
            'is_active': True,
        },
    )

    Service.objects.update_or_create(
        path='/services/dns-lookup',
        defaults={
            'title': 'DNS Lookup + Propagation Check',
            'description': 'Lookup DNS records (A/AAAA/CNAME/MX/TXT) across multiple resolvers to troubleshoot propagation.',
            'icon': 'Dns',
            'category': 'developer',
            'popularity': 79,
            'tags': ['dns', 'lookup', 'propagation', 'debug'],
            'color': 'info',
            'is_active': True,
        },
    )


def remove_redirect_inspector_and_dns_lookup_services(apps, schema_editor):
    Service = apps.get_model('services', 'Service')
    Service.objects.filter(path__in=['/services/redirect-inspector', '/services/dns-lookup']).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('services', '0012_add_keypair_generator_service'),
    ]

    operations = [
        migrations.RunPython(
            add_redirect_inspector_and_dns_lookup_services,
            reverse_code=remove_redirect_inspector_and_dns_lookup_services,
        ),
    ]
