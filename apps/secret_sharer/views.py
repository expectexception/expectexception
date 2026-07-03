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
            # Check if it exists in FileSecret (User might have wrong URL)
            if FileSecret.objects.filter(pk=pk).exists():
                 return Response({
                     'error': 'This is a File Secret. Please use the correct link ending in ?type=file'
                 }, status=status.HTTP_400_BAD_REQUEST)
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

    def head(self, request, pk):
        """Check if secret exists without burning it"""
        try:
            secret = Secret.objects.get(pk=pk)
            if secret.is_expired():
                secret.delete()
                return Response(status=status.HTTP_410_GONE)
            return Response(status=status.HTTP_200_OK)
        except Secret.DoesNotExist:
             return Response(status=status.HTTP_404_NOT_FOUND)

from rest_framework.parsers import MultiPartParser, FormParser
from django.core.files.base import ContentFile
from django.http import HttpResponse
from .models import FileSecret
from .utils import encrypt_bytes, decrypt_bytes
import mimetypes

class CreateFileSecretView(APIView):
    permission_classes = [AllowAny]
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request):
        file_obj = request.FILES.get('file')
        expiration_hours = int(request.data.get('expiration', 24))

        if not file_obj:
            return Response({'error': 'File is required'}, status=status.HTTP_400_BAD_REQUEST)

        # 50MB Limit
        if file_obj.size > 50 * 1024 * 1024:
             return Response({'error': 'File too large. Limit is 50MB.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Read and encrypt
            file_data = file_obj.read()
            encrypted_data = encrypt_bytes(file_data)
            
            # Create content file for saving
            encrypted_file = ContentFile(encrypted_data, name=file_obj.name + '.enc')
            
            expires_at = timezone.now() + datetime.timedelta(hours=expiration_hours)
            
            secret = FileSecret.objects.create(
                file=encrypted_file,
                original_name=file_obj.name,
                file_size=file_obj.size,
                expires_at=expires_at
            )
            
            return Response({
                'id': str(secret.id),
                'type': 'file',
                'expires_at': expires_at,
                'message': 'File secret created successfully'
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class DownloadFileSecretView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        try:
            secret = FileSecret.objects.get(pk=pk)
        except FileSecret.DoesNotExist:
            return Response({'error': 'File not found or already downloaded'}, status=status.HTTP_404_NOT_FOUND)

        if secret.is_expired():
            secret.delete()
            return Response({'error': 'File has expired'}, status=status.HTTP_410_GONE)

        try:
            # Read encrypted file
            with secret.file.open('rb') as f:
                encrypted_data = f.read()
            
            decrypted_data = decrypt_bytes(encrypted_data)
            
            # Prepare response
            content_type, _ = mimetypes.guess_type(secret.original_name)
            if not content_type:
                content_type = 'application/octet-stream'
                
            response = HttpResponse(decrypted_data, content_type=content_type)
            response['Content-Disposition'] = f'attachment; filename="{secret.original_name}"'
            
            # Burn it
            secret.delete()
            
            return response
        except Exception as e:
            return Response({'error': 'Decryption failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def head(self, request, pk):
        """Check if file exists without burning it"""
        try:
            secret = FileSecret.objects.get(pk=pk)
            if secret.is_expired():
                secret.delete()
                return Response(status=status.HTTP_410_GONE)
            return Response(status=status.HTTP_200_OK)
        except FileSecret.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
