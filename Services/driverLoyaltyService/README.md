# Driver Loyalty Service

Tracks LoyaltyPoints earned by Drivers. Points are awarded via the message broker when a Shipment status changes.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Service health check |
| `GET` | `/drivers/:driverId/points` | Get a Driver's point total (JWT required) |

Drivers can only view their own points. `admin` and `support` roles can view any Driver's total.

## Point Values

| Event | Points |
|-------|--------|
| `delivered` | +50 |
| `intermediate_event` | +10 |

## Stack

Node.js · Express · PostgreSQL
