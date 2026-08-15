import io
import os
import uuid

import qrcode
from django.conf import settings
from django.utils.translation import gettext_lazy as _

def environment_callback(request):
    """
    Callback for Unfold admin to display environment badge.
    """
    if settings.DEBUG:
        return ["Development", "info"]

    return ["Production", "danger"]


def generate_qr_image(data: str, fg_color: str = '#000000', bg_color: str = '#ffffff') -> str:
    """Generate a QR code PNG for `data` and return its media URL. Shared by QrGeneratorView and the chatbot's qr_generator tool."""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(data)
    qr.make(fit=True)

    img = qr.make_image(fill_color=fg_color, back_color=bg_color)

    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)

    filename = f"qr_{uuid.uuid4()}.png"
    file_path = os.path.join(settings.MEDIA_ROOT, 'qr')
    os.makedirs(file_path, exist_ok=True)

    with open(os.path.join(file_path, filename), 'wb') as f:
        f.write(buffer.getvalue())

    return f"{settings.MEDIA_URL}qr/{filename}"
