shipmentsService — Quick README

Purpose
Handles shipment creation, tracking and status updates for orders. Provides a small REST API used by the Orders service and the UI.

How it works
- POST /shipments: create a shipment (select carrier, estimate ETA).
- Status updates via internal events (message broker) and incoming webhooks.
- Data persisted through the repository layer; business rules live in the service layer.

Key files
- src/index.* — entry point, HTTP server
- src/controllers/shipmentController.* — API handlers
- src/services/shipmentService.* — business logic
- src/repositories/* — persistence layer
- config/* and .env.example — configuration

Running locally
1. Copy .env.example to .env and set DB/queue/PORT values.
2. npm install
3. npm start (or npm run dev)

Testing
- npm test

Notes
- Endpoints are designed to be idempotent; include an idempotency key for creates when retrying.
- Health check: GET /health

Contacts
- Backend team: backend-team@example.com
