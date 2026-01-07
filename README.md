# DressGenius

![Laravel](https://img.shields.io/badge/Laravel-10.x-red)
![React](https://img.shields.io/badge/React-18.x-blue)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED)
![Status](https://img.shields.io/badge/Status-Work%20in%20Progress-yellow)
![License](https://img.shields.io/badge/License-MIT-green)

DressGenius is an AI-powered fashion consulting platform designed to deliver personalized outfit recommendations based on user preferences, context, and behavioral data.

This repository contains a working full-stack baseline (Laravel API + React SPA + PostgreSQL) and is designed to be run locally using Docker Compose.

---

## Live demo

- Frontend: https://dress-genius.vercel.app
- Backend API: https://dressgenius.onrender.com/api/

Note: the backend is hosted on Render free tier and may sleep. If the app feels slow on the first request, open https://dressgenius.onrender.com/api/health once to wake it up.

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

---

## Project structure

```text
DressGenius/
  backend/               # Laravel API
  frontend/              # React application
  docker-compose.yml
  README.md
```

---

## Quickstart

### 1) Clone

```bash
git clone https://github.com/GustavoRosas/DressGenius.git
cd DressGenius
```

### 2) Create local env files

Create the local environment files from the examples:

```bash
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env
```

### 3) Start the stack

```bash
docker-compose up -d --build
```

### 4) First-time Laravel setup (key + migrations)

```bash
docker-compose exec backend php artisan key:generate
docker-compose exec backend php artisan migrate
```

### 5) Open the app

- Backend: http://127.0.0.1:8000
- Health check: http://127.0.0.1:8000/api/health
- Frontend: http://127.0.0.1:5173

---

## Useful commands

- Start: `docker-compose up -d`
- Stop: `docker-compose down`
- Tail logs: `docker-compose logs -f`
- Backend shell: `docker-compose exec backend sh`
- Frontend shell: `docker-compose exec frontend sh`

---

## Basic verification checklist

- API health returns JSON: http://127.0.0.1:8000/api/health
- Frontend loads: http://127.0.0.1:5173
- Postgres container is running and healthy: `dressgenius-db`

---

## Roadmap

- [x] Docker setup (Docker Compose + services)
- [x] Laravel base structure
- [x] Authentication system
- [x] Frontend integration (React)
- [x] Unit Tests - backend
- [x] Unit Tests - frontend
- [ ] Initial recommendation engine
- [ ] Performance optimizations
- [x] Basic CI/CD (tests + auto-deploy)

---

## Troubleshooting

### Port already in use

- If `8000`, `5173`, or `5432` are already used on your machine, change the host ports in `docker-compose.yml`.

### Laravel key not set

- Ensure `backend/.env` exists and run:

```bash
docker-compose exec backend php artisan key:generate
```

### Database connection errors

- Confirm your Laravel `.env` uses `DB_HOST=db` (not `127.0.0.1`).
- Confirm the database container is up before running migrations.

### API health route returns 404

- Ensure `backend/bootstrap/app.php` registers API routes.
- Confirm the route exists:

```bash
docker-compose exec backend php artisan route:list
```

### Laravel filesystem / cache permission issues

- If Laravel errors on writing to `storage/` or `bootstrap/cache/`, run:

```bash
docker-compose run --rm backend php artisan optimize:clear
```

If needed, ensure those directories exist inside `backend/` after project creation.

---

## Repository short description

AI-powered fashion consulting platform built with Laravel, React, Docker, and PostgreSQL.

---

## Author

Developed by Gustavo Rosas.

---

This project is under active development and is intended for learning, experimentation, and innovation.
