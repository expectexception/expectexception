"""
Seeds one SEO-optimised "how to use" blog post per flagship service.

Each post is rendered from a structured spec into clean HTML (the blog detail
page renders content as HTML and syntax-highlights <pre><code> blocks), with
seo_title / seo_description / keywords populated so every service has a
dedicated, search-indexable landing article that links back to the live tool.

Idempotent: re-running updates existing posts (matched by slug) rather than
creating duplicates. Add new services by appending to SERVICES below.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.utils.text import slugify
from datetime import datetime, timezone as dt_timezone

from apps.users.models import User
from apps.blog.models import Post, Tag

SITE = 'https://expectexception.com'

# ---------------------------------------------------------------------------
# Per-service content specs. Keep prose concrete and benefit-led — these double
# as the SEO landing copy for each tool.
# ---------------------------------------------------------------------------
from .service_blog_data import SERVICES


def render_html(spec: dict) -> str:
    """Build a clean, SEO-friendly HTML article from a service spec."""
    tool_url = f"{SITE}{spec['tool_path']}"
    parts: list[str] = []

    parts.append(f"<p>{spec['intro']}</p>")

    parts.append(
        f'<p><a href="{tool_url}"><strong>{spec["tool_cta"]} →</strong></a></p>'
    )

    parts.append(f"<h2>What it does</h2><p>{spec['what']}</p>")

    parts.append(f"<h2>How to use it — step by step</h2><ol>")
    for name, text in spec['steps']:
        parts.append(f"<li><strong>{name}.</strong> {text}</li>")
    parts.append("</ol>")

    parts.append("<h2>Key features</h2><ul>")
    for feat in spec['features']:
        parts.append(f"<li>{feat}</li>")
    parts.append("</ul>")

    parts.append("<h2>Common use cases</h2><ul>")
    for uc in spec['use_cases']:
        parts.append(f"<li>{uc}</li>")
    parts.append("</ul>")

    parts.append("<h2>Frequently asked questions</h2>")
    for q, a in spec['faq']:
        parts.append(f"<h3>{q}</h3><p>{a}</p>")

    parts.append(
        f'<h2>Try it now</h2><p>Ready to go? <a href="{tool_url}">'
        f'{spec["tool_cta"]}</a> — it\'s free and needs no signup.</p>'
    )

    return "\n".join(parts)


class Command(BaseCommand):
    help = 'Seeds one SEO-optimised how-to blog post per flagship service.'

    def handle(self, *args, **options):
        # Author: prefer an existing superuser, else the demo user.
        author = User.objects.filter(is_superuser=True).order_by('id').first()
        if author is None:
            author, _ = User.objects.get_or_create(
                email='demo@example.com',
                defaults={'is_active': True},
            )
            self.stdout.write('No superuser found — using demo@example.com as author.')

        created_count = 0
        updated_count = 0

        for spec in SERVICES:
            content = render_html(spec)
            slug = spec['slug']

            tag_objs = []
            for tag_name in spec.get('tags', []):
                tag, _ = Tag.objects.get_or_create(name=tag_name)
                tag_objs.append(tag)

            post = Post.objects.filter(slug=slug).first()
            if post is None:
                post = Post(slug=slug)
                created_count += 1
                verb = 'Created'
            else:
                updated_count += 1
                verb = 'Updated'

            post.title = spec['title']
            post.content = content
            post.author = author
            post.status = Post.STATUS_PUBLISHED
            post.seo_title = spec['seo_title'][:70]
            post.seo_description = spec['seo_description'][:160]
            post.keywords = ', '.join(spec['keywords'])[:255]
            post.featured = spec.get('featured', False)
            post.save()  # triggers reading_time / excerpt / TOC generation

            if tag_objs:
                post.tags.set(tag_objs)

            # Backdate publish/created so posts don't all stack on today.
            Post.objects.filter(pk=post.pk).update(
                created_at=spec['date'],
                published_at=spec['date'],
            )

            self.stdout.write(f"{verb}: {spec['title']}")

        self.stdout.write(self.style.SUCCESS(
            f'Seeded service blogs — {created_count} created, {updated_count} updated.'
        ))
