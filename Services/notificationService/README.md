# notificationService

Detects delayed Shipments and creates Notifications for ReceiverCustomers and operations roles.

## Stack

Node.js · Express · PostgreSQL

## Delay detection

The service reads Shipments through the `shipments-service` HTTP API. It does not read or modify the Shipment database.

A Shipment is treated as delayed when:

- `status` is `in_transit`
- the Shipment payload contains an ETA-like field (`estimatedArrivalAt`, `estimatedArrivalTime`, `eta`, `plannedArrivalAt`, or `expectedArrivalAt`)
- that timestamp is earlier than the current time

This keeps the notification service independent while the Shipment model is still evolving.

For each delayed Shipment, the service creates:

- one customer-facing notification for `receiverCustomerId`
- one operations notification for `admin`
- one operations notification for `support`
- one operations notification for `logistics`

When a driver registers `delay_logged` for a Shipment, `tracking-service` calls
`POST /notifications/driver-delay` with service authentication. That creates
role-targeted `driver_delay_logged` notifications for the operations roles without
waiting for the scheduled delay scanner.

When a driver registers `goods_delivered`, `tracking-service` calls
`POST /notifications/driver-delivery` with service authentication. That creates
role-targeted `driver_delivery_logged` notifications for the same operations roles.

## API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/notifications` | List notifications. Filter with `?receiverCustomerId=...`, `?recipientRole=admin`, `?recipientRole=support`, `?recipientRole=logistics`, and `?unreadOnly=true` |
| `POST` | `/notifications/driver-delay` | Create operations notifications from a driver-reported delay |
| `POST` | `/notifications/driver-delivery` | Create operations notifications from a driver-reported delivery |
| `POST` | `/notifications/scan-delays` | Scan in-transit Shipments and create missing delay notifications |
| `PATCH` | `/notifications/:id/read` | Mark a notification as read |
| `GET` | `/health` | Health check |

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5002` | HTTP port |
| `DATABASE_URL` | required | PostgreSQL connection string |
| `SHIPMENTS_SERVICE_URL` | `http://shipments-service:5000` | Base URL for shipmentsService |
| `SHIPMENTS_TIMEOUT_MS` | `5000` | Shipment request timeout |
| `DELAY_POLLING_ENABLED` | `true` | Set to `false` to disable background polling |
| `DELAY_POLLING_INITIAL_DELAY_MS` | `10000` | Delay before the first background scan |
| `DELAY_POLLING_INTERVAL_MS` | `60000` | Delay scan interval |

## Run tests

```bash
npm test
```
