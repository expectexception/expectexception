from rest_framework import status, views
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.conf import settings
from .models import PushSubscription
from .serializers import PushSubscriptionSerializer
import logging

logger = logging.getLogger(__name__)


class SubscribeView(views.APIView):
    """API endpoint to subscribe to push notifications"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        """
        Subscribe to push notifications
        Expects: {endpoint, keys: {p256dh, auth}}
        """
        try:
            # Extract subscription data
            subscription_data = {
                'endpoint': request.data.get('endpoint'),
                'p256dh_key': request.data.get('keys', {}).get('p256dh'),
                'auth_key': request.data.get('keys', {}).get('auth'),
            }
            
            # Validate required fields
            if not all([subscription_data['endpoint'], 
                       subscription_data['p256dh_key'], 
                       subscription_data['auth_key']]):
                return Response(
                    {'error': 'Missing required subscription data'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create or update subscription
            serializer = PushSubscriptionSerializer(
                data=subscription_data,
                context={'request': request}
            )
            
            if serializer.is_valid():
                subscription = serializer.save()
                logger.info(f"Push subscription created/updated: {subscription.id}")
                
                return Response({
                    'success': True,
                    'message': 'Successfully subscribed to notifications',
                    'subscription_id': subscription.id
                }, status=status.HTTP_201_CREATED)
            
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            logger.error(f"Error subscribing to push: {str(e)}")
            return Response(
                {'error': 'Failed to subscribe'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class UnsubscribeView(views.APIView):
    """API endpoint to unsubscribe from push notifications"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        """
        Unsubscribe from push notifications
        Expects: {endpoint}
        """
        try:
            endpoint = request.data.get('endpoint')
            
            if not endpoint:
                return Response(
                    {'error': 'Endpoint required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Find and deactivate subscription
            subscription = PushSubscription.objects.filter(endpoint=endpoint).first()
            
            if subscription:
                subscription.disable()
                logger.info(f"Push subscription disabled: {subscription.id}")
                
                return Response({
                    'success': True,
                    'message': 'Successfully unsubscribed'
                })
            
            return Response(
                {'error': 'Subscription not found'},
                status=status.HTTP_404_NOT_FOUND
            )
            
        except Exception as e:
            logger.error(f"Error unsubscribing: {str(e)}")
            return Response(
                {'error': 'Failed to unsubscribe'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class VapidPublicKeyView(views.APIView):
    """Return public VAPID key for subscription"""
    permission_classes = [AllowAny]
    
    def get(self, request):
        """Get the public VAPID key"""
        vapid_key = getattr(settings, 'VAPID_PUBLIC_KEY', None)
        
        if not vapid_key:
            return Response(
                {'error': 'VAPID key not configured'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        return Response({'publicKey': vapid_key})


# ── In-App Notifications ──────────────────────────────────────────────────────
from rest_framework.permissions import IsAuthenticated
from .models import InAppNotification


class InAppNotificationListView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        notifs = InAppNotification.objects.filter(recipient=request.user).order_by('-created_at')[:50]
        unread_count = notifs.filter(is_read=False).count()
        data = [
            {
                'id': n.id,
                'type': n.notification_type,
                'title': n.title,
                'body': n.body,
                'url': n.url,
                'is_read': n.is_read,
                'created_at': n.created_at,
                'sender': getattr(n.sender, 'first_name', None) or getattr(n.sender, 'email', None) if n.sender else None,
            }
            for n in notifs
        ]
        return Response({'notifications': data, 'unread_count': unread_count})

    def patch(self, request):
        """Mark all as read."""
        InAppNotification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
        return Response({'marked_read': True})


class InAppNotificationDetailView(views.APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        try:
            n = InAppNotification.objects.get(pk=pk, recipient=request.user)
        except InAppNotification.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)
        n.is_read = True
        n.save(update_fields=['is_read'])
        return Response({'is_read': True})
