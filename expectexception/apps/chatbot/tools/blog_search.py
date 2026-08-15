import re

from django.db.models import Q

from .base import Tool, ToolResult

_TOPIC_PATTERN = re.compile(r'(?:blog|post|article)s?', re.IGNORECASE)
_FILLER_PATTERN = re.compile(r'^(about|on|for|titled|regarding)\s+', re.IGNORECASE)


def _extract_topic(message: str) -> str:
    """Everything after the last 'blog'/'post'/'article' mention, with leading filler words stripped."""
    parts = _TOPIC_PATTERN.split(message)
    if len(parts) <= 1:
        return ''
    topic = parts[-1].strip(' ?.!')
    topic = _FILLER_PATTERN.sub('', topic).strip(' ?.!')
    return topic


def _execute(message: str, match) -> ToolResult:
    from apps.blog.models import Post

    topic = _extract_topic(message)
    qs = Post.objects.filter(status=Post.STATUS_PUBLISHED)
    if topic:
        qs = qs.filter(
            Q(title__icontains=topic)
            | Q(content__icontains=topic)
            | Q(seo_description__icontains=topic)
        )
    posts = list(qs.order_by('-published_at', '-created_at')[:5])

    if not posts:
        return ToolResult(
            success=True,
            summary='No matching posts found',
            context_text=f"No blog posts matched '{topic or message}'. Tell the user nothing was found and suggest browsing /blogs.",
            data={'posts': []},
        )

    lines = [f"- \"{p.title}\" (/blogs/{p.id}): {p.seo_description or p.excerpt or ''}".strip() for p in posts]
    context = "Real blog posts found on the site:\n" + "\n".join(lines)

    return ToolResult(
        success=True,
        summary=f"Found {len(posts)} matching post(s)",
        context_text=context,
        data={'posts': [{'id': p.id, 'title': p.title, 'url': f'/blogs/{p.id}'} for p in posts]},
    )


tool = Tool(
    name='blog_search',
    step_label='Searching blog posts...',
    keywords=['blog', 'article', 'post', 'wrote about', 'read about'],
    patterns=[_TOPIC_PATTERN],
    execute=_execute,
)
