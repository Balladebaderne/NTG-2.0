# Customer Service

Owns ReceiverCustomer records and exposes customer-scoped Shipment views for the demo flow.

## Owned Data

- `Customer` documents in MongoDB
- `customerId` is a generated UUID used by Shipment as `receiverCustomerId`
- Customer name, email, phone, and company fields

## Routes

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Service health check |
| `GET` | `/customers` | List customers |
| `GET` | `/customers/:id` | Get one customer by `customerId` |
| `POST` | `/customers` | Create customer |
| `PUT` | `/customers/:id` | Update customer |
| `DELETE` | `/customers/:id` | Delete customer |
| `GET` | `/customers/:id/shipments` | List Shipments for a ReceiverCustomer |
| `GET` | `/customers/:id/shipments/:shipmentId` | Get a customer-owned Shipment |
| `GET` | `/customers/:id/delays` | List delayed customer Shipments |
| `GET` | `/customers/:id/stats` | Return simple Shipment status counts |

## Environment

| Variable | Default | Description |
|---|---|---|
| `PORT` | `5001` | HTTP port |
| `MONGODB_URI` | `mongodb://localhost:27017/customer_db` | Customer MongoDB connection |
| `SHIPMENTS_SERVICE_URL` | `http://localhost:5000` | Shipment service base URL |

## External Calls

- Calls `shipmentsService` over HTTP.
- Compose uses `http://shipments-service:5000`.
- Authoritative Shipment filtering uses `receiverCustomerId`, `customerId`, and `status`.
- Destination matching remains local to this service when requested.

## Database

MongoDB is owned by this service. No other service should read `customer_db` directly.

## Compose Route

Traefik exposes this service through `/customers`.

## Known Limitations

- Customer deletion does not cascade into Shipments.
- Customer ownership checks compare `receiverCustomerId` on the Shipment response.
