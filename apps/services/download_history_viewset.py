# Add this at the end of views.py (before the last line)

class DownloadHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing download history"""
    serializer_class = DownloadHistorySerializer
    permission_classes = [permissions.AllowAny]  # Can use IsAuthenticatedOrReadOnly for production
    filterset_fields = ['download_type', 'status']
    search_fields = ['title', 'url']
    ordering_fields = ['created_at', 'file_size', 'duration_seconds']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Return download history, filtered by user if authenticated"""
        queryset = DownloadHistory.objects.all()
        
        # If user is authenticated, they can see their own downloads
        # Anonymous users can't see history
        user = self.request.user
        if user.is_authenticated:
            if not user.is_staff:
                # Regular users only see their own downloads
                queryset = queryset.filter(user=user)
            # Staff users can see  all downloads
        else:
            # Anonymous users see nothing
            queryset = queryset.none()
        
        # Filter by date range if provided
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if start_date:
            queryset = queryset.filter(created_at__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__lte=end_date)
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get download statistics for the user"""
        from django.db.models import Count, Sum, Avg
        
        user = request.user
        if not user.is_authenticated:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        
        # Get user's downloads
        downloads = DownloadHistory.objects.filter(user=user) if not user.is_staff else DownloadHistory.objects.all()
        
        stats = {
            'total_downloads': downloads.count(),
            'successful_downloads': downloads.filter(status='success').count(),
            'failed_downloads': downloads.filter(status='failed').count(),
            'total_data_downloaded': downloads.filter(status='success').aggregate(Sum('file_size'))['file_size__sum'] or 0,
            'downloads_by_type': dict(downloads.values('download_type').annotate(count=Count('id')).values_list('download_type', 'count')),
            'avg_download_time': downloads.filter(status='success').aggregate(Avg('duration_seconds'))['duration_seconds__avg'] or 0,
        }
        
        # Format total data
        total_bytes = stats['total_data_downloaded']
        for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
            if total_bytes < 1024.0:
                stats['total_data_downloaded_formatted'] = f"{total_bytes:.2f} {unit}"
                break
            total_bytes /= 1024.0
        
        return Response(stats)
    
    @action(detail=False, methods=['get'])
    def export(self, request):
        """Export download history as CSV"""
        import csv
        from django.http import HttpResponse
        
        user = request.user
        if not user.is_authenticated:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        
        downloads = DownloadHistory.objects.filter(user=user).order_by('-created_at')
        
        # Create CSV response
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="download_history.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['Date', 'Type', 'Title', 'URL', 'Size', 'Format', 'Quality', 'Status', 'Duration'])
        
        for download in downloads:
            writer.writerow([
                download.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                download.download_type,
                download.title,
                download.url,
                download.file_size_formatted,
                download.format,
                download.quality,
                download.status,
                f"{download.duration_seconds:.2f}s" if download.duration_seconds else "N/A",
            ])
        
        return response
