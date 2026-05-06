# identityService handles authentication for all platform users

All user types in NTG 2.0 (Drivers, CustomerSupportAgents, and any future roles) authenticate through a shared `identityService` that issues JWTs. Individual services — including `driverService` — do not implement their own auth; they delegate login to `identityService` and validate tokens on inbound requests.

## Considered Options

- **Per-service auth** — each service manages its own credentials and sessions. Rejected because it duplicates credential storage, makes cross-service identity management inconsistent, and means no single place to revoke access across the platform.
- **Shared identityService** — chosen. Single source of truth for credentials and token issuance; all services validate the same JWT format. New roles can be added to `identityService` without touching auth logic in individual services.

## Consequences

`identityService` must be online for any login to succeed — it becomes a critical dependency. Services must validate JWTs on protected routes (via Traefik ForwardAuth or inline middleware). Driver profile data (name, email, phone, availability) is owned by `driverService`; only credentials and identity are owned by `identityService`.
