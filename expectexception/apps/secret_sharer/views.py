from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from django.utils import timezone
from .models import Secret
from .utils import encrypt_content, decrypt_content
import datetime

class CreateSecretView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        content = request.data.get('content')
        expiration_hours = int(request.data.get('expiration', 24))  # Default 24 hours

        if not content:
            return Response({'error': 'Content is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            encrypted = encrypt_content(content)
            expires_at = timezone.now() + datetime.timedelta(hours=expiration_hours)
            
            secret = Secret.objects.create(
                encrypted_content=encrypted,
                expires_at=expires_at
            )
            
            # Construct share URL (or just return ID)
            return Response({
                'id': str(secret.id),
                'expires_at': expires_at,
                'message': 'Secret created successfully'
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ViewSecretView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        try:
            secret = Secret.objects.get(pk=pk)
        except Secret.DoesNotExist:
            return Response({'error': 'Secret not found or already viewed'}, status=status.HTTP_404_NOT_FOUND)

        if secret.is_expired():
            secret.delete()
            return Response({'error': 'Secret has expired'}, status=status.HTTP_410_GONE)

        try:
            # Decrypt content
            decrypted = decrypt_content(secret.encrypted_content)
            
            # Burn after reading (DELETE method is safer than is_viewed flag for security)
            secret.delete()
            
            return Response({
                'content': decrypted,
                'burned': True,
                'message': 'This secret has been destroyed and cannot be viewed again.'
            })
        except Exception as e:
            return Response({'error': 'Decryption failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
