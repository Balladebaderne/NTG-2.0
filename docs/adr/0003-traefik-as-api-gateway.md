# Traefik is used as the API gateway

NTG 2.0 follows a microservice architecture where all external traffic must pass through a single entry point before reaching individual services. Rather than building a custom gateway or using a general-purpose reverse proxy, we chose Traefik v3 as a purpose-built API gateway.

The previous `gateway/` was a 9-line Express.js stub with no routing logic. Maintaining a custom gateway would require implementing routing, load balancing, health checks, and middleware (auth, rate limiting, circuit breaking) by hand — undifferentiated infrastructure work with no domain value. Traefik provides all of this out of the box and integrates directly with Docker Compose via container labels, meaning routing configuration lives next to each service rather than in a central file that must be kept in sync.

## Considered Options

- **Custom Express.js gateway** — full control; rejected because it requires implementing and maintaining every gateway concern manually (routing, retries, circuit breaking, observability). The stub that existed provided none of these.
- **Nginx** — battle-tested reverse proxy; rejected because dynamic service discovery requires reloading config files or using the commercial Nginx Plus. Label-based routing is not supported natively, making it awkward in a Docker Compose workflow.
- **Kong** — feature-rich API gateway with a plugin ecosystem; rejected for this stage because it requires a separate database (PostgreSQL or Cassandra) and adds significant operational overhead relative to the current scale of NTG 2.0.
- **Traefik v3** — chosen. Zero-config Docker integration via container labels, automatic service discovery, built-in dashboard, and a clear extension path for auth (ForwardAuth), rate limiting, and circuit breaking — all configurable via labels without touching Traefik's own config files.

## Consequences

Each service that should be reachable through the gateway must opt in with `traefik.enable=true` and declare its routing rule as Docker labels in `docker-compose.yml`. Services without labels are unreachable from outside the Docker network.

Adding ForwardAuth (JWT validation via `identity-service`) and rate limiting are the expected next steps as those services come online; both are addable as label-only changes with no modification to `traefik/traefik.yml`.

The Traefik dashboard is exposed insecurely on port 9090 for development convenience. It must be disabled or protected before any production deployment.
