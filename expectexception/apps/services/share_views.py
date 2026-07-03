"""
Shareable Tool Results — stores a snapshot of tool output in Redis with a short ID.
Client POSTs { tool_path, result_data } → gets back a short_id.
Anyone can GET /api/services/share/<short_id>/ to retrieve the snapshot.
"""
import json
import secrets
from django.core.cache import cache
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.throttling import UserRateThrottle, AnonRateThrottle

SHARE_TTL = 60 * 60 * 24  # 24 hours
MAX_PAYLOAD_BYTES = 64 * 1024  # 64 KB


class ToolShareCreateView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [UserRateThrottle]

    def post(self, request):
        tool_path = request.data.get('tool_path', '')
        result_data = request.data.get('result_data')
        if not tool_path or result_data is None:
            return Response({'error': 'tool_path and result_data are required.'}, status=400)

        payload = json.dumps({'tool_path': tool_path, 'result_data': result_data})
        if len(payload.encode()) > MAX_PAYLOAD_BYTES:
            return Response({'error': 'Result data too large (max 64 KB).'}, status=400)

        short_id = secrets.token_urlsafe(8)
        cache.set(f'share:{short_id}', payload, timeout=SHARE_TTL)
        return Response({'short_id': short_id, 'expires_in': SHARE_TTL}, status=201)


class ToolShareRetrieveView(APIView):
    permission_classes = []
    throttle_classes = [AnonRateThrottle, UserRateThrottle]

    def get(self, request, short_id):
        raw = cache.get(f'share:{short_id}')
        if raw is None:
            return Response({'error': 'Share link expired or not found.'}, status=404)
        return Response(json.loads(raw))
