NTG 2.0

## Architecture

| Component | Description |
|-----------|-------------|
| `frontend/` | React + Vite app (port 3000) |
| `traefik/` | API gateway config — Traefik v3 |
| `Services/` | Backend microservices (each with its own DB) |
| `messageBroker/` | Broker config / stubs |

## API Gateway (Traefik)

All app and API traffic enters through Traefik on **port 80**. Routes are defined via Docker labels on each service — no central routing file.

| Path prefix | Service |
|-------------|---------|
| `/` | `frontend` |
| `/auth` | `login-service` |
| `/shipments` | `shipments-service` |
| `/tracking` | `tracking-service` |
| `/routes` | `route-service` |
| `/drivers` | `driver-service` |
| `/drivers/:id/points` | `driver-loyalty-service` |
| `/notifications` | `notification-service` |
| `/senders` | `sender-service` |
| `/customers` | `customer-service` |
| `/tickets` | `customer-support-service` |
| `/search` | `customer-support-service` |
| `/chat` | `ai-chat-service` |
| `/conversations` | `ai-chat-service` |

**App**: http://localhost
**Dashboard**: http://localhost:9090 (dev only — do not expose in production)

## Run locally

```bash
docker compose up --build
```

Each service has a `.env.example`. Edit as needed.

## Adding a new service

1. Add the service to `docker-compose.yml`
2. Add Traefik labels:

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.<name>.rule=PathPrefix(`/<route>`)"
  - "traefik.http.routers.<name>.entrypoints=web"
  - "traefik.http.services.<name>.loadbalancer.server.port=<internal-port>"
```

No gateway code changes required — Traefik picks up the labels automatically on `docker compose up`.
