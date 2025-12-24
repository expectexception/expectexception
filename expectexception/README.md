# expectexception

Django REST backend for ExpectException — JWT auth, blogging (posts, tags, comments), profiles, and admin.

Quickstart
----------

1. Copy `.env.example` to `.env` and configure settings
2. Create a virtualenv and install requirements

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

3. Run migrations and create a superuser

```bash
python manage.py migrate
python manage.py createsuperuser
```

4. Run development server

```bash
python manage.py runserver
```

APIs
----
- JWT: `/api/auth/login/`, `/api/auth/refresh/`
- Register: `/api/auth/register/`
- Posts: `/api/posts/`
- Profiles: `/api/profiles/username/`

Docs (OpenAPI/Swagger) available at `/api/schema/` and `/api/docs/`.

Examples
--------
Register a user:

```bash
curl -X POST http://localhost:8000/api/auth/register/ -H "Content-Type: application/json" -d '{"email":"me@example.com","password":"MyPass123$","password2":"MyPass123$"}'
```

Login to get JWT token:

```bash
curl -X POST http://localhost:8000/api/auth/login/ -H "Content-Type: application/json" -d '{"email":"me@example.com","password":"MyPass123$"}'
```

Create a post (authenticated):

```bash
curl -X POST http://localhost:8000/api/posts/ -H "Authorization: Bearer <ACCESS_TOKEN>" -H "Content-Type: application/json" -d '{"title":"Hello","content":"World"}'
```

Video downloader
----------------
Extract available formats:

```bash
curl -X POST http://localhost:8000/api/videos/extract/ -H "Content-Type: application/json" -d '{"url":"https://www.youtube.com/watch?v=..."}'
```

Request a download (background):

```bash
curl -X POST http://localhost:8000/api/videos/download/ -H "Content-Type: application/json" -d '{"url":"https://www.youtube.com/watch?v=...","format_id":"18"}'
```

Check status:

```bash
curl http://localhost:8000/api/videos/downloads/<id>/
```

When ready, download file:

```bash
curl -O http://localhost:8000/api/videos/downloads/<id>/file/
```

Publish a post:

```bash
curl -X POST http://localhost:8000/api/posts/<id>/publish/ -H "Authorization: Bearer <ACCESS_TOKEN>"
```

Local development notes
-----------------------

Run migrations and seed sample data:

```bash
python manage.py migrate
python manage.py seed
```

Run with Docker (quick):

```bash
docker-compose up --build
```

React frontend
--------------
The `frontend` directory contains a Vite-powered React app that mirrors the backend video downloader UI and uses Material UI for styling.

1. Change into the frontend workspace and install dependencies:

	```bash
	cd frontend
	npm install
	```

2. Optionally configure `VITE_API_BASE_URL` in `.env.local` if your Django API runs on a different host/port. The default proxy configuration already forwards `/api` to `http://localhost:8000`.

3. Start the dev server:

	```bash
	npm run dev
	```

	The UI lets you queue downloads (`POST /api/videos/download/`) and monitor progress (`GET /api/videos/tasks/`). Once a file is ready it links to the S3 presigned URL or the local `/api/videos/downloads/<id>/file/` response.

4. Build for production with `npm run build` when you're ready to ship.
