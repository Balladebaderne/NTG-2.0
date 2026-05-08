# Customer Support Service

Owns support tickets and provides support-oriented search helpers across Shipment data.

## Owned Data

- `SupportTicket` documents in MongoDB
- `ticketId` is a generated UUID
- Ticket records link to `shipmentId`, `customerId`, and `agentId`

## Routes

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Service health check |
| `GET` | `/tickets` | List tickets, filtered by `status`, `agentId`, or `shipmentId` |
| `GET` | `/tickets/:id` | Get one ticket by `ticketId` |
| `POST` | `/tickets` | Create ticket |
| `PUT` | `/tickets/:id` | Update ticket |
| `DELETE` | `/tickets/:id` | Delete ticket |
| `GET` | `/search/tracking?id=:shipmentId` | Lookup a Shipment by id |
| `GET` | `/search/shipments` | Fuzzy support search by destination or reference |
| `GET` | `/search/delayed` | Find Shipments in transit longer than the local delay threshold |
| `GET` | `/search/missing-events` | Find Shipments missing goods in the current demo heuristic |
| `GET` | `/search/discrepancies` | Find simple support discrepancies |

## Environment

| Variable | Default | Description |
|---|---|---|
| `PORT` | `5002` | HTTP port |
| `MONGODB_URI` | `mongodb://localhost:27017/customer_support_db` | Support MongoDB connection |
| `SHIPMENTS_SERVICE_URL` | `http://localhost:5000` | Shipment service base URL |

## External Calls

- Calls `shipmentsService` over HTTP.
- Compose uses `http://shipments-service:5000`.
- Exact Shipment filters belong in `shipmentsService`.
- Fuzzy destination/reference search belongs here and is performed after fetching Shipment data.

## Database

MongoDB is owned by this service. No other service should read `customer_support_db` directly.

## Compose Route

Traefik exposes this service through `/tickets` and `/search`.

## Known Limitations

- Support discrepancy checks are demo heuristics, not full operational exception logic.
- Ticket writes are not yet protected by hardened auth in the current HTTP integration phase.
