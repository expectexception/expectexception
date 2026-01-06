from django.db import migrations


def add_regex_tester_service(apps, schema_editor):
    Service = apps.get_model('services', 'Service')

    path = '/services/regex-tester'

    Service.objects.update_or_create(
        path=path,
        defaults={
            'title': 'Regex Tester',
            'description': 'Test regular expressions against text and learn patterns with a built-in cheat sheet.',
            'icon': 'Code',
            'category': 'developer',
            'popularity': 79,
            'tags': ['regex', 'developer', 'pattern', 'tester'],
            'color': 'info',
            'is_active': True,
        },
    )


def remove_regex_tester_service(apps, schema_editor):
    Service = apps.get_model('services', 'Service')
    Service.objects.filter(path='/services/regex-tester').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('services', '0010_toolusage'),
    ]

    operations = [
        migrations.RunPython(add_regex_tester_service, reverse_code=remove_regex_tester_service),
    ]
