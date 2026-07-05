"""
Admin-only API views for the frontend Admin Dashboard.
Provides endpoints for user management, log viewing, and Ollama model control.
"""
import os
import subprocess
import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAdminUser
from django.conf import settings
from django.contrib.auth import get_user_model
from apps.blog.models import Post
from .models import DownloadableResource

User = get_user_model()
logger = logging.getLogger(__name__)


class AdminUserListView(APIView):
    """List all users (admin only)."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        users = User.objects.all().order_by('-date_joined')
        data = [{
            'id': u.id,
            'email': u.email,
            'first_name': u.first_name,
            'last_name': u.last_name,
            'is_staff': u.is_staff,
            'is_active': u.is_active,
            'date_joined': u.date_joined.isoformat(),
            'last_login': u.last_login.isoformat() if u.last_login else None,
        } for u in users]
        return Response({'users': data, 'count': len(data)})

    def post(self, request):
        """Create a new user."""
        email = request.data.get('email')
        password = request.data.get('password')
        first_name = request.data.get('first_name', '')
        last_name = request.data.get('last_name', '')
        
        if not email or not password:
            return Response({'error': 'Email and password are required'}, status=status.HTTP_400_BAD_REQUEST)
        
        if User.objects.filter(email=email).exists():
            return Response({'error': 'Email already exists'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            user = User.objects.create_user(
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                is_active=request.data.get('is_active', True),
                is_staff=request.data.get('is_staff', False)
            )
            return Response({
                'id': user.id,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'is_staff': user.is_staff,
                'is_active': user.is_active,
                'date_joined': user.date_joined.isoformat(),
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class AdminUserDetailView(APIView):
    """Manage individual user (admin only)."""
    permission_classes = [IsAdminUser]

    def delete(self, request, pk):
        """Delete a user."""
        try:
            user = User.objects.get(pk=pk)
            if user == request.user:
                return Response({'error': 'Cannot delete yourself'}, status=status.HTTP_400_BAD_REQUEST)
            user.delete()
            return Response({'message': 'User deleted'})
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    def patch(self, request, pk):
        """Update user attributes."""
        try:
            user = User.objects.get(pk=pk)
            # Allow editing yourself, but warn frontend maybe? No, backend shouldn't block self-edit of details, 
            # but usually admin dashboard self-edit is done via profile. 
            # We'll stick to 'Cannot modify yourself' for dangerous things like is_active/is_staff if we want, 
            # but usually for details it's fine.
            
            # Prevent demoting/deactivating yourself
            if user == request.user:
                if 'is_active' in request.data and not request.data['is_active']:
                    return Response({'error': 'Cannot deactivate yourself'}, status=status.HTTP_400_BAD_REQUEST)
                if 'is_staff' in request.data and not request.data['is_staff']:
                    return Response({'error': 'Cannot remove your own admin status'}, status=status.HTTP_400_BAD_REQUEST)

            if 'email' in request.data:
                user.email = request.data['email']
            if 'first_name' in request.data:
                user.first_name = request.data['first_name']
            if 'last_name' in request.data:
                user.last_name = request.data['last_name']
            if 'is_active' in request.data:
                user.is_active = request.data['is_active']
            if 'is_staff' in request.data:
                user.is_staff = request.data['is_staff']
            if 'password' in request.data and request.data['password']:
                user.set_password(request.data['password'])
                
            user.save()
            return Response({
                'id': user.id,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'is_staff': user.is_staff,
                'is_active': user.is_active,
            })
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class AdminBackupView(APIView):
    """List local backup snapshots and trigger one on demand (admin only).

    GET  -> snapshot history (name, created, size, db/media presence).
    POST -> enqueue backup_local_data_task now (same task the daily
            schedule runs), for an on-demand "back up now" button.
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        from .tasks import BACKUP_DIR

        if not os.path.isdir(BACKUP_DIR):
            return Response({'snapshots': []})

        snapshots = []
        for name in sorted(os.listdir(BACKUP_DIR), reverse=True):
            path = os.path.join(BACKUP_DIR, name)
            if not os.path.isdir(path):
                continue
            db_path = os.path.join(path, 'db.sqlite3')
            media_path = os.path.join(path, 'media.zip')
            size_bytes = sum(
                os.path.getsize(os.path.join(path, f))
                for f in os.listdir(path)
                if os.path.isfile(os.path.join(path, f))
            )
            snapshots.append({
                'name': name,
                'has_db': os.path.exists(db_path),
                'has_media': os.path.exists(media_path),
                'size_mb': round(size_bytes / (1024 * 1024), 2),
            })

        return Response({'snapshots': snapshots})

    def post(self, request):
        from .tasks import backup_local_data_task

        if os.getenv('RENDER_EXTERNAL_HOSTNAME'):
            return Response(
                {'error': "This server's data doesn't exist on Render — nothing to back up here."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        task = backup_local_data_task.delay()
        return Response({'status': 'queued', 'task_id': task.id})


class AdminMongoStatusView(APIView):
    """Read-only visibility into the MongoDB Atlas cross-instance mirror
    (admin only). This is NOT the primary datastore — it's the
    failover/mirror layer written to by mirror_to_mongo() and read by
    JITMongoJWTAuthentication when a request lands on an instance that
    doesn't have the row locally yet. Atlas already encrypts everything
    here at rest and in transit by default; this view exists for
    inspection (is the mirror actually populated? how stale is it?), not
    as a general Mongo CRUD/admin tool.
    """
    permission_classes = [IsAdminUser]

    # Fields never shown, even to admins — a viewer doesn't need to see a
    # password hash on screen just because it's technically inspectable.
    _EXCLUDE_FIELDS = {'password'}

    COLLECTIONS = ['users', 'blog_posts', 'community_threads', 'contact_inquiries']

    def get(self, request):
        from .mongodb import get_mongodb_db

        db = get_mongodb_db()
        if db is None:
            return Response({
                'connected': False,
                'message': 'MongoDB Atlas is not configured or unreachable (MONGODB_ATLAS_URI unset, or connection failed).',
                'collections': {},
            })

        collections = {}
        for name in self.COLLECTIONS:
            try:
                coll = db[name]
                count = coll.count_documents({})
                recent_docs = list(coll.find().sort('_id', -1).limit(5))
                recent = [
                    {k: v for k, v in doc.items() if k not in self._EXCLUDE_FIELDS}
                    for doc in recent_docs
                ]
                for doc in recent:
                    doc['_id'] = str(doc['_id'])
                collections[name] = {'count': count, 'recent': recent}
            except Exception as e:
                collections[name] = {'count': None, 'recent': [], 'error': str(e)}

        return Response({'connected': True, 'collections': collections})


class AdminLogsView(APIView):
    """View backend logs (admin only)."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        lines = int(request.query_params.get('lines', 100))
        log_file = os.path.join(settings.BASE_DIR, 'logs', 'requests.log')
        
        try:
            if not os.path.exists(log_file):
                return Response({'logs': [], 'message': 'Log file not found'})
            
            # Read last N lines efficiently
            with open(log_file, 'rb') as f:
                # Seek to end
                f.seek(0, 2)
                file_size = f.tell()
                
                # Read in chunks from end
                chunk_size = 8192
                lines_found = []
                position = file_size
                
                while position > 0 and len(lines_found) < lines + 1:
                    read_size = min(chunk_size, position)
                    position -= read_size
                    f.seek(position)
                    chunk = f.read(read_size).decode('utf-8', errors='replace')
                    lines_found = chunk.splitlines() + lines_found
                
                # Take last N lines
                log_lines = lines_found[-lines:] if len(lines_found) >= lines else lines_found
            
            return Response({
                'logs': log_lines,
                'count': len(log_lines),
                'file': 'requests.log'
            })
        except Exception as e:
            logger.error(f"Error reading logs: {e}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminBlogListView(APIView):
    """List all blog posts for admin management."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        posts = Post.objects.all().order_by('-created_at')
        data = [{
            'id': p.id,
            'title': p.title,
            'slug': p.slug,
            'author': p.author.email if p.author else 'Unknown',
            'created_at': p.created_at.isoformat(),
            'likes_count': p.likes.count() if hasattr(p, 'likes') else 0,
        } for p in posts]
        return Response({'posts': data, 'count': len(data)})


class AdminBlogDetailView(APIView):
    """Manage individual blog post (delete, update)."""
    permission_classes = [IsAdminUser]

    def delete(self, request, pk):
        try:
            post = Post.objects.get(pk=pk)
            post.delete()
            return Response({'message': 'Post deleted'})
        except Post.DoesNotExist:
            return Response({'error': 'Post not found'}, status=status.HTTP_404_NOT_FOUND)

    def patch(self, request, pk):
        try:
            post = Post.objects.get(pk=pk)
            if 'title' in request.data:
                post.title = request.data['title']
            if 'slug' in request.data:
                post.slug = request.data['slug']
            if 'content' in request.data:
                post.content = request.data['content']
            # Add other fields as needed
            post.save()
            return Response({'message': 'Post updated'})
        except Post.DoesNotExist:
            return Response({'error': 'Post not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class AdminDownloadListView(APIView):
    """List all downloadable resources for admin."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        resources = DownloadableResource.objects.all().order_by('-created_at')
        data = [{
            'id': r.id,
            'name': r.name,
            'category': r.category,
            'size': r.size,
            'downloads': r.downloads,
            'version': r.version,
            'created_at': r.created_at.isoformat(),
        } for r in resources]
        return Response({'resources': data, 'count': len(data)})


class AdminDownloadDetailView(APIView):
    """Manage individual downloadable resource (delete, update)."""
    permission_classes = [IsAdminUser]

    def delete(self, request, pk):
        try:
            resource = DownloadableResource.objects.get(pk=pk)
            if resource.file:
                try:
                    resource.file.delete(save=False)
                except Exception:
                    pass
            resource.delete()
            return Response({'message': 'Resource deleted'})
        except DownloadableResource.DoesNotExist:
            return Response({'error': 'Resource not found'}, status=status.HTTP_404_NOT_FOUND)

    def patch(self, request, pk):
        try:
            resource = DownloadableResource.objects.get(pk=pk)
            if 'name' in request.data:
                resource.name = request.data['name']
            if 'category' in request.data:
                resource.category = request.data['category']
            if 'version' in request.data:
                resource.version = request.data['version']
            resource.save()
            return Response({'message': 'Resource updated'})
        except DownloadableResource.DoesNotExist:
            return Response({'error': 'Resource not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


# ============ Contact / "Connect" Inquiry Management ============
# Submitting a contact/hire form only ever stores the inquiry and pings
# CONTACT_EMAIL as an internal heads-up (see apps/contact/views.py) — it
# never emails the requester back automatically. Replying is an explicit
# admin action taken here, from the dashboard, after reviewing the request.

class AdminInquiryListView(APIView):
    """List all contact/hire inquiries for admin review."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        from apps.contact.models import ContactInquiry
        qs = ContactInquiry.objects.all().order_by('-created_at')

        status_filter = request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)

        data = [{
            'id': inq.id,
            'name': inq.name,
            'email': inq.email,
            'inquiry_type': inq.inquiry_type,
            'subject': inq.subject,
            'message': inq.message,
            'project_type': inq.project_type,
            'budget': inq.budget,
            'status': inq.status,
            'admin_notes': inq.admin_notes,
            'source_page': inq.source_page,
            'created_at': inq.created_at.isoformat(),
        } for inq in qs]
        return Response({'inquiries': data, 'count': len(data)})


class AdminInquiryDetailView(APIView):
    """Update status/admin notes on a single inquiry (admin only)."""
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        from apps.contact.models import ContactInquiry
        try:
            inquiry = ContactInquiry.objects.get(pk=pk)
        except ContactInquiry.DoesNotExist:
            return Response({'error': 'Inquiry not found'}, status=status.HTTP_404_NOT_FOUND)

        if 'status' in request.data:
            inquiry.status = request.data['status']
        if 'admin_notes' in request.data:
            inquiry.admin_notes = request.data['admin_notes']
        inquiry.save()
        return Response({'message': 'Inquiry updated'})


class AdminInquiryReplyView(APIView):
    """Send an explicit email reply to an inquiry (admin only).

    This is the only place a reply email is ever sent — there is no
    automatic reply-to-customer flow on submission.
    """
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        from django.core.mail import send_mail
        from apps.contact.models import ContactInquiry

        try:
            inquiry = ContactInquiry.objects.get(pk=pk)
        except ContactInquiry.DoesNotExist:
            return Response({'error': 'Inquiry not found'}, status=status.HTTP_404_NOT_FOUND)

        message = request.data.get('message', '').strip()
        if not message:
            return Response({'error': 'message is required'}, status=status.HTTP_400_BAD_REQUEST)
        subject = request.data.get('subject') or f"Re: {inquiry.subject or inquiry.get_inquiry_type_display()}"

        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[inquiry.email],
                fail_silently=False,
            )
        except Exception as e:
            logger.error(f"Failed to send admin reply for inquiry #{inquiry.id}: {e}")
            return Response({'error': f'Failed to send email: {e}'}, status=status.HTTP_502_BAD_GATEWAY)

        inquiry.status = 'replied'
        inquiry.save(update_fields=['status', 'updated_at'])
        return Response({'message': 'Reply sent'})


# ============ Ollama Model Management ============

class OllamaModelsView(APIView):
    """List available Ollama models with active status."""
    permission_classes = [IsAdminUser]
    
    def _get_active_model(self):
        """Read currently active model from config."""
        try:
            config_dir = os.path.expanduser('~/.ollama')
            config_file = os.path.join(config_dir, 'active_model.txt')
            if os.path.exists(config_file):
                with open(config_file, 'r') as f:
                    return f.read().strip()
        except Exception as e:
            logger.warning(f"Error reading active model: {e}")
        return None

    def get(self, request):
        try:
            from apps.chatbot.services import ollama_service
            if not ollama_service.is_available():
                return Response({'error': 'Ollama service is not reachable', 'details': 'Ollama server is offline or base URL is incorrect.'}, status=503)
            
            raw_models = ollama_service.get_models()
            active_model = self._get_active_model()
            
            models = []
            for m in raw_models:
                name = m.get('name', 'unknown')
                size_bytes = m.get('size', 0)
                if size_bytes >= 1024**3:
                    size_str = f"{size_bytes / (1024**3):.1f} GB"
                elif size_bytes >= 1024**2:
                    size_str = f"{size_bytes / (1024**2):.1f} MB"
                else:
                    size_str = f"{size_bytes / 1024:.1f} KB"
                
                models.append({
                    'name': name,
                    'id': m.get('digest', 'unknown')[:12],
                    'size': size_str,
                    'modified': m.get('modified_at', ''),
                    'is_active': name == active_model or name.split(':')[0] == active_model
                })
            
            return Response({
                'models': models,
                'count': len(models),
                'active_model': active_model
            })
        except Exception as e:
            logger.error(f"Ollama list error: {e}")
            return Response({'error': str(e)}, status=500)


class OllamaModelControlView(APIView):
    """Control Ollama models (pull, delete, load, unload, switch)."""
    permission_classes = [IsAdminUser]
    
    def _get_config_file(self):
        """Get path to Ollama config file."""
        config_dir = os.path.expanduser('~/.ollama')
        config_file = os.path.join(config_dir, 'active_model.txt')
        os.makedirs(config_dir, exist_ok=True)
        return config_file
    
    def _get_active_model(self):
        """Read currently active model from config."""
        try:
            config_file = self._get_config_file()
            if os.path.exists(config_file):
                with open(config_file, 'r') as f:
                    return f.read().strip()
        except Exception as e:
            logger.warning(f"Error reading active model: {e}")
        return None
    
    def _set_active_model(self, model_name):
        """Save active model to config."""
        try:
            config_file = self._get_config_file()
            with open(config_file, 'w') as f:
                f.write(model_name)
            return True
        except Exception as e:
            logger.warning(f"Error saving active model: {e}")
            return False

    def post(self, request):
        action = request.data.get('action')
        model_name = request.data.get('model')
        
        if not action:
            return Response({'error': 'Action required'}, status=400)
            
        from apps.chatbot.services import ollama_service
        import requests
        
        try:
            if action == 'pull':
                if not model_name:
                    return Response({'error': 'Model name required'}, status=400)
                
                # Start pull in background thread to avoid blocking Gunicorn worker
                import threading
                def pull_bg():
                    try:
                        ollama_service.pull_model(model_name)
                    except Exception as pull_err:
                        logger.error(f"Background pull model {model_name} failed: {pull_err}")
                
                threading.Thread(target=pull_bg, daemon=True).start()
                return Response({'message': f'Started pulling {model_name} in background', 'action': 'pull', 'model': model_name})
            
            elif action == 'delete':
                if not model_name:
                    return Response({'error': 'Model name required'}, status=400)
                
                res = ollama_service.delete_model(model_name)
                if res.get('status') == 'error':
                    return Response({'error': res.get('error')}, status=500)
                    
                # Clear active model if it was deleted
                if self._get_active_model() == model_name:
                    self._set_active_model('')
                return Response({'message': f'Deleted {model_name}', 'action': 'delete', 'model': model_name})
            
            elif action == 'load' or action == 'switch':
                """Load/switch a model into memory."""
                if not model_name:
                    return Response({'error': 'Model name required'}, status=400)
                
                try:
                    # Load model using the official Ollama HTTP generate API (empty prompt)
                    response = requests.post(
                        f"{ollama_service.base_url}/api/generate",
                        json={"model": model_name},
                        timeout=45,
                        verify=False
                    )
                    if response.status_code == 200:
                        self._set_active_model(model_name)
                        return Response({
                            'message': f'Successfully switched/loaded model {model_name}',
                            'action': action,
                            'model': model_name,
                            'status': 'loaded'
                        })
                    else:
                        return Response({'error': f'Ollama server returned HTTP {response.status_code}'}, status=500)
                except Exception as e:
                    return Response({'error': f'Failed to load model {model_name}: {str(e)}'}, status=500)
            
            elif action == 'restart':
                # Return a informative error if running in container, else try systemctl
                try:
                    # In a dockerized environment, we shouldn't reboot system services directly from inside container
                    if os.path.exists('/.dockerenv'):
                        return Response({
                            'error': 'Cannot restart host services from inside a Docker container.',
                            'details': 'Ollama is running externally (e.g. host systemd). Please restart it on the host machine using: sudo systemctl restart ollama.'
                        }, status=status.HTTP_400_BAD_REQUEST)
                    
                    subprocess.run(['sudo', 'systemctl', 'restart', 'ollama'], timeout=10)
                    return Response({'message': 'Ollama service restarted successfully', 'action': 'restart'})
                except Exception as e:
                    return Response({'error': f'Failed to restart: {str(e)}'}, status=500)
            
            else:
                return Response({'error': f'Unknown action: {action}'}, status=400)
                
        except Exception as e:
            logger.error(f"OllamaModelControl error: {e}")
            return Response({'error': str(e)}, status=500)
    
    def get(self, request):
        """Get current active model."""
        active = self._get_active_model()
        return Response({
            'active_model': active,
            'has_active': bool(active)
        })


class OllamaStatusView(APIView):
    """Check if Ollama is running and get current status."""
    permission_classes = [IsAdminUser]
    
    def _get_active_model(self):
        """Read currently active model from config."""
        try:
            config_dir = os.path.expanduser('~/.ollama')
            config_file = os.path.join(config_dir, 'active_model.txt')
            if os.path.exists(config_file):
                with open(config_file, 'r') as f:
                    return f.read().strip()
        except Exception as e:
            logger.warning(f"Error reading active model: {e}")
        return None

    def get(self, request):
        try:
            from apps.chatbot.services import ollama_service
            running = ollama_service.is_available()
            
            running_models = []
            if running:
                raw_running = ollama_service.get_running_models()
                for rm in raw_running:
                    name = rm.get('name')
                    running_models.append({
                        'name': name,
                        'is_active': name == self._get_active_model()
                    })
            
            active_model = self._get_active_model()
            
            return Response({
                'running': running,
                'active_model': active_model,
                'active_models': running_models,
                'version': 'unknown'
            })
        except Exception as e:
            logger.error(f"OllamaStatus error: {e}")
            return Response({
                'running': False,
                'error': str(e),
                'active_models': [],
                'active_model': None
            })

