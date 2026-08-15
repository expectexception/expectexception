from django.db import migrations


def add_uptime_robot_service(apps, schema_editor):
    Service = apps.get_model('services', 'Service')

    Service.objects.update_or_create(
        path='/services/uptime-robot',
        defaults={
            'title': 'Uptime Robot Monitor',
            'description': 'Monitor websites, APIs, servers, ports, and check SSL certificate expiration and response times.',
            'icon': 'NetworkCheck',
            'category': 'developer',
            'popularity': 80,
            'tags': ['uptime', 'monitor', 'ssl', 'ping', 'port'],
            'color': 'success',
            'is_active': True,
        },
    )


def remove_uptime_robot_service(apps, schema_editor):
    Service = apps.get_model('services', 'Service')
    Service.objects.filter(path='/services/uptime-robot').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('services', '0016_service_requires_login'),
    ]

    operations = [
        migrations.RunPython(add_uptime_robot_service, reverse_code=remove_uptime_robot_service),
    ]
