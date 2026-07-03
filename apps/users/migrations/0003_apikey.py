from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0002_user_auth_provider_user_avatar_url_user_google_id'),
    ]

    operations = [
        migrations.CreateModel(
            name='APIKey',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text="Friendly name, e.g. 'My Script'", max_length=100)),
                ('key', models.CharField(db_index=True, max_length=64, unique=True)),
                ('scope', models.CharField(choices=[('read', 'Read Only'), ('full', 'Full Access')], default='full', max_length=20)),
                ('is_active', models.BooleanField(default=True)),
                ('last_used_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('expires_at', models.DateTimeField(blank=True, help_text='Leave blank for no expiry', null=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='api_keys', to='users.user')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
