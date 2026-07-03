from collections import OrderedDict

from .base import Tool, ToolResult


def _execute(message: str, match) -> ToolResult:
    from apps.services.models import Service

    services = list(
        Service.objects.filter(is_active=True).order_by('-popularity')[:10]
    )

    if not services:
        return ToolResult(
            success=True,
            summary='No services found',
            context_text='No services are currently listed. Apologize briefly and suggest checking back later.',
            data={'services': []},
        )

    grouped = OrderedDict()
    for s in services:
        grouped.setdefault(s.category or 'General', []).append(s.title)

    lines = [f"- {cat}: {', '.join(titles)}" for cat, titles in grouped.items()]
    context = "Real tools/services live on this site right now:\n" + "\n".join(lines)

    return ToolResult(
        success=True,
        summary=f"Listed {len(services)} services",
        context_text=context,
        data={'services': [{'title': s.title, 'path': s.path, 'category': s.category} for s in services]},
    )


tool = Tool(
    name='skills_services',
    step_label='Looking up available tools...',
    keywords=['skills', 'services', 'tools', 'what can you do', 'what tools', 'what services'],
    patterns=[],
    execute=_execute,
)
