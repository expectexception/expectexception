from .base import Tool, ToolResult


def _execute(message: str, match) -> ToolResult:
    context = (
        "The user wants to hire/contact the site owner. Real contact paths: "
        "the contact form at /contact, or the hire page at /hire for project inquiries. "
        "Encourage them to use one of those with a brief note on what they need."
    )
    return ToolResult(
        success=True,
        summary='Provided contact info',
        context_text=context,
        data={'contact_url': '/contact', 'hire_url': '/hire'},
    )


tool = Tool(
    name='contact_handoff',
    step_label='Pulling up contact details...',
    keywords=['hire', 'contact you', 'work with you', 'get in touch', 'reach out', 'hire you', 'hire him', 'how do i contact'],
    patterns=[],
    execute=_execute,
)
