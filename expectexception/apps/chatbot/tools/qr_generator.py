import re

from .base import Tool, ToolResult

_DATA_PATTERN = re.compile(
    r'qr\s*code\s*(?:for|with|of|containing)?\s*(.+)',
    re.IGNORECASE,
)


def _execute(message: str, match) -> ToolResult:
    from apps.services.utils import generate_qr_image

    data = (match.group(1).strip() if match and match.lastindex else '').strip(' ?.!')
    if not data:
        return ToolResult(
            success=False,
            summary='No content provided for QR code',
            context_text="The user asked for a QR code but didn't say what it should encode. Ask them what text or URL to encode.",
            error='missing_data',
        )

    try:
        qr_url = generate_qr_image(data)
    except Exception as e:
        return ToolResult(
            success=False,
            summary='QR generation failed',
            context_text='QR code generation failed due to a server error. Apologize and suggest trying the QR generator tool directly at /services/qr-generator.',
            error=str(e),
        )

    return ToolResult(
        success=True,
        summary='Generated QR code',
        context_text=f"A real QR code encoding \"{data}\" was generated at {qr_url}. Tell the user it's ready and they can view/download it.",
        data={'qr_url': qr_url, 'encoded': data},
    )


tool = Tool(
    name='qr_generator',
    step_label='Generating QR code...',
    keywords=['qr code', 'qr-code', 'qrcode'],
    patterns=[_DATA_PATTERN],
    execute=_execute,
)
