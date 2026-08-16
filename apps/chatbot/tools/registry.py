"""Ordered tool registry. First match wins, so specific tools (qr, health,
contact) come before the more generic blog_search/skills_services."""

from . import blog_search, contact_handoff, health_check, qr_generator, skills_services
from .base import Tool

TOOLS = [
    qr_generator.tool,
    health_check.tool,
    contact_handoff.tool,
    skills_services.tool,
    blog_search.tool,
]


def detect_tool(message: str) -> tuple[Tool, object] | None:
    for tool in TOOLS:
        m = tool.matches(message)
        if m is not None:
            return tool, m
    return None
