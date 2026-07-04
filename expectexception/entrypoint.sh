#!/bin/bash
set -e

# Apply database migrations
python manage.py migrate --noinput

# Worker count: this box has 4 CPU cores. 9 workers was fine before this
# image also carried torch/transformers — with them, each worker doing its
# own from-scratch import of those libraries (CPU/IO heavy) on only 4 cores
# saturated the box (load average 12+) badly enough that gunicorn's 60s
# worker timeout killed workers before they finished starting, which
# retried the same import storm forever — the site never actually came up.
# Render's free tier is 512MB — 9 workers there OOM-crashes the deploy
# before it even finishes booting, so it gets its own low default too.
# GUNICORN_WORKERS still wins if explicitly set.
if [ -z "${GUNICORN_WORKERS}" ]; then
    if [ -n "${RENDER_EXTERNAL_HOSTNAME}" ]; then
        GUNICORN_WORKERS=2
    else
        GUNICORN_WORKERS=5
    fi
fi

# Start Gunicorn with Uvicorn Workers.
# --preload imports the app (including torch/transformers) ONCE in the
# master process before forking workers, so the 5 workers share that
# already-imported memory via copy-on-write instead of each one repeating
# the same slow, CPU-heavy import independently — this is what actually
# fixes the startup thundering-herd, not just the lower worker count.
exec gunicorn expectexception.asgi:application \
    --workers "${GUNICORN_WORKERS}" \
    --worker-class expectexception.workers.ImprovedUvicornWorker \
    --preload \
    --bind 0.0.0.0:8000 \
    --timeout 60 \
    --access-logfile - \
    --error-logfile -
