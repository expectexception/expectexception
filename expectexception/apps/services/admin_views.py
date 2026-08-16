"""
Admin-only API views for the frontend Admin Dashboard.
Provides endpoints for user management, log viewing, and Ollama model control.
"""
import os
import subprocess
import logging
from datetime import timedelta
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAdminUser
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.models import Count, Max, Q
from django.db.models.functions import TruncDate
from django.utils import timezone
from apps.blog.models import Post
from .models import DownloadableResource, Service, UserToolRestriction, ToolUsage

User = get_user_model()
logger = logging.getLogger(__name__)


def _serialize_user(u):
    return {
        'id': u.id,
        'email': u.email,
        'first_name': u.first_name,
        'last_name': u.last_name,
        'is_staff': u.is_staff,
        'is_superuser': u.is_superuser,
        'is_active': u.is_active,
        'date_joined': u.date_joined.isoformat() if u.date_joined else None,
        'last_login': u.last_login.isoformat() if u.last_login else None,
    }


def _paginate(request, queryset, default_size=50, max_size=200):
    """Slice a queryset for an admin list endpoint.

    These views used to serialize every row on every call. That is fine with a
    handful of records and quietly turns into a multi-second response (and a
    large one) as the tables grow, which is exactly when an admin most needs
    the page to load.
    """
    try:
        page = max(1, int(request.query_params.get('page', 1)))
    except (TypeError, ValueError):
        page = 1
    try:
        page_size = int(request.query_params.get('page_size', default_size))
    except (TypeError, ValueError):
        page_size = default_size
    page_size = max(1, min(page_size, max_size))

    total = queryset.count()
    start = (page - 1) * page_size
    return queryset[start:start + page_size], {
        'count': total,
        'page': page,
        'page_size': page_size,
        'num_pages': (total + page_size - 1) // page_size,
    }


def _may_manage(actor, target):
    """Whether `actor` is allowed to modify or delete `target`.

    Every endpoint here is gated on IsAdminUser, which only checks is_staff —
    so without this, any staff account could reset a superuser's password (or
    delete/demote them) and take over the site. Superusers are managed by
    superusers only.
    """
    if target.is_superuser and not actor.is_superuser:
        return False
    return True


class AdminUserListView(APIView):
    """List all users (admin only)."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        users = User.objects.all().order_by('-date_joined')

        search = (request.query_params.get('search') or '').strip()
        if search:
            users = users.filter(
                Q(email__icontains=search)
                | Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
            )

        page, meta = _paginate(request, users)
        return Response({'users': [_serialize_user(u) for u in page], **meta})

    def post(self, request):
        """Create a new user."""
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError as DjangoValidationError
        from apps.users.models import UserManager

        email = UserManager.normalize_email(request.data.get('email') or '')
        password = request.data.get('password')
        first_name = request.data.get('first_name', '')
        last_name = request.data.get('last_name', '')

        if not email or not password:
            return Response({'error': 'Email and password are required'}, status=status.HTTP_400_BAD_REQUEST)

        # Case-insensitive: filter(email=...) let an admin create "A@x.com"
        # alongside an existing "a@x.com", which the login path then treats as
        # the same account.
        if User.objects.filter(email__iexact=email).exists():
            return Response({'error': 'Email already exists'}, status=status.HTTP_400_BAD_REQUEST)

        # Passwords set through the admin panel bypassed the validators that
        # the public signup form enforces.
        try:
            validate_password(password)
        except DjangoValidationError as e:
            return Response({'error': ' '.join(e.messages)}, status=status.HTTP_400_BAD_REQUEST)

        is_staff = bool(request.data.get('is_staff', False))
        if is_staff and not request.user.is_superuser:
            return Response(
                {'error': 'Only superusers can create staff accounts.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            user = User.objects.create_user(
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                is_active=bool(request.data.get('is_active', True)),
                is_staff=is_staff,
            )
            logger.info("Admin %s created user %s", request.user.email, user.email)
            return Response(_serialize_user(user), status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.exception("Admin user creation failed: %s", e)
            return Response({'error': 'Could not create user.'}, status=status.HTTP_400_BAD_REQUEST)


class AdminUserDetailView(APIView):
    """Manage individual user (admin only)."""
    permission_classes = [IsAdminUser]

    def delete(self, request, pk):
        """Delete a user."""
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        if user == request.user:
            return Response({'error': 'Cannot delete yourself'}, status=status.HTTP_400_BAD_REQUEST)
        if not _may_manage(request.user, user):
            return Response(
                {'error': 'Only superusers can delete a superuser account.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        email = user.email
        user.delete()
        logger.warning("Admin %s deleted user %s", request.user.email, email)
        return Response({'message': 'User deleted'})

    def patch(self, request, pk):
        """Update user attributes."""
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError as DjangoValidationError
        from apps.users.models import UserManager

        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        # IsAdminUser only means is_staff, so without this any staff account
        # could reset a superuser's password and take the site over.
        if not _may_manage(request.user, user):
            return Response(
                {'error': 'Only superusers can modify a superuser account.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Prevent locking yourself out.
        if user == request.user:
            if 'is_active' in request.data and not request.data['is_active']:
                return Response({'error': 'Cannot deactivate yourself'}, status=status.HTTP_400_BAD_REQUEST)
            if 'is_staff' in request.data and not request.data['is_staff']:
                return Response({'error': 'Cannot remove your own admin status'}, status=status.HTTP_400_BAD_REQUEST)

        if 'is_staff' in request.data and bool(request.data['is_staff']) != user.is_staff:
            if not request.user.is_superuser:
                return Response(
                    {'error': 'Only superusers can grant or revoke admin access.'},
                    status=status.HTTP_403_FORBIDDEN,
                )

        try:
            if 'email' in request.data:
                new_email = UserManager.normalize_email(request.data['email'])
                if not new_email:
                    return Response({'error': 'Email cannot be empty'}, status=status.HTTP_400_BAD_REQUEST)
                # Was assigned straight onto the model, so a collision surfaced
                # as an unhandled IntegrityError.
                if User.objects.filter(email__iexact=new_email).exclude(pk=user.pk).exists():
                    return Response(
                        {'error': 'Another account already uses that email.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                user.email = new_email
            if 'first_name' in request.data:
                user.first_name = request.data['first_name']
            if 'last_name' in request.data:
                user.last_name = request.data['last_name']
            if 'is_active' in request.data:
                user.is_active = bool(request.data['is_active'])
            if 'is_staff' in request.data:
                user.is_staff = bool(request.data['is_staff'])
            if request.data.get('password'):
                try:
                    validate_password(request.data['password'], user)
                except DjangoValidationError as e:
                    return Response({'error': ' '.join(e.messages)}, status=status.HTTP_400_BAD_REQUEST)
                user.set_password(request.data['password'])
                logger.warning("Admin %s reset the password for %s", request.user.email, user.email)

            user.save()
            return Response(_serialize_user(user))
        except Exception as e:
            logger.exception("Admin user update failed: %s", e)
            return Response({'error': 'Could not update user.'}, status=status.HTTP_400_BAD_REQUEST)


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

    # Whitelisted so the filename can be chosen from the dashboard without the
    # parameter ever becoming a way to read arbitrary files off the disk.
    AVAILABLE_LOGS = ('requests.log', 'app.log', 'errors.log', 'downloads.log')

    def get(self, request):
        # Unvalidated int() meant ?lines=abc raised ValueError -> 500, and a
        # huge value pulled the entire file into memory.
        try:
            lines = int(request.query_params.get('lines', 100))
        except (TypeError, ValueError):
            lines = 100
        lines = max(1, min(lines, 5000))

        name = request.query_params.get('file', 'requests.log')
        if name not in self.AVAILABLE_LOGS:
            return Response(
                {'error': f"Unknown log file. Available: {', '.join(self.AVAILABLE_LOGS)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # settings.LOG_DIR, not BASE_DIR/logs — the log directory is
        # relocatable (DJANGO_LOG_DIR), and this read the stale path.
        log_file = os.path.join(settings.LOG_DIR, name)

        try:
            if not os.path.exists(log_file):
                return Response({'logs': [], 'message': 'Log file not found', 'file': name})

            with open(log_file, 'rb') as f:
                f.seek(0, 2)
                position = f.tell()
                chunk_size = 8192
                buffer = b''

                # Accumulate raw bytes and only decode once. The previous
                # version decoded and splitlines()'d each chunk separately, so
                # any line straddling a chunk boundary was split into two
                # bogus lines (and a multi-byte character there decoded to a
                # replacement character).
                while position > 0 and buffer.count(b'\n') <= lines:
                    read_size = min(chunk_size, position)
                    position -= read_size
                    f.seek(position)
                    buffer = f.read(read_size) + buffer

                log_lines = buffer.decode('utf-8', errors='replace').splitlines()[-lines:]

            return Response({'logs': log_lines, 'count': len(log_lines), 'file': name})
        except Exception as e:
            logger.error(f"Error reading logs: {e}")
            return Response(
                {'error': 'Could not read log file.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class AdminBlogListView(APIView):
    """List all blog posts for admin management."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        # select_related/annotate: this ran one query for the author and
        # another for the like count on every single post.
        posts = (
            Post.objects.select_related('author')
            .annotate(num_likes=Count('likes'))
            .order_by('-created_at')
        )
        page, meta = _paginate(request, posts)
        data = [{
            'id': p.id,
            'title': p.title,
            'slug': p.slug,
            'author': p.author.email if p.author else 'Unknown',
            'created_at': p.created_at.isoformat(),
            'likes_count': p.num_likes,
        } for p in page]
        return Response({'posts': data, **meta})


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
        page, meta = _paginate(request, resources)
        data = [{
            'id': r.id,
            'name': r.name,
            'category': r.category,
            'size': r.size,
            'downloads': r.downloads,
            'version': r.version,
            'created_at': r.created_at.isoformat(),
        } for r in page]
        return Response({'resources': data, **meta})


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


class AdminToolRestrictionListCreateView(APIView):
    """List all per-user tool restrictions, or ban a user from a tool.

    Enforced at request time by apps.services.middleware.ToolAccessMiddleware,
    not by this view — this is just the admin CRUD surface for the
    UserToolRestriction table it reads from.
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        restrictions = UserToolRestriction.objects.select_related('user', 'service', 'restricted_by').all()
        data = [{
            'id': r.id,
            'user_id': r.user_id,
            'user_email': r.user.email,
            'service_id': r.service_id,
            'service_title': r.service.title,
            'reason': r.reason,
            'restricted_by_email': r.restricted_by.email if r.restricted_by else None,
            'created_at': r.created_at.isoformat(),
        } for r in restrictions]
        return Response({'restrictions': data, 'count': len(data)})

    def post(self, request):
        user_id = request.data.get('user_id')
        service_id = request.data.get('service_id')
        reason = request.data.get('reason', '')

        if not user_id or not service_id:
            return Response({'error': 'user_id and service_id are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        try:
            service = Service.objects.get(pk=service_id)
        except Service.DoesNotExist:
            return Response({'error': 'Service not found'}, status=status.HTTP_404_NOT_FOUND)

        restriction, created = UserToolRestriction.objects.get_or_create(
            user=user,
            service=service,
            defaults={'reason': reason, 'restricted_by': request.user},
        )
        if not created:
            return Response({'error': 'This user is already restricted from this tool'}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'id': restriction.id,
            'user_id': user.id,
            'user_email': user.email,
            'service_id': service.id,
            'service_title': service.title,
            'reason': restriction.reason,
            'created_at': restriction.created_at.isoformat(),
        }, status=status.HTTP_201_CREATED)


class AdminToolRestrictionDetailView(APIView):
    """Lift a per-user tool restriction (admin only)."""
    permission_classes = [IsAdminUser]

    def delete(self, request, pk):
        try:
            restriction = UserToolRestriction.objects.get(pk=pk)
        except UserToolRestriction.DoesNotExist:
            return Response({'error': 'Restriction not found'}, status=status.HTTP_404_NOT_FOUND)
        restriction.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminUserToolUsageView(APIView):
    """Per-user tool usage breakdown: which tools a specific user has used,
    how many times, and when they last used each one — drawn from the
    ToolUsage audit log every tool call already writes to.
    """
    permission_classes = [IsAdminUser]

    def get(self, request, pk):
        try:
            target_user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        usage = (
            ToolUsage.objects.filter(user_id=pk)
            .values('tool_name')
            .annotate(
                total_calls=Count('id'),
                success_calls=Count('id', filter=Q(status='success')),
                failed_calls=Count('id', filter=Q(status='failed')),
                last_used=Max('created_at'),
            )
            .order_by('-total_calls')
        )

        restricted_service_ids = set(
            UserToolRestriction.objects.filter(user_id=pk).values_list('service_id', flat=True)
        )
        restricted_services = {
            s.id: s.title
            for s in Service.objects.filter(id__in=restricted_service_ids)
        }

        return Response({
            'user_id': target_user.id,
            'user_email': target_user.email,
            'tool_usage': [{
                'tool_name': u['tool_name'],
                'total_calls': u['total_calls'],
                'success_calls': u['success_calls'],
                'failed_calls': u['failed_calls'],
                'last_used': u['last_used'].isoformat() if u['last_used'] else None,
            } for u in usage],
            'restrictions': [
                {'service_id': sid, 'service_title': title} for sid, title in restricted_services.items()
            ],
        })


class AdminUsageAnalyticsView(APIView):
    """Site-wide tool usage analytics: most-used tools and daily call volume
    over the trailing 30 days, for the admin dashboard's analytics charts.
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        since = timezone.now() - timedelta(days=30)
        recent = ToolUsage.objects.filter(created_at__gte=since)

        top_tools = list(
            recent.values('tool_name')
            .annotate(total_calls=Count('id'))
            .order_by('-total_calls')[:15]
        )

        daily_trend = list(
            recent.annotate(day=TruncDate('created_at'))
            .values('day')
            .annotate(total_calls=Count('id'))
            .order_by('day')
        )

        return Response({
            'window_days': 30,
            'total_calls': recent.count(),
            'unique_tools_used': recent.values('tool_name').distinct().count(),
            'top_tools': [{'tool_name': t['tool_name'], 'total_calls': t['total_calls']} for t in top_tools],
            'daily_trend': [{'date': d['day'].isoformat(), 'total_calls': d['total_calls']} for d in daily_trend],
        })

