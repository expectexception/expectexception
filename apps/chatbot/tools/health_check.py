from .base import Tool, ToolResult


def _execute(message: str, match) -> ToolResult:
    from apps.services.system_metrics import get_health_snapshot

    snap = get_health_snapshot()
    parts = [
        f"overall status: {snap['status']}",
        f"database: {snap['database']}",
        f"CPU load: {snap['cpu_percent']}%",
        f"memory used: {snap['memory_percent']}%",
        f"GPU: {snap['gpu'] or 'not in use'}",
    ]
    context = "Real live system health check just ran:\n" + "\n".join(f"- {p}" for p in parts)

    return ToolResult(
        success=True,
        summary=f"System status: {snap['status']}",
        context_text=context,
        data=snap,
    )


tool = Tool(
    name='health_check',
    step_label='Checking system health...',
    keywords=['is the site down', 'system status', 'is everything working', 'health check', 'server status', 'is the server up', 'site down'],
    patterns=[],
    execute=_execute,
)
