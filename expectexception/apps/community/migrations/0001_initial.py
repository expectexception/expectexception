from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Category',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100, unique=True)),
                ('slug', models.SlugField(blank=True, max_length=100, unique=True)),
                ('description', models.TextField(blank=True)),
                ('icon', models.CharField(blank=True, help_text='MUI icon name', max_length=50)),
                ('color', models.CharField(blank=True, default='#3dfc55', max_length=20)),
                ('order', models.PositiveIntegerField(default=0)),
            ],
            options={
                'verbose_name_plural': 'Categories',
                'ordering': ['order', 'name'],
            },
        ),
        migrations.CreateModel(
            name='Thread',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=300)),
                ('slug', models.SlugField(blank=True, max_length=300, unique=True)),
                ('body', models.TextField()),
                ('tags', models.CharField(blank=True, help_text='Comma-separated tags', max_length=255)),
                ('is_pinned', models.BooleanField(default=False)),
                ('is_closed', models.BooleanField(default=False)),
                ('is_solved', models.BooleanField(default=False)),
                ('view_count', models.PositiveIntegerField(default=0)),
                ('vote_count', models.IntegerField(default=0)),
                ('reply_count', models.PositiveIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('last_activity', models.DateTimeField(auto_now_add=True)),
                ('author', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='threads', to=settings.AUTH_USER_MODEL)),
                ('category', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='threads', to='community.category')),
            ],
            options={
                'ordering': ['-is_pinned', '-last_activity'],
            },
        ),
        migrations.CreateModel(
            name='Reply',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('body', models.TextField()),
                ('is_accepted_answer', models.BooleanField(default=False)),
                ('vote_count', models.IntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('author', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='community_replies', to=settings.AUTH_USER_MODEL)),
                ('parent', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='children', to='community.reply')),
                ('thread', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='replies', to='community.thread')),
            ],
            options={
                'ordering': ['created_at'],
            },
        ),
        migrations.CreateModel(
            name='Vote',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('value', models.SmallIntegerField(choices=[(1, 'Upvote'), (-1, 'Downvote')])),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='community_votes', to=settings.AUTH_USER_MODEL)),
                ('thread', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='votes', to='community.thread')),
                ('reply', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='votes', to='community.reply')),
            ],
            options={
                'unique_together': {('user', 'thread'), ('user', 'reply')},
            },
        ),
    ]
