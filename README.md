# NTG 2.0

NTG is a freight and parcel logistics platform that coordinates the movement of goods from Senders to ReceiverCustomers via truck Drivers on planned Routes.

## Architecture

| Component | Description |
|-----------|-------------|
| `frontend/` | React + Vite SPA (served on port 3000 internally) |
| `traefik/` | API gateway config — Traefik v3 |
| `Services/` | Backend microservices (each with its own database) |
| `messageBroker/` | Node.js/Express RabbitMQ wrapper service |

![image](docs\Arkitektur.jpg)

### Architecture Decision Records
A record of architecture decisions can be found in the [adr]

### Services

| Service | Path | DB |
|---------|------|----|
| `login-service` | `loginService` | — (stateless JWT issuer) |
| `shipments-service` | `shipmentsService` | MongoDB |
| `tracking-service` | `trackingService` | PostgreSQL |
| `route-service` | `routeService` | PostgreSQL |
| `driver-service` | `driverService` | PostgreSQL |
| `driver-loyalty-service` | `driverLoyaltyService` | PostgreSQL |
| `notification-service` | `notificationService` | PostgreSQL |
| `sender-service` | `senderService` | MongoDB |
| `customer-service` | `customerService` | MongoDB |
| `customer-support-service` | `customerSupportService` | MongoDB |
| `ai-chat-service` | `aiChatService` | MongoDB |

### Docker networks

| Network | Purpose |
|---------|---------|
| `ntg_web` | Public-facing — Traefik + all routed services |
| `ntg_internal` | Private — databases only, no internet access |
| `ntg_broker` | Internal — RabbitMQ + services that publish/consume events |

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
| `/drivers/:id/points` | `driver-loyalty-service` (higher priority, matched first) |
| `/notifications` | `notification-service` |
| `/senders` | `sender-service` |
| `/customers` | `customer-service` |
| `/tickets` | `customer-support-service` |
| `/search` | `customer-support-service` |
| `/chat` | `ai-chat-service` |
| `/conversations` | `ai-chat-service` |

**App**: http://localhost  
**Traefik dashboard**: http://localhost:9090 (dev only — do not expose in production)

## Message broker (RabbitMQ)

Services communicate asynchronously via RabbitMQ on the `ntg_broker` network.

| Exchange | Type | Publishers | Consumers |
|----------|------|------------|-----------|
| `tracking.events` | topic | `tracking-service` | `route-service`, `driver-loyalty-service` |

**RabbitMQ management UI**: http://localhost:15672 (dev only — credentials: `guest` / `guest`)

## Run locally

```bash
docker compose up --build
```

Some services require environment variables not included in the compose file (e.g. `ANTHROPIC_API_KEY` for the AI chat service). Copy `.env.example` in each service directory and fill in the values, or pass them as shell environment variables before running compose.

## Adding a new service

1. Add the service to `docker-compose.yml`
2. Add Traefik labels:

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.<name>.rule=PathPrefix(`/<route>`)"
  - "traefik.http.routers.<name>.entrypoints=web"
  - "traefik.http.services.<name>.loadbalancer.server.port=<internal-port>"
  - "traefik.docker.network=ntg_web"
```

No gateway code changes required — Traefik picks up the labels automatically on `docker compose up`.

## Domain language

Key terms used throughout the codebase are defined in [`CONTEXT.md`](./CONTEXT.md). When in doubt about naming, consult that file.

## Database files
These are Init files for sample data for testing and for POC display - can be removed for PROD. 
