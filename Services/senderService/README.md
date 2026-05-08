# Sender Service

Owns Sender records for the demo logistics flow and exposes sender-scoped Shipment lookup helpers.

## Owned Data

- `Sender` documents in MongoDB
- `senderId` is a generated UUID used by Shipment as `senderId`
- Sender contact and origin address details

## Routes

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Service health check |
| `GET` | `/senders` | List Senders |
| `GET` | `/senders/:id` | Get one Sender by `senderId` |
| `POST` | `/senders` | Create Sender |
| `PUT` | `/senders/:id` | Update Sender |
| `DELETE` | `/senders/:id` | Delete Sender |
| `GET` | `/senders/:id/shipments` | List Shipments for a Sender |
| `GET` | `/senders/:id/shipments/:shipmentId` | Get a Sender-owned Shipment |

## Environment

| Variable | Default | Description |
|---|---|---|
| `PORT` | `5003` | HTTP port |
| `MONGODB_URI` | `mongodb://localhost:27017/sender_db` | Sender MongoDB connection |
| `SHIPMENTS_SERVICE_URL` | `http://localhost:5000` | Preferred Shipment service base URL |
| `SHIPMENTS_URL` | unset | Backward-compatible fallback for local setups |

## External Calls

- Calls `shipmentsService` over HTTP.
- Compose uses `http://shipments-service:5000`.
- Sender-scoped Shipment calls use supported Shipment filters only: `senderId` and optional `status`.

## Database

MongoDB is owned by this service. No other service should read `sender_db` directly.

## Compose Route

Traefik exposes this service through `/senders`.

## Known Limitations

- Shipment creation still belongs to `shipmentsService`; this service only owns Sender records and Sender-specific views.
- Sender deletion does not cascade into Shipments.
