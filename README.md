# Prerender Service (Dockerized)

This project provides a **Dockerized prerender service** based on `prerender` with an in-memory cache. It is designed to render JavaScript-heavy pages (e.g., for SEO or bots) using headless Chromium.

## 🚀 Features

- Headless Chromium rendering
- In-memory caching (`prerender-memory-cache`)
- Configurable cache TTL and size
- Lightweight Docker image (`node:20-bullseye-slim`)
- Ready to use with Docker Compose


## 📦 Project Structure

├── Dockerfile

├── server.js

└── docker-compose.yml

## ⚙️ Configuration

### Environment Variables

| Variable         | Default | Description                        |
|------------------|--------|-------------------------------------|
| `PORT`           | `3000` | Port the service listens on         |
| `CACHE_MAXSIZE`  | `1000` | Maximum number of cached entries    |
| `CACHE_TTL`      | `43200`| Cache lifetime in seconds (12 hour) |

---

## 🐳 Docker

### Build Image

```bash
docker build -t prerender-service .
```
or check GitHub repository

```
ghcr.io/justcoded/dockerize-prerender:latest
```

with tag latest or number tag.

## 🧩 Docker Compose

Example docker-compose.yml:

```
services:
  webapp-prerender:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    shm_size: 512mb
    restart: unless-stopped
    environment:
      - PORT=3000
```

or

```
services:
  webapp-prerender:
    image: ghcr.io/justcoded/dockerize-prerender:latest
    shm_size: 512mb
    restart: unless-stopped
    environment:
      - PORT=3000
```


Run:

```bash
docker-compose up -d
```

### 🧠 How It Works
The service runs a prerender server using headless Chromium.
Incoming requests are rendered as fully loaded HTML pages.
Responses are cached in memory using prerender-memory-cache.
Cache settings are controlled via environment variables.

### 🔧 Chromium Notes
Uses system-installed Chromium (/usr/bin/chromium)
Required dependencies are installed in the Docker image
--no-sandbox is enabled for compatibility inside containers

### 📈 Use Cases
SEO for SPA (React, Vue, Angular)
Social media previews (Open Graph rendering)
Rendering pages for bots/crawlers

### 🛠 Tips
Increase shm_size if Chromium crashes
Tune CACHE_MAXSIZE based on memory limits
Use a reverse proxy (e.g., Nginx) in production
