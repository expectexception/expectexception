"""Ordered tool registry. First match wins, so specific tools (qr, health,
contact) come before the more generic blog_search/skills_services."""
from typing import Optional, Tuple

from .base import Tool
from . import qr_generator, health_check, contact_handoff, blog_search, skills_services

TOOLS = [
    qr_generator.tool,
    health_check.tool,
    contact_handoff.tool,
    skills_services.tool,
    blog_search.tool,
]


def detect_tool(message: str) -> Optional[Tuple[Tool, object]]:
    for tool in TOOLS:
        m = tool.matches(message)
        if m is not None:
            return tool, m
    return None
