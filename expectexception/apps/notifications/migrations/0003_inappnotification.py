from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('notifications', '0002_pushsubscription_notificationlog_delete_notification_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='InAppNotification',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('notification_type', models.CharField(choices=[('reply', 'New Reply'), ('vote', 'Vote Received'), ('accepted', 'Answer Accepted'), ('mention', 'Mention')], max_length=20)),
                ('title', models.CharField(max_length=200)),
                ('body', models.TextField(blank=True)),
                ('url', models.CharField(blank=True, help_text='Frontend path to navigate to', max_length=500)),
                ('is_read', models.BooleanField(db_index=True, default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('recipient', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='notifications', to=settings.AUTH_USER_MODEL)),
                ('sender', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='sent_notifications', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='inappnotification',
            index=models.Index(fields=['recipient', 'is_read', '-created_at'], name='notif_recipient_read_idx'),
        ),
    ]
