import logging
import time
from io import BytesIO

from django.http import HttpResponse
from rest_framework import permissions, status
from rest_framework.exceptions import ParseError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .utils import FONT_MAP, INK_COLORS, PAPER_TYPES, generate_handwriting_image

logger = logging.getLogger(__name__)


class GenerateHandwritingView(APIView):
    """
    API View to generate handwriting image from text.
    Converts text to realistic handwritten images with various fonts and styles.
    """

    permission_classes = [permissions.AllowAny]
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    # Validation limits
    MIN_TEXT_LENGTH = 1
    MAX_TEXT_LENGTH = 5000
    DEFAULT_FONT = "caveat"
    DEFAULT_PAPER = "plain"
    DEFAULT_INK = "blue"

    def post(self, request):
        """
        Generate handwriting image from text.

        Parameters:
        - text: Text to convert to handwriting (required, max 5000 chars)
        - font: Font style (caveat, indie_flower, shadows, dancing) - default: caveat
        - paper: Paper type (plain, lined, dark) - default: plain
        - ink: Ink color (blue, black, red) - default: blue
        - font_size: Base font size (12-72) - default: 32
        """
        started_at = time.time()

        try:
            # Get and validate text
            text = request.data.get("text", "").strip()

            if not text:
                return Response({"error": "Text is required"}, status=status.HTTP_400_BAD_REQUEST)

            if len(text) < self.MIN_TEXT_LENGTH:
                return Response(
                    {"error": f"Text must be at least {self.MIN_TEXT_LENGTH} character"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if len(text) > self.MAX_TEXT_LENGTH:
                return Response(
                    {"error": f"Text exceeds maximum length ({self.MAX_TEXT_LENGTH} characters)"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Get and validate font
            font = request.data.get("font", self.DEFAULT_FONT).lower()
            if font not in FONT_MAP:
                logger.warning(f"Invalid font: {font}, using default")
                font = self.DEFAULT_FONT

            # Get and validate paper type
            paper = request.data.get("paper", self.DEFAULT_PAPER).lower()
            if paper not in PAPER_TYPES:
                logger.warning(f"Invalid paper: {paper}, using default")
                paper = self.DEFAULT_PAPER

            # Get and validate ink color
            ink = request.data.get("ink", self.DEFAULT_INK).lower()
            if ink not in INK_COLORS:
                logger.warning(f"Invalid ink: {ink}, using default")
                ink = self.DEFAULT_INK

            # Get optional font size
            try:
                font_size = int(request.data.get("font_size", 32))
                # Clamp font size to reasonable range
                if font_size < 12:
                    font_size = 12
                elif font_size > 72:
                    font_size = 72
            except (ValueError, TypeError):
                font_size = 32

            logger.info(
                f"Generating handwriting: {len(text)} chars, font={font}, paper={paper}, ink={ink}"
            )

            # Generate image
            image = generate_handwriting_image(
                text, font_name=font, paper_type=paper, ink_color=ink, font_size=font_size
            )

            # Save to buffer
            buffer = BytesIO()
            image.save(buffer, format="PNG", optimize=False)  # No optimization for speed
            buffer.seek(0)

            processing_time = time.time() - started_at
            logger.info(f"Handwriting generation complete in {processing_time:.2f}s")

            # Log activity
            from apps.services.views import log_activity

            log_activity(
                request.user,
                "text_to_handwriting",
                f"{len(text)} chars → {font}/{paper}/{ink}",
                request,
            )

            return HttpResponse(buffer, content_type="image/png")

        except FileNotFoundError as e:
            logger.error(f"Font file not found: {e}")
            return Response(
                {"error": "Handwriting generation unavailable - font files missing"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except ParseError as e:
            # request.data is accessed (and so lazily parsed) inside the try
            # block above, so malformed JSON raises here — the broad except
            # Exception below used to catch it too and report it as a 500,
            # which is wrong on two counts: it's the caller's bad input, not
            # a server failure, and a 500 here trips error monitoring for
            # something that isn't a bug.
            return Response(
                {"error": f"Malformed request body: {e}"}, status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.exception(f"Handwriting generation error: {e}")
            return Response(
                {"error": f"Failed to generate handwriting: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
