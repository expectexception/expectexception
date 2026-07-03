#!/bin/bash
set -e

# Apply database migrations
python manage.py migrate --noinput

# Start Gunicorn with Uvicorn Workers
exec gunicorn expectexception.asgi:application \
    --workers 9 \
    --worker-class expectexception.workers.ImprovedUvicornWorker \
    --bind 0.0.0.0:8000 \
    --timeout 60 \
    --access-logfile - \
    --error-logfile -
