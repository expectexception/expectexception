from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('profiles', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='profile',
            name='reputation',
            field=models.IntegerField(default=0, db_index=True),
        ),
        migrations.AddField(
            model_name='profile',
            name='badges',
            field=models.JSONField(default=list, blank=True),
        ),
    ]
