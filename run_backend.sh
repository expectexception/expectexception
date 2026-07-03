#!/bin/bash
# run_backend.sh - Helper script to run local GPU/heavy task backend

# Exit immediately if any command fails
set -e

# Base directory
BASE_DIR="/home/rjt/expexcV2"
BACKEND_DIR="$BASE_DIR/expectexception"

echo "========================================="
echo " Starting ExpectException Local Server"
echo "========================================="

# 1. Navigate to backend directory
cd "$BACKEND_DIR"

# 2. Activate virtual environment
if [ -d ".venv" ]; then
    echo "[info] Activating Python virtual environment..."
    source .venv/bin/activate
else
    echo "[error] Virtual environment (.venv) not found. Please wait for the setup to complete."
    exit 1
fi

# 3. Ensure logs directory exists
mkdir -p logs

# 4. Celery Background Worker
echo "[info] Starting Celery worker in the background (logging to logs/celery.log)..."
# We run celery worker as a background process and capture its PID
celery -A expectexception worker --loglevel=info -Q ai_detection,celery,default > logs/celery.log 2>&1 &
CELERY_PID=$!

# Trap Ctrl+C (SIGINT) and exit (SIGTERM) to clean up background Celery worker
cleanup() {
    echo ""
    echo "========================================="
    echo " Shutting down local services..."
    echo "========================================="
    if ps -p $CELERY_PID > /dev/null; then
        echo "[info] Stopping Celery worker (PID: $CELERY_PID)..."
        kill -15 $CELERY_PID
        wait $CELERY_PID 2>/dev/null
        echo "[info] Celery worker stopped."
    fi
    exit 0
}
trap cleanup SIGINT SIGTERM

# 5. Start Django Server
echo "[info] Starting Django server on http://localhost:8000..."
python manage.py runserver 0.0.0.0:8000

# Fallback cleanup if Django exits normally
cleanup
