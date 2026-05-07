# shipmentsService — Quick README

## Purpose
Provides a REST API for creating, updating, and tracking shipments, including nested goods and items. Used by other services and the UI.

## Main Endpoints
- `GET /shipments` — List shipments (filter by customerId, status)
- `POST /shipments` — Create shipment
- `GET /shipments/:id` — Get shipment by id
- `PUT /shipments/:id` — Update shipment
- `DELETE /shipments/:id` — Delete shipment
- `POST /shipments/:id/goods` — Add goods to shipment
- `PUT /shipments/:id/goods/:goodsId` — Update goods
- `DELETE /shipments/:id/goods/:goodsId` — Remove goods
- `POST /shipments/:id/goods/:goodsId/items` — Add item to goods
- `PUT /shipments/:id/goods/:goodsId/items/:itemId` — Update item
- `DELETE /shipments/:id/goods/:goodsId/items/:itemId` — Remove item
- `GET /health` — Health check

## Running Locally
1. Copy `.env.example` to `.env` and set `PORT`/`MONGODB_URI`.
2. `npm install`
3. `npm start`

### (Optional) Sample Data for Dev
Sample shipment data is automatically injected into MongoDB when you run `docker compose up --build`. The data is loaded from:

    Database/init/init.js

This file is automatically executed by MongoDB's init system when the container starts. No additional steps needed!

## Notes
- MongoDB required (see `.env.example`).
- All endpoints accept/return JSON.
- Shipments can include an optional `estimatedArrivalAt` ISO timestamp. `notificationService` uses this field to detect delayed in-transit Shipments.
- Nested routes allow managing goods/items within shipments.
- Errors return JSON with `error` message.
