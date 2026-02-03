from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.parsers import JSONParser, FormParser, MultiPartParser
from django.http import HttpResponse
from .utils import generate_handwriting_image
from io import BytesIO

class GenerateHandwritingView(APIView):
    """
    API View to generate handwriting image from text.
    """
    permission_classes = [permissions.AllowAny]
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def post(self, request):
        text = request.data.get('text', '')
        font = request.data.get('font', 'caveat')
        paper = request.data.get('paper', 'plain')
        ink = request.data.get('ink', 'blue')
        
        if not text:
            return Response({"error": "Text is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            image = generate_handwriting_image(text, font, paper, ink)
            
            # Save to buffer
            buffer = BytesIO()
            image.save(buffer, format="PNG")
            buffer.seek(0)
            
            return HttpResponse(buffer, content_type="image/png")
            
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
