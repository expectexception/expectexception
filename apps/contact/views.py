"""Views for contact form API endpoints."""
import logging
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import ContactInquiry
from .serializers import ContactInquirySerializer

logger = logging.getLogger(__name__)


def mirror_contact_inquiry_to_mongo(inquiry):
    """Mirror contact inquiry to MongoDB Atlas."""
    try:
        from apps.services.mongodb import get_mongodb_db
        db = get_mongodb_db()
        if db is not None:
            db.contact_inquiries.insert_one({
                'inquiry_id': inquiry.id,
                'name': inquiry.name,
                'email': inquiry.email,
                'subject': inquiry.subject,
                'message': inquiry.message,
                'inquiry_type': inquiry.inquiry_type,
                'project_type': inquiry.project_type,
                'budget': inquiry.budget,
                'ip_address': inquiry.ip_address,
                'user_agent': inquiry.user_agent,
                'source_page': inquiry.source_page,
                'created_at': inquiry.created_at.isoformat() if inquiry.created_at else None,
            })
            logger.info(f"Successfully mirrored contact inquiry #{inquiry.id} to MongoDB Atlas.")
    except Exception as e:
        logger.error(f"Failed to mirror contact inquiry to MongoDB Atlas: {e}")


def get_client_ip(request):
    """Extract client IP from request headers."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def send_notification_email(inquiry):
    """Send email notification for new inquiry."""
    try:
        subject = f"[{inquiry.get_inquiry_type_display()}] New inquiry from {inquiry.name}"
        
        # Plain text email
        message = f"""
New {inquiry.get_inquiry_type_display()} Inquiry

From: {inquiry.name}
Email: {inquiry.email}
Type: {inquiry.get_inquiry_type_display()}
"""
        if inquiry.subject:
            message += f"Subject: {inquiry.subject}\n"
        if inquiry.project_type:
            message += f"Project Type: {inquiry.project_type}\n"
        if inquiry.budget:
            message += f"Budget: {inquiry.budget}\n"
        
        message += f"""
Message:
{inquiry.message}

---
View in admin: {settings.CSRF_TRUSTED_ORIGINS[0] if settings.CSRF_TRUSTED_ORIGINS else 'https://expectexception.com'}/admin/contact/contactinquiry/{inquiry.id}/
"""
        
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[settings.CONTACT_EMAIL],
            fail_silently=False,
        )
        logger.info(f"Email notification sent for inquiry #{inquiry.id}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email for inquiry #{inquiry.id}: {e}")
        return False


@api_view(['POST'])
@permission_classes([AllowAny])
def submit_contact(request):
    """
    Submit a general contact form.
    
    POST /api/contact/
    """
    serializer = ContactInquirySerializer(data=request.data)
    
    if serializer.is_valid():
        inquiry = serializer.save(
            inquiry_type=request.data.get('inquiry_type', 'general'),
            ip_address=get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
            source_page='contact',
        )
        
        # Send email notification
        send_notification_email(inquiry)
        
        # Mirror to MongoDB Atlas
        mirror_contact_inquiry_to_mongo(inquiry)
        
        return Response({
            'success': True,
            'message': 'Thank you! Your message has been received. We\'ll get back to you soon.',
            'inquiry_id': inquiry.id,
        }, status=status.HTTP_201_CREATED)
    
    return Response({
        'success': False,
        'message': 'Please fix the errors below.',
        'errors': serializer.errors,
    }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def submit_hire_inquiry(request):
    """
    Submit a hire developer inquiry.
    
    POST /api/contact/hire/
    """
    data = request.data.copy()
    data['inquiry_type'] = 'hire'
    
    # Map frontend fields to model fields
    if 'projectType' in data:
        data['project_type'] = data.pop('projectType')
    
    serializer = ContactInquirySerializer(data=data)
    
    if serializer.is_valid():
        inquiry = serializer.save(
            inquiry_type='hire',
            ip_address=get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
            source_page='hire',
        )
        
        # Send email notification
        send_notification_email(inquiry)
        
        # Mirror to MongoDB Atlas
        mirror_contact_inquiry_to_mongo(inquiry)
        
        return Response({
            'success': True,
            'message': 'Thank you for your interest! We\'ll review your project and get back to you within 24 hours.',
            'inquiry_id': inquiry.id,
        }, status=status.HTTP_201_CREATED)
    
    return Response({
        'success': False,
        'message': 'Please fix the errors below.',
        'errors': serializer.errors,
    }, status=status.HTTP_400_BAD_REQUEST)
