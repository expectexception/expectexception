from django.db import migrations


def add_keypair_generator_service(apps, schema_editor):
    Service = apps.get_model('services', 'Service')

    path = '/services/keypair-generator'

    Service.objects.update_or_create(
        path=path,
        defaults={
            'title': 'RSA/EC Keypair Generator',
            'description': 'Generate RSA or Elliptic Curve (EC) public/private keypairs and export as PEM or JWK.',
            'icon': 'Lock',
            'category': 'developer',
            'popularity': 79,
            'tags': ['crypto', 'keys', 'developer', 'rsa', 'ec'],
            'color': 'info',
            'is_active': True,
        },
    )


def remove_keypair_generator_service(apps, schema_editor):
    Service = apps.get_model('services', 'Service')
    Service.objects.filter(path='/services/keypair-generator').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('services', '0011_add_regex_tester_service'),
    ]

    operations = [
        migrations.RunPython(add_keypair_generator_service, reverse_code=remove_keypair_generator_service),
    ]
