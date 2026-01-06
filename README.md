# DressGenius

![Laravel](https://img.shields.io/badge/Laravel-10.x-red)
![React](https://img.shields.io/badge/React-18.x-blue)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED)
![Status](https://img.shields.io/badge/Status-Work%20in%20Progress-yellow)
![License](https://img.shields.io/badge/License-MIT-green)

DressGenius is an AI-powered fashion consulting platform designed to deliver personalized outfit recommendations based on user preferences, context, and behavioral data.

This repository is intentionally starting from scratch: this README is a step-by-step bootstrap guide that helps you create the full stack (Laravel API + React SPA + PostgreSQL) and run it locally with Docker.

---

## Pitch

> Dress smarter. Powered by AI.

---

## Project goals

- **Architecture**: practice a modern decoupled full-stack architecture (REST API + SPA)
- **Backend**: Laravel (PHP 8.2+)
- **Frontend**: React + Vite
- **Infra**: Docker Compose for a reproducible local environment
- **Data**: PostgreSQL for relational data and performance-oriented use cases
- **Product**: simulate the lifecycle of a scalable SaaS

---

## Status

- **Work in progress**
- The setup below gets you to a working baseline: database + API + frontend + a health endpoint.

---

## Tech stack

### Backend

- Laravel 10.x
- PHP 8.2+
- PostgreSQL
- REST API

### Frontend

- React 18.x
- Vite
- Tailwind CSS (planned)

### Infrastructure

- Docker
- Docker Compose

---

## Prerequisites

- Docker Desktop (with Docker Compose)
- Git

Optional (only if you want to run the frontend outside Docker):

- Node.js 20.19+ (or 22.12+)

---

## Suggested project structure

After completing the steps below, your repository will look like this:

```text
DressGenius/
  backend/               # Laravel API
  frontend/              # React application
  docker-compose.yml
  README.md
```

---

## Quick start (after you bootstrap once)

Once you have created the files and initialized the apps, the typical run command is:

```bash
docker-compose up --build
```

Then open:

- Backend: http://localhost:8000
- Frontend: http://localhost:5173

---

## Bootstrap from scratch

### 1) Create folders

Create these folders in the repository root:

```text
backend/
frontend/
```

---

### 2) Create `docker-compose.yml`

Create `docker-compose.yml` in the repository root:

```yaml
version: '3.9'

services:
  backend:
    container_name: dressgenius-backend
    build:
      context: ./backend
      dockerfile: Dockerfile
    volumes:
      - ./backend:/var/www/html
    ports:
      - "8000:8000"
    depends_on:
      - db

  frontend:
    container_name: dressgenius-frontend
    build:
      context: ./frontend
      dockerfile: Dockerfile
    volumes:
      - ./frontend:/app
      - /app/node_modules
    ports:
      - "5173:5173"
    depends_on:
      - backend

  db:
    container_name: dressgenius-db
    image: postgres:15
    restart: always
    environment:
      POSTGRES_DB: dressgenius
      POSTGRES_USER: dressgenius
      POSTGRES_PASSWORD: secret
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

Notes:

- The DB credentials above are for local development only.

---

### 3) Create `backend/Dockerfile` (Laravel)

Create `backend/Dockerfile`:

```dockerfile
FROM php:8.2-cli

RUN apt-get update && apt-get install -y \
    git \
    unzip \
    libpq-dev \
    && docker-php-ext-install pdo pdo_pgsql

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

EXPOSE 8000

CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
```

---

### 4) Create `frontend/Dockerfile` (React + Vite)

Create `frontend/Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
```

---

### 5) Create environment example files

Create `backend/.env.example`:

```env
APP_NAME=DressGenius
APP_ENV=local
APP_KEY=
APP_DEBUG=true
APP_URL=http://localhost:8000

DB_CONNECTION=pgsql
DB_HOST=db
DB_PORT=5432
DB_DATABASE=dressgenius
DB_USERNAME=dressgenius
DB_PASSWORD=secret
```

Create `frontend/.env.example`:

```env
VITE_API_URL=http://localhost:8000/api
```

---

### 6) Initialize the Laravel backend

From the repository root:

1. Create the Laravel project into `backend/`:

```bash
docker-compose run --rm backend composer create-project laravel/laravel .
```

2. Create your local env file:

```bash
copy backend\.env.example backend\.env
```

3. Generate the app key:

```bash
docker-compose run --rm backend php artisan key:generate
```

4. Start the database container:

```bash
docker-compose up -d db
```

5. Run migrations:

```bash
docker-compose run --rm backend php artisan migrate
```

---

### 7) Add a health endpoint

In `backend/routes/api.php`, add:

```php
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => response()->json(['status' => 'ok']));
```

Verify after starting containers:

- http://localhost:8000/api/health

---

### 8) Initialize the React frontend (Vite)

If you want the frontend to run in Docker, you still need to create the Vite project files on your host first.

From the repository root:

```bash
npm create vite@latest frontend -- --template react
```

Then:

```bash
copy frontend\.env.example frontend\.env
```

Optional: install dependencies locally (not required if you only use Docker, but helpful for editor tooling):

```bash
cd frontend
npm install
```

---

## Frontend to backend integration

### CORS

If your frontend makes requests to the API (different ports), you may need to allow CORS.

Laravel includes CORS support out of the box. Check `backend/config/cors.php` and ensure it allows `api/*`.

The default is usually enough, but if requests fail in the browser due to CORS, update `backend/config/cors.php` so `paths` includes:

```php
'paths' => ['api/*', 'sanctum/csrf-cookie'],
```

Then restart containers:

```bash
docker-compose up --build
```

### Minimal API call from React

In `frontend/src/App.jsx`, you can temporarily add a basic API call to confirm everything is wired:

```jsx
import { useEffect, useState } from 'react';

export default function App() {
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/health`)
      .then((r) => r.json())
      .then((data) => setStatus(data.status ?? 'unknown'))
      .catch(() => setStatus('error'));
  }, []);

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h1>DressGenius</h1>
      <p>API health: {status}</p>
    </div>
  );
}
```

---

## Running the project

From the repository root:

```bash
docker-compose up --build
```

Access:

- Backend: http://localhost:8000
- Frontend: http://localhost:5173

---

## Basic verification checklist

- API health returns JSON: http://localhost:8000/api/health
- Frontend loads: http://localhost:5173
- Postgres container is running and healthy: `dressgenius-db`

---

## Roadmap

- [ ] Docker setup stabilized (DX improvements, faster rebuilds)
- [ ] Laravel base structure
- [ ] Authentication system
- [ ] Frontend integration (React)
- [ ] Initial recommendation engine
- [ ] Performance optimizations
- [ ] Deployment pipeline

---

## Troubleshooting

### Port already in use

- If `8000`, `5173`, or `5432` are already used on your machine, change the host ports in `docker-compose.yml`.

### Laravel key not set

- Ensure `backend/.env` exists and run:

```bash
docker-compose run --rm backend php artisan key:generate
```

### Database connection errors

- Confirm your Laravel `.env` uses `DB_HOST=db` (not `localhost`).
- Confirm the database container is up before running migrations.

### Laravel filesystem / cache permission issues

- If Laravel errors on writing to `storage/` or `bootstrap/cache/`, run:

```bash
docker-compose run --rm backend php artisan optimize:clear
```

If needed, ensure those directories exist inside `backend/` after project creation.

### Frontend dependency issues in Docker

- If the frontend container fails due to missing dependencies, make sure the `frontend/` folder contains a valid Vite project (`package.json` exists).
- Rebuild after creating the Vite project:

```bash
docker-compose up --build
```

---

## Repository short description

AI-powered fashion consulting platform built with Laravel, React, Docker, and PostgreSQL.

---

## Author

Developed by Gustavo Rosas.

---

This project is under active development and is intended for learning, experimentation, and innovation.
