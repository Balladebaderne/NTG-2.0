NTG 2.0 — Initial scaffold

Folders:
- frontend/: React app
- gateway/: API gateway / reverse proxy
- Services/: backend services (each has its own DB)
- messageBroker/: broker config or stubs

Run locally (example):
1. docker-compose up --build

Each service has a .env.example. Edit as needed.
