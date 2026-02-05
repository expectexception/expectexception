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
            'username': u.username,
            'is_staff': u.is_staff,
            'is_active': u.is_active,
            'date_joined': u.date_joined.isoformat(),
            'last_login': u.last_login.isoformat() if u.last_login else None,
        } for u in users]
        return Response({'users': data, 'count': len(data)})

    def post(self, request):
        """Create a new user."""
        email = request.data.get('email')
        username = request.data.get('username')
        password = request.data.get('password')
        
        if not email or not username or not password:
            return Response({'error': 'Email, username, and password are required'}, status=status.HTTP_400_BAD_REQUEST)
        
        if User.objects.filter(email=email).exists():
            return Response({'error': 'Email already exists'}, status=status.HTTP_400_BAD_REQUEST)
            
        if User.objects.filter(username=username).exists():
            return Response({'error': 'Username already exists'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            user = User.objects.create_user(
                email=email,
                username=username,
                password=password,
                is_active=request.data.get('is_active', True),
                is_staff=request.data.get('is_staff', False)
            )
            return Response({
                'id': user.id,
                'email': user.email,
                'username': user.username,
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
            if 'username' in request.data:
                user.username = request.data['username']
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
                'username': user.username,
                'is_staff': user.is_staff,
                'is_active': user.is_active,
            })
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


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
            result = subprocess.run(
                ['ollama', 'list'],
                capture_output=True,
                text=True,
                timeout=10
            )
            if result.returncode != 0:
                return Response({'error': 'Failed to list models', 'details': result.stderr}, status=500)
            
            active_model = self._get_active_model()
            
            # Parse output (skip header line)
            lines = result.stdout.strip().split('\n')[1:]
            models = []
            for line in lines:
                parts = line.split()
                if len(parts) >= 4:
                    model_name = parts[0]
                    models.append({
                        'name': model_name,
                        'id': parts[1],
                        'size': parts[2],
                        'modified': ' '.join(parts[3:]),
                        'is_active': model_name == active_model
                    })
            
            return Response({
                'models': models,
                'count': len(models),
                'active_model': active_model
            })
        except subprocess.TimeoutExpired:
            return Response({'error': 'Ollama command timed out'}, status=500)
        except FileNotFoundError:
            return Response({'error': 'Ollama not installed or not in PATH'}, status=500)
        except Exception as e:
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
        
        try:
            if action == 'pull':
                if not model_name:
                    return Response({'error': 'Model name required'}, status=400)
                # Start pull in background (can take long)
                subprocess.Popen(['ollama', 'pull', model_name])
                return Response({'message': f'Started pulling {model_name}', 'action': 'pull', 'model': model_name})
            
            elif action == 'delete':
                if not model_name:
                    return Response({'error': 'Model name required'}, status=400)
                result = subprocess.run(['ollama', 'rm', model_name], capture_output=True, text=True, timeout=30)
                if result.returncode != 0:
                    return Response({'error': result.stderr}, status=500)
                # Clear active model if it was deleted
                if self._get_active_model() == model_name:
                    self._set_active_model('')
                return Response({'message': f'Deleted {model_name}', 'action': 'delete', 'model': model_name})
            
            elif action == 'load':
                """Load a model into memory."""
                if not model_name:
                    return Response({'error': 'Model name required'}, status=400)
                try:
                    # Create a simple test request to load the model
                    result = subprocess.run(
                        ['ollama', 'run', model_name, 'echo "model loaded"'],
                        capture_output=True,
                        text=True,
                        timeout=30
                    )
                    if result.returncode == 0:
                        self._set_active_model(model_name)
                        return Response({
                            'message': f'Loaded model {model_name}',
                            'action': 'load',
                            'model': model_name,
                            'status': 'loaded'
                        })
                    else:
                        return Response({'error': result.stderr}, status=500)
                except Exception as e:
                    return Response({'error': f'Failed to load model: {str(e)}'}, status=500)
            
            elif action == 'switch':
                """Switch to a different model (unload current, load new)."""
                if not model_name:
                    return Response({'error': 'Model name required'}, status=400)
                try:
                    # Load the new model
                    result = subprocess.run(
                        ['ollama', 'run', model_name, 'echo "model switched"'],
                        capture_output=True,
                        text=True,
                        timeout=30
                    )
                    if result.returncode == 0:
                        self._set_active_model(model_name)
                        return Response({
                            'message': f'Switched to {model_name}',
                            'action': 'switch',
                            'model': model_name,
                            'status': 'switched'
                        })
                    else:
                        return Response({'error': result.stderr}, status=500)
                except Exception as e:
                    return Response({'error': f'Failed to switch model: {str(e)}'}, status=500)
            
            elif action == 'restart':
                # Restart Ollama service (Linux systemd)
                try:
                    subprocess.run(['sudo', 'systemctl', 'restart', 'ollama'], timeout=10)
                    return Response({'message': 'Ollama service restarted', 'action': 'restart'})
                except Exception as e:
                    return Response({'error': f'Failed to restart: {str(e)}'}, status=500)
            
            else:
                return Response({'error': f'Unknown action: {action}'}, status=400)
                
        except subprocess.TimeoutExpired:
            return Response({'error': 'Command timed out'}, status=500)
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
            # Check if ollama is running by listing models (quick check)
            result = subprocess.run(
                ['ollama', 'list'],
                capture_output=True,
                text=True,
                timeout=5
            )
            
            running = result.returncode == 0
            
            # Get running models (ps)
            ps_result = subprocess.run(
                ['ollama', 'ps'],
                capture_output=True,
                text=True,
                timeout=5
            )
            
            running_models = []
            if ps_result.returncode == 0:
                lines = ps_result.stdout.strip().split('\n')[1:]  # Skip header
                for line in lines:
                    parts = line.split()
                    if parts:
                        running_models.append({
                            'name': parts[0],
                            'is_active': parts[0] == self._get_active_model()
                        })
            
            active_model = self._get_active_model()
            
            return Response({
                'running': running,
                'active_model': active_model,
                'active_models': running_models,
                'version': 'unknown'  # Could parse from ollama --version
            })
        except Exception as e:
            logger.error(f"OllamaStatus error: {e}")
            return Response({
                'running': False,
                'error': str(e),
                'active_models': [],
                'active_model': None
            })
