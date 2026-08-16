"""Tool interface for chatbot backend tools.

Detection is deterministic (keywords + regex), never delegated to the LLM,
since the local model (smollm2:1.7b) is too weak to reliably emit tool-call JSON.
"""

import re
from collections.abc import Callable
from dataclasses import dataclass
from re import Pattern


@dataclass
class ToolResult:
    success: bool
    summary: str
    context_text: str
    data: dict | None = None
    error: str | None = None


@dataclass
class Tool:
    name: str
    step_label: str
    keywords: list[str]
    patterns: list[Pattern]
    execute: Callable[[str, re.Match | None], ToolResult]

    def matches(self, text: str) -> re.Match | None:
        lowered = text.lower()
        if self.keywords and not any(k in lowered for k in self.keywords):
            return None
        if not self.patterns:
            # Keyword-only tool (e.g. contact handoff) - keyword hit is enough.
            return re.match(r"", text)
        for pattern in self.patterns:
            m = pattern.search(text)
            if m:
                return m
        return None
