# shipmentsService

## Purpose

Provides the REST API for the Shipment aggregate, including nested Goods and Items. Other services reference Shipments by the Mongo `_id` returned by this service.

## Main Endpoints

- `GET /shipments` - List shipments. Supported filters: `customerId`, `receiverCustomerId`, `senderId`, `status`, `routeId`, `driverId`
- `POST /shipments` - Create shipment
- `GET /shipments/:id` - Get shipment by id
- `PUT /shipments/:id` - Update shipment
- `DELETE /shipments/:id` - Delete shipment
- `POST /shipments/:id/goods` - Add goods to shipment
- `PUT /shipments/:id/goods/:goodsId` - Update goods
- `DELETE /shipments/:id/goods/:goodsId` - Remove goods
- `POST /shipments/:id/goods/:goodsId/items` - Add item to goods
- `PUT /shipments/:id/goods/:goodsId/items/:itemId` - Update item
- `DELETE /shipments/:id/goods/:goodsId/items/:itemId` - Remove item
- `GET /health` - Health check

## Shipment References

- `customerId` is accepted as a query alias for `receiverCustomerId`.
- `driverId` is the canonical logistics Driver assignment and should reference the `driverService` driver UUID.
- `routeId` is the customer-facing route visualization reference synced by `routeService`.

## Running Locally

1. Copy `.env.example` to `.env` and set `PORT`/`MONGODB_URI`.
2. `npm install`
3. `npm start`

## Sample Data

Sample shipment data is automatically injected into MongoDB when you run `docker compose up --build`. The data is loaded from:

```txt
Database/init/init.js
```

## Notes

- MongoDB is required.
- All endpoints accept and return JSON.
- Shipments can include an optional `estimatedArrivalAt` ISO timestamp. `notificationService` uses this field to detect delayed in-transit Shipments.
- Nested routes manage Goods and Items within Shipments.
- Errors return JSON with an `error` message.
