# Traefik API Gateway

Traefik v3 acts as the API gateway for NTG. Static config lives in `traefik.yml`. All routing rules are defined via Docker labels on each service — no central routing file to maintain.

- **HTTP entrypoint**: http://localhost (port 80 — all API traffic)
- **Dashboard**: http://localhost:9090 (dev only — do not expose in production)

---

## How labels work

Traefik labels follow a **dot-notation key path** that maps to Traefik's internal object model:

```
traefik  .http  .routers  .shipments  .rule  =  PathPrefix(`/shipments`)
  │         │       │          │          │
  │         │       │          │          └─ property on the router
  │         │       │          └─ your chosen name (must be unique per service)
  │         │       └─ object type: routers | services | middlewares
  │         └─ protocol: http | tcp | udp
  └─ namespace (always "traefik")
```

### The 3 labels every service needs

```yaml
labels:
  # 1. Opt this container into Traefik (required since exposedByDefault: false in traefik.yml)
  - "traefik.enable=true"

  # 2. ROUTER — "when should Traefik send traffic here?"
  #    Name: shipments   Rule: any request whose path starts with /shipments
  - "traefik.http.routers.shipments.rule=PathPrefix(`/shipments`)"

  # 3. SERVICE — "where should Traefik forward it to?"
  #    Use the internal container port (not the host-mapped port)
  - "traefik.http.services.shipments.loadbalancer.server.port=5000"
```

The **router name** and **service name** (`shipments` above) are just identifiers. When they match, Traefik auto-wires the router to the service.

### Request flow

```
Request: GET /shipments/123
         │
         ▼
   [EntryPoint :80]
         │
         ▼
   [Router: "shipments"]          ← rule matches PathPrefix(`/shipments`)
     entrypoints: web
     rule: PathPrefix(`/shipments`)
         │
         ▼
   [Service: "shipments"]         ← forwards to the container
     loadbalancer.server.port: 5000
         │
         ▼
   shipments-service container:5000
```

Auth follows the same pattern: `POST /auth/login` is routed by the `auth` router to
`login-service` on internal port `5001`.

Traefik reads Docker labels in real-time via the mounted Docker socket. When `docker compose up` starts a container, Traefik sees its labels and **automatically builds the router + service** — no Traefik restart needed.

---

## Adding a new service

1. Add the service to `docker-compose.yml`
2. Add these labels (swap `<name>`, `<route>`, `<port>` for your values):

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.<name>.rule=PathPrefix(`/<route>`)"
  - "traefik.http.routers.<name>.entrypoints=web"
  - "traefik.http.services.<name>.loadbalancer.server.port=<port>"
```

---

## Common middleware patterns

### Strip a path prefix before forwarding

```yaml
- "traefik.http.middlewares.strip-api.stripprefix.prefixes=/api"
- "traefik.http.routers.shipments.middlewares=strip-api"
```

### Rate limiting

```yaml
- "traefik.http.middlewares.ratelimit.ratelimit.average=100"
- "traefik.http.routers.shipments.middlewares=ratelimit"
```

### Forward auth (JWT via identity-service)

```yaml
- "traefik.http.middlewares.auth.forwardauth.address=http://identity-service:5000/verify"
- "traefik.http.routers.shipments.middlewares=auth"
```

The pattern is always: **define the middleware** on one label, **attach it** to a router on another.
