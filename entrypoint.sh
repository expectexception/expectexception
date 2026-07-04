#!/bin/bash
set -e

# Apply database migrations
python manage.py migrate --noinput

# Worker count: 9 is sized for the local GPU box (11GB RAM). Render's free
# tier is 512MB — 9 workers there reliably OOM-crashes the deploy before it
# even finishes booting. Render sets RENDER_EXTERNAL_HOSTNAME for every web
# service, so default low there automatically; GUNICORN_WORKERS still wins
# if explicitly set (e.g. on a paid Render plan with more memory).
if [ -z "${GUNICORN_WORKERS}" ]; then
    if [ -n "${RENDER_EXTERNAL_HOSTNAME}" ]; then
        GUNICORN_WORKERS=2
    else
        GUNICORN_WORKERS=9
    fi
fi

# Start Gunicorn with Uvicorn Workers
exec gunicorn expectexception.asgi:application \
    --workers "${GUNICORN_WORKERS}" \
    --worker-class expectexception.workers.ImprovedUvicornWorker \
    --bind 0.0.0.0:8000 \
    --timeout 60 \
    --access-logfile - \
    --error-logfile -
