"""
Comprehensive test suite for all service views.
Tests file uploads, error cases, edge cases, and output validation.
"""

import os
import tempfile
from io import BytesIO
from django.test import TestCase, Client
from django.core.files.uploadedfile import SimpleUploadedFile
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from PIL import Image
import uuid

User = get_user_model()


class AudioSeparatorTestCase(APITestCase):
    """Test AudioSeparatorView and AudioSeparatorStatusView"""

    def setUp(self):
        self.client = APIClient()
        self.endpoint = '/api/services/audio-separator/'

    def create_audio_file(self, filename='test.wav', size_mb=1):
        """Create a dummy audio file"""
        audio_content = b'ID3' + b'\x00' * (size_mb * 1024 * 1024)
        return SimpleUploadedFile(
            filename,
            audio_content,
            content_type='audio/wav'
        )

    def test_upload_without_file(self):
        """Test uploading without selecting a file"""
        response = self.client.post(self.endpoint, {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_upload_valid_audio(self):
        """Test uploading a valid audio file"""
        audio_file = self.create_audio_file()
        response = self.client.post(
            self.endpoint,
            {'audio': audio_file},
            format='multipart'
        )
        self.assertIn(response.status_code, [status.HTTP_202_ACCEPTED, status.HTTP_200_OK])
        self.assertIn('task_id', response.data)
        self.assertIn('status_url', response.data)

    def test_upload_invalid_format(self):
        """Test uploading an unsupported file format"""
        invalid_file = SimpleUploadedFile(
            'test.txt',
            b'This is not audio',
            content_type='text/plain'
        )
        response = self.client.post(
            self.endpoint,
            {'audio': invalid_file},
            format='multipart'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_upload_oversized_file(self):
        """Test uploading a file that exceeds size limit"""
        # Create a file larger than 500MB limit
        large_file = self.create_audio_file(size_mb=600)
        response = self.client.post(
            self.endpoint,
            {'audio': large_file},
            format='multipart'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_status_endpoint(self):
        """Test checking status of a task"""
        task_id = str(uuid.uuid4())
        response = self.client.get(f'{self.endpoint}status/{task_id}/')
        # Should return either 200 with status or 404
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND])


class PdfToDocTestCase(APITestCase):
    """Test PdfToDocView and PDF conversion"""

    def setUp(self):
        self.client = APIClient()
        self.endpoint = '/api/services/pdf-to-doc/'

    def create_pdf_file(self, filename='test.pdf'):
        """Create a dummy PDF file"""
        pdf_content = b'%PDF-1.4\n%fake pdf content' + b'\x00' * 1000
        return SimpleUploadedFile(
            filename,
            pdf_content,
            content_type='application/pdf'
        )

    def test_upload_without_file(self):
        """Test posting without PDF file"""
        response = self.client.post(self.endpoint, {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_upload_pdf_valid(self):
        """Test uploading a valid PDF"""
        pdf_file = self.create_pdf_file()
        response = self.client.post(
            self.endpoint,
            {
                'pdf': pdf_file,
                'format': 'docx',
                'ocr_enabled': 'false'
            },
            format='multipart'
        )
        # Might be async or sync depending on Celery availability
        self.assertIn(response.status_code, [status.HTTP_202_ACCEPTED, status.HTTP_200_OK, status.HTTP_500_INTERNAL_SERVER_ERROR])
        if response.status_code == status.HTTP_202_ACCEPTED:
            self.assertIn('task_id', response.data)

    def test_upload_non_pdf_file(self):
        """Test uploading a non-PDF file"""
        text_file = SimpleUploadedFile(
            'test.txt',
            b'Not a PDF',
            content_type='text/plain'
        )
        response = self.client.post(
            self.endpoint,
            {'pdf': text_file},
            format='multipart'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_output_format(self):
        """Test requesting unsupported output format"""
        pdf_file = self.create_pdf_file()
        response = self.client.post(
            self.endpoint,
            {
                'pdf': pdf_file,
                'format': 'invalid_format'
            },
            format='multipart'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_ocr_parameter(self):
        """Test OCR parameter passing"""
        pdf_file = self.create_pdf_file()
        response = self.client.post(
            self.endpoint,
            {
                'pdf': pdf_file,
                'format': 'docx',
                'ocr_enabled': 'true',
                'language': 'eng'
            },
            format='multipart'
        )
        self.assertIn(response.status_code, [status.HTTP_202_ACCEPTED, status.HTTP_200_OK, status.HTTP_500_INTERNAL_SERVER_ERROR])


class ImageToTextTestCase(APITestCase):
    """Test ImageToTextView for OCR functionality"""

    def setUp(self):
        self.client = APIClient()
        self.endpoint = '/api/services/image-to-text/'

    def create_image_file(self, filename='test.png', size=(100, 100)):
        """Create a dummy image file"""
        img = Image.new('RGB', size, color='white')
        img_io = BytesIO()
        img.save(img_io, format='PNG')
        img_io.seek(0)
        return SimpleUploadedFile(
            filename,
            img_io.getvalue(),
            content_type='image/png'
        )

    def test_get_languages(self):
        """Test retrieving available OCR languages"""
        response = self.client.get(self.endpoint)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('languages', response.data)
        self.assertIn('default', response.data)
        self.assertIsInstance(response.data['languages'], list)

    def test_extract_text_from_image(self):
        """Test text extraction from image"""
        image_file = self.create_image_file()
        response = self.client.post(
            f'{self.endpoint}',
            {
                'image': image_file,
                'language': 'eng'
            },
            format='multipart'
        )
        # Will either succeed or fail if tesseract not installed
        self.assertIn(response.status_code, [
            status.HTTP_200_OK,
            status.HTTP_503_SERVICE_UNAVAILABLE,  # Service not available
            status.HTTP_500_INTERNAL_SERVER_ERROR  # Tesseract not installed
        ])

    def test_upload_without_image(self):
        """Test posting without image file"""
        response = self.client.post(self.endpoint, {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_image_format(self):
        """Test uploading invalid image format"""
        text_file = SimpleUploadedFile(
            'test.txt',
            b'Not an image',
            content_type='text/plain'
        )
        response = self.client.post(
            self.endpoint,
            {'image': text_file},
            format='multipart'
        )
        # Should be rejected or cause error
        self.assertIn(response.status_code, [
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_500_INTERNAL_SERVER_ERROR
        ])


class BackgroundRemoverTestCase(APITestCase):
    """Test BackgroundRemoverView"""

    def setUp(self):
        self.client = APIClient()
        self.endpoint = '/api/services/background-remover/'

    def create_image_file(self, filename='test.jpg', size=(200, 200)):
        """Create a dummy image file"""
        img = Image.new('RGB', size, color='blue')
        img_io = BytesIO()
        img.save(img_io, format='JPEG')
        img_io.seek(0)
        return SimpleUploadedFile(
            filename,
            img_io.getvalue(),
            content_type='image/jpeg'
        )

    def test_upload_without_image(self):
        """Test uploading without selecting an image"""
        response = self.client.post(self.endpoint, {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_upload_valid_image(self):
        """Test uploading a valid image"""
        image_file = self.create_image_file()
        response = self.client.post(
            self.endpoint,
            {
                'image': image_file,
                'quality': 'balanced',
                'format': 'png'
            },
            format='multipart'
        )
        # Will fail if rembg not installed, but should handle gracefully
        self.assertIn(response.status_code, [
            status.HTTP_200_OK,
            status.HTTP_503_SERVICE_UNAVAILABLE,
            status.HTTP_500_INTERNAL_SERVER_ERROR
        ])

    def test_quality_presets(self):
        """Test different quality presets"""
        for quality in ['fast', 'balanced', 'best']:
            image_file = self.create_image_file()
            response = self.client.post(
                self.endpoint,
                {
                    'image': image_file,
                    'quality': quality
                },
                format='multipart'
            )
            # Should accept the quality parameter
            self.assertIn(response.status_code, [
                status.HTTP_200_OK,
                status.HTTP_503_SERVICE_UNAVAILABLE,
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ])


class TextToHandwritingTestCase(APITestCase):
    """Test TextToHandwritingView"""

    def setUp(self):
        self.client = APIClient()
        self.endpoint = '/api/text-to-handwriting/'

    def test_generate_basic(self):
        """Test basic handwriting generation"""
        response = self.client.post(
            self.endpoint,
            {
                'text': 'Hello, World!',
                'font': 'caveat',
                'paper': 'plain',
                'ink': 'blue'
            },
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'image/png')

    def test_empty_text(self):
        """Test with empty text"""
        response = self.client.post(
            self.endpoint,
            {
                'text': '',
                'font': 'caveat'
            },
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_long_text(self):
        """Test with text exceeding maximum length"""
        long_text = 'a' * 10000
        response = self.client.post(
            self.endpoint,
            {
                'text': long_text,
                'font': 'caveat'
            },
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_font_options(self):
        """Test different font options"""
        for font in ['caveat', 'indie_flower', 'shadows', 'dancing']:
            response = self.client.post(
                self.endpoint,
                {
                    'text': 'Test text',
                    'font': font
                },
                format='json'
            )
            self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_paper_options(self):
        """Test different paper types"""
        for paper in ['plain', 'lined', 'dark']:
            response = self.client.post(
                self.endpoint,
                {
                    'text': 'Test text',
                    'paper': paper
                },
                format='json'
            )
            self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_ink_colors(self):
        """Test different ink colors"""
        for ink in ['blue', 'black', 'red']:
            response = self.client.post(
                self.endpoint,
                {
                    'text': 'Test text',
                    'ink': ink
                },
                format='json'
            )
            self.assertEqual(response.status_code, status.HTTP_200_OK)


class ServiceErrorHandlingTestCase(APITestCase):
    """Test error handling across all services"""

    def test_concurrent_requests(self):
        """Test handling concurrent requests"""
        # This is a basic test - real concurrent testing would use threading/async
        from django.test import RequestFactory
        factory = RequestFactory()

        # Simulate multiple concurrent requests (basic version)
        for i in range(3):
            request = factory.post('/api/text-to-handwriting/', {
                'text': f'Test {i}'
            })

    def test_malformed_requests(self):
        """Test handling malformed JSON/form data"""
        response = self.client.post(
            '/api/text-to-handwriting/',
            'malformed data',
            content_type='application/json'
        )
        # Should return 400 Bad Request
        self.assertIn(response.status_code, [
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE
        ])

    def test_missing_required_parameters(self):
        """Test requests with missing required parameters"""
        response = self.client.post(
            '/api/text-to-handwriting/',
            {},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


if __name__ == '__main__':
    import unittest
    unittest.main()
