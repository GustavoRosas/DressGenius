# 👗 DressGenius

![Laravel](https://img.shields.io/badge/Laravel-10.x-red)
![React](https://img.shields.io/badge/React-18.x-blue)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED)
![Status](https://img.shields.io/badge/Status-Work%20in%20Progress-yellow)
![License](https://img.shields.io/badge/License-MIT-green)

**DressGenius** is an innovative **AI-powered fashion consulting platform**, designed to deliver personalized outfit recommendations based on user preferences, context, and behavioral data.

This project also serves as a **full-stack technical playground**, where modern development practices are applied using **Laravel, React, Docker, and PostgreSQL**, simulating a real-world **SaaS product**.

---

## 🚀 Pitch (Startup Style)

> *Dress smarter. Powered by AI.*
> An intelligent fashion consulting platform that turns data into style.

---

## 🎯 Project Goals

* Apply a **modern full-stack architecture** in a real-world scenario
* Deepen knowledge in **Laravel + React** integration
* Use **Docker** for environment standardization
* Work with **PostgreSQL** in performance-oriented use cases
* Explore **AI-driven recommendation systems**
* Simulate the lifecycle of a **scalable SaaS product**

---

## 🧠 Features (Work in Progress)

* User registration and authentication
* Personal style profile (preferences, measurements, occasions)
* AI-powered outfit recommendations
* Recommendation history
* RESTful API
* Admin dashboard

---

## 🛠️ Tech Stack

### Backend

* Laravel
* PHP 8+
* PostgreSQL
* REST API

### Frontend

* React
* Vite
* Tailwind CSS (planned)

### Infrastructure

* Docker
* Docker Compose

---

## 📦 Architecture Overview

* Decoupled backend via REST API
* SPA frontend built with React
* Relational database (PostgreSQL)
* Isolated containers per service

---

## 🗺️ Roadmap

* [ ] Initial Docker setup
* [ ] Laravel base structure
* [ ] Authentication system
* [ ] Frontend integration (React)
* [ ] Initial recommendation engine
* [ ] Performance optimizations
* [ ] Deployment pipeline

---

## 📁 Suggested Project Structure

```text
DressGenius/
├── backend/            # Laravel API
├── frontend/           # React application
├── docker/             # Docker & Docker Compose configs
├── docs/               # Technical documentation
├── .env.example
├── docker-compose.yml
└── README.md
```

---

## 🐳 Docker Setup

The project uses **Docker Compose** to provide a consistent local development environment.

### Services

* **backend**: Laravel API (PHP 8+)
* **frontend**: React application (Vite)
* **db**: PostgreSQL database

### docker-compose.yml

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
    environment:
      APP_ENV: local
      DB_CONNECTION: pgsql
      DB_HOST: db
      DB_PORT: 5432
      DB_DATABASE: dressgenius
      DB_USERNAME: dressgenius
      DB_PASSWORD: secret

  frontend:
    container_name: dressgenius-frontend
    build:
      context: ./frontend
      dockerfile: Dockerfile
    volumes:
      - ./frontend:/app
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

### Running the project

```bash
docker-compose up --build
```

Backend will be available at:

* [http://localhost:8000](http://localhost:8000)

Frontend will be available at:

* [http://localhost:5173](http://localhost:5173)

---

## 🐘 Backend Dockerfile (Laravel)

Create `backend/Dockerfile`:

```dockerfile
FROM php:8.2-cli

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    unzip \
    libpq-dev \
    && docker-php-ext-install pdo pdo_pgsql

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

EXPOSE 8000

CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
```

---

## ⚛️ Frontend Dockerfile (React + Vite)

Create `frontend/Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]
```

---

## 🔐 Environment Files

### backend/.env.example

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

### frontend/.env.example

```env
VITE_API_URL=http://localhost:8000/api
```

---

## 🧪 Project Bootstrap

### 1️⃣ Create Laravel project

```bash
docker-compose run --rm backend composer create-project laravel/laravel .
```

Generate app key:

```bash
docker-compose run --rm backend php artisan key:generate
```

### 2️⃣ Create React project (Vite)

```bash
npm create vite@latest frontend -- --template react
cd frontend
npm install
```

---

## 🩺 Health Check Endpoint (Laravel)

Create a simple API endpoint to test integration:

```php
Route::get('/health', fn () => response()->json(['status' => 'ok']));
```

Access it at:

* [http://localhost:8000/api/health](http://localhost:8000/api/health)

---

## 📌 Repository Short Description

AI-powered fashion consulting platform built with **Laravel, React, Docker, and PostgreSQL**.

---

## 👨‍💻 Author

Developed by **Gustavo Rosas** — Full-Stack Developer & Computer Engineer.

Remote-first • Clean code • Real-world architecture

---

⚠️ *This project is under active development and is intended for learning, experimentation, and innovation.*
