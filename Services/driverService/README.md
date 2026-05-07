# driver-service

Manages **Driver** profiles and **DriverAvailability** for the NTG platform.

A Driver is an independent truck driver who registers in the system and toggles their availability. A **CustomerSupportAgent** assigns available Drivers to Shipments via the `shipments-service`.

Authentication is handled by `identityService` (see [ADR-0004](../../docs/adr/0004-identity-service-handles-platform-auth.md)).

## Stack

Node.js · Express · PostgreSQL

## API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/drivers` | List all drivers. Filter with `?available=true` |
| `GET` | `/drivers/:id` | Get a driver by ID |
| `POST` | `/drivers` | Register a new driver |
| `PUT` | `/drivers/:id` | Update driver profile |
| `PATCH` | `/drivers/:id/availability` | Set availability (`{ "available": true\|false }`) |
| `DELETE` | `/drivers/:id` | Remove a driver |
| `GET` | `/health` | Health check |

## Run locally

Copy `.env.example` to `.env` and adjust as needed, then:

```bash
docker compose up --build driver-service driver_db
```

## Data model

```
drivers
  id          UUID (PK)
  name        VARCHAR
  email       VARCHAR (unique)
  phone       VARCHAR
  available   BOOLEAN  -- DriverAvailability
  created_at  TIMESTAMPTZ
  updated_at  TIMESTAMPTZ
```
