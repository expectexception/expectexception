#!/bin/bash

# Configuration
BACKEND_DIR="expectexception"
FRONTEND_DIR="frontendExpExc"
BACKEND_PORT=8000
FRONTEND_PORT=3000

# Function to kill process on a specific port
kill_port() {
    local port=$1
    local pid=$(lsof -t -i:$port)
    if [ -n "$pid" ]; then
        echo "⚠️  Port $port is in use (PID: $pid). Killing process..."
        kill -9 $pid
        sleep 1
        echo "✅  Port $port freed."
    else
        echo "✅  Port $port is free."
    fi
}

echo "🚀  Starting Development Environment..."
echo "-------------------------------------"

# 1. Handle Backend
echo "🐍  Setting up Backend..."
kill_port $BACKEND_PORT

cd $BACKEND_DIR
if [ -f "manage.py" ]; then
    echo "    Starting Django Server..."
    # Activate venv if it exists
    if [ -f ".venv/bin/activate" ]; then
        source .venv/bin/activate
    elif [ -f "venv/bin/activate" ]; then
        source venv/bin/activate
    fi
    python3 manage.py runserver &
    BACKEND_PID=$!
    echo "    Backend running with PID $BACKEND_PID"

    # Start Celery Worker
    echo "    Starting Celery Worker..."
    celery -A expectexception worker -l info &
    CELERY_PID=$!
    echo "    Celery running with PID $CELERY_PID"
else
    echo "❌  Error: manage.py not found in $BACKEND_DIR"
    exit 1
fi
cd ..

echo "-------------------------------------"

# 2. Handle Frontend
echo "⚛️   Setting up Frontend..."
kill_port $FRONTEND_PORT

cd $FRONTEND_DIR
if [ -f "package.json" ]; then
    echo "    Starting React App..."
    npm start &
    FRONTEND_PID=$!
    echo "    Frontend running with PID $FRONTEND_PID"
else
    echo "❌  Error: package.json not found in $FRONTEND_DIR"
    # Kill backend if frontend fails
    kill $BACKEND_PID
    exit 1
fi
cd ..

echo "-------------------------------------"
echo "🎉  Servers are up and running!"
echo "    Backend: http://localhost:8000"
echo "    Frontend: http://localhost:3000"
echo "-------------------------------------"
echo "Press Ctrl+C to stop all servers."

# 3. Cleanup handler
cleanup() {
    echo ""
    echo "🛑  Stopping servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    kill $CELERY_PID 2>/dev/null
    echo "✅  Servers stopped."
    exit
}

# Trap SIGINT (Ctrl+C)
trap cleanup SIGINT

# Wait for processes
wait
