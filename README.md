# Expect Exception Project V2

This project consists of a React frontend and a Django backend.

## Project Structure

- **Backend**: `expectexception/` - Django DRF Backend
- **Frontend**: `frontendExpExc/` - React + TypeScript Frontend
  > **Note**: This is the correct frontend directory. Do not use any other `frontend` folders.

## Quick Start

### 1. Start the Backend

```bash
cd expectexception
# Ensure you have your virtual environment activated if you use one
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```
*Backend runs on: http://localhost:8000*

### 2. Start the Frontend

Open a new terminal:
```bash
cd frontendExpExc
npm install
npm start
```
*Frontend runs on: http://localhost:3000*

## API Documentation

The frontend is configured to communicate with the backend at `http://localhost:8000`.
API configuration is located in `frontendExpExc/src/api/config.ts`.
