# trackingService

## Purpose

`trackingService` owns Shipment tracking history: events, latest known location, timestamps, route progress references, and driver references.

It does not own the Shipment aggregate. Shipment identity, Sender, ReceiverCustomer, Goods, Items, current lifecycle `status`, and `routeId` stay in `shipmentsService`.

## Boundary

`trackingService` references Shipments by `shipmentId` only.

It must not read or write the shipments MongoDB database directly. When it needs to know whether a Shipment exists, it calls `shipmentsService` through its REST API.

## Recommended Runtime Shape

- Language/framework: Node.js + Express
- Database: PostgreSQL owned by `trackingService`
- External dependency: `shipmentsService`
- API format: JSON using the same domain terms as the rest of NTG
- Map ownership: `trackingService` stores coordinates; the frontend renders maps with a map provider

## File Layout

```txt
trackingService/
├── Dockerfile
├── package.json
├── src/
│   ├── app.js
│   ├── index.js
│   ├── config.js
│   ├── db.js
│   ├── models/
│   │   └── TrackingEvent.js
│   ├── routes/
│   │   └── tracking.js
│   └── services/
│       └── shipmentsClient.js
└── docs/adr/
```

## Data Ownership

| Concept | Owner |
|---|---|
| Shipment identity | `shipmentsService` |
| Sender / ReceiverCustomer | `shipmentsService` |
| Goods / Items | `shipmentsService` |
| Current Shipment lifecycle status | `shipmentsService` |
| Tracking event history | `trackingService` |
| Latest known Shipment location | `trackingService` |
| Driver/location progress references | `trackingService` |

## Tracking Lifecycle

Current Shipment lifecycle:

```txt
booked -> in_transit -> received
```

Tracking events provide the history behind that lifecycle.

Recommended event types:

| eventType | Meaning | Shipment status effect |
|---|---|---|
| `tracking_started` | Tracking record begins for a Shipment | can reflect `booked` |
| `picked_up` | Driver has picked up the Goods | syncs Shipment to `in_transit` |
| `location_updated` | Latest driver/Shipment coordinates were reported | usually keeps `in_transit` |
| `checkpoint_reached` | Shipment passed a known route checkpoint | usually keeps `in_transit` |
| `delayed` | Shipment progress changed because of a delay | no automatic status change |
| `exception_reported` | Something abnormal happened during transport | no automatic status change |
| `received` | ReceiverCustomer confirmed receipt | syncs Shipment to `received` |

The service should reject invalid Shipment statuses. It should also prevent milestone contradictions such as a `received` tracking event with `status: "in_transit"`.

## API

Base route:

```txt
/tracking/shipments/:shipmentId
```

### Health

```txt
GET /health
```

Response:

```json
{
  "status": "ok",
  "service": "tracking-service"
}
```

### Create Tracking Event

```txt
POST /tracking/shipments/:shipmentId/events
```

Request:

```json
{
  "eventType": "location_updated",
  "status": "in_transit",
  "occurredAt": "2026-05-06T12:30:00.000Z",
  "location": {
    "lat": 55.6761,
    "lng": 12.5683,
    "label": "Copenhagen"
  },
  "routeId": "route-123",
  "driverId": "driver-456",
  "notes": "Passed checkpoint",
  "idempotencyKey": "gps-ping-123"
}
```

Response:

```json
{
  "event": {
    "trackingEventId": "uuid",
    "shipmentId": "shipment-uuid",
    "eventType": "location_updated",
    "status": "in_transit",
    "occurredAt": "2026-05-06T12:30:00.000Z",
    "location": {
      "lat": 55.6761,
      "lng": 12.5683,
      "label": "Copenhagen"
    },
    "routeId": "route-123",
    "driverId": "driver-456",
    "notes": "Passed checkpoint",
    "idempotencyKey": "gps-ping-123",
    "createdAt": "2026-05-06T12:30:01.000Z"
  },
  "shipmentStatusSync": {
    "status": "skipped",
    "reason": "event does not change Shipment lifecycle status"
  }
}
```

### Record Location

Convenience endpoint for GPS/location pings:

```txt
POST /tracking/shipments/:shipmentId/location
```

Request:

```json
{
  "location": {
    "lat": 55.6761,
    "lng": 12.5683,
    "label": "Copenhagen"
  },
  "occurredAt": "2026-05-06T12:30:00.000Z",
  "routeId": "route-123",
  "driverId": "driver-456",
  "notes": "Driver GPS ping",
  "idempotencyKey": "gps-ping-123"
}
```

Internally this creates a `location_updated` tracking event.

### List Events

```txt
GET /tracking/shipments/:shipmentId/events?limit=100&order=asc
```

Response:

```json
[
  {
    "trackingEventId": "uuid",
    "shipmentId": "shipment-uuid",
    "eventType": "picked_up",
    "status": "in_transit",
    "occurredAt": "2026-05-06T10:15:00.000Z",
    "location": {
      "lat": 55.6761,
      "lng": 12.5683,
      "label": "Copenhagen"
    },
    "routeId": "route-123",
    "driverId": "driver-456",
    "notes": "Goods picked up",
    "idempotencyKey": null,
    "createdAt": "2026-05-06T10:15:01.000Z"
  }
]
```

### Latest Tracking State

```txt
GET /tracking/shipments/:shipmentId/latest
```

Response:

```json
{
  "shipmentId": "shipment-uuid",
  "status": "in_transit",
  "latestLocation": {
    "lat": 55.6761,
    "lng": 12.5683,
    "label": "Copenhagen"
  },
  "lastUpdatedAt": "2026-05-06T12:30:00.000Z",
  "latestEvent": {
    "trackingEventId": "uuid",
    "eventType": "location_updated"
  },
  "eventCount": 4
}
```

### Tracking Summary

```txt
GET /tracking/shipments/:shipmentId
```

Returns the same current tracking summary as `/latest`. This gives the frontend one obvious endpoint for map marker state.

## Database Model

Recommended table:

```sql
CREATE TABLE tracking_events (
  tracking_event_id UUID PRIMARY KEY,
  shipment_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  status TEXT,
  occurred_at TIMESTAMPTZ NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  location_label TEXT,
  route_id TEXT,
  driver_id TEXT,
  notes TEXT,
  idempotency_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tracking_events_status_check
    CHECK (status IN ('booked', 'in_transit', 'received') OR status IS NULL),
  CONSTRAINT tracking_events_event_type_check
    CHECK (event_type IN (
      'tracking_started',
      'picked_up',
      'location_updated',
      'checkpoint_reached',
      'delayed',
      'exception_reported',
      'received'
    )),
  CONSTRAINT tracking_events_location_pair_check
    CHECK (
      (latitude IS NULL AND longitude IS NULL)
      OR
      (latitude IS NOT NULL AND longitude IS NOT NULL)
    )
);

CREATE INDEX tracking_events_shipment_occurred_idx
  ON tracking_events (shipment_id, occurred_at DESC);

CREATE UNIQUE INDEX tracking_events_idempotency_idx
  ON tracking_events (shipment_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
```

## Map API Position

`trackingService` should not render maps and should not depend on a map tile provider for its core behavior.

It stores:

- latitude
- longitude
- optional human-readable location label
- time of observation

The frontend chooses a map provider such as Mapbox, Google Maps, or Leaflet/OpenStreetMap and places markers using the coordinates returned by `trackingService`.

Optional future integrations:

- geocoding coordinates into labels
- reverse geocoding labels into coordinates
- ETA calculation using route services
- map-matching noisy GPS pings to known roads

Those should be added behind clear interfaces so tracking event storage remains provider-neutral.

## Integration With shipmentsService

Environment variable:

```txt
SHIPMENTS_SERVICE_URL=http://shipments-service:5000
```

Before creating a tracking event, `trackingService` should verify the Shipment exists:

```txt
GET {SHIPMENTS_SERVICE_URL}/shipments/:shipmentId
```

For lifecycle milestone events:

```txt
PUT {SHIPMENTS_SERVICE_URL}/shipments/:shipmentId
```

Payload examples:

```json
{ "status": "in_transit" }
```

```json
{ "status": "received" }
```

Recommended sync behavior:

- If Shipment verification returns `404`, reject the tracking event.
- If `shipmentsService` is unavailable, return `503` unless verification is explicitly disabled for local development.
- If a lifecycle status sync fails after the event is stored, return the event plus a failed sync result so the caller can retry.

## Environment

```txt
PORT=5000
DATABASE_URL=postgres://postgres:postgres@tracking_db:5432/tracking_db
SHIPMENTS_SERVICE_URL=http://shipments-service:5000
VERIFY_SHIPMENTS=true
SHIPMENT_STATUS_SYNC_ENABLED=true
HTTP_TIMEOUT_SECONDS=3
```

For isolated local development, point `DATABASE_URL` at any local PostgreSQL database and disable calls to `shipmentsService`:

```txt
DATABASE_URL=postgres://postgres:postgres@localhost:5432/tracking_db
VERIFY_SHIPMENTS=false
SHIPMENT_STATUS_SYNC_ENABLED=false
```

## Implementation Checklist

1. Add Express app with `/health`.
2. Add PostgreSQL connection using `DATABASE_URL`.
3. Add `tracking_events` table bootstrap.
4. Add request/response validation using NTG domain terms.
5. Add event creation endpoint.
6. Add location convenience endpoint.
7. Add event listing endpoint.
8. Add latest tracking summary endpoint.
9. Verify `shipmentId` through `shipmentsService`.
10. Sync Shipment status for `picked_up` and `received`.
11. Add idempotency support for repeated GPS pings.
12. Add tests with a dedicated test PostgreSQL database or mocked DB boundary.
13. Wire service into Docker Compose later from outside this folder.

## Local Run

```txt
npm install
set DATABASE_URL=postgres://postgres:postgres@localhost:5432/tracking_db
set VERIFY_SHIPMENTS=false
set SHIPMENT_STATUS_SYNC_ENABLED=false
npm start
```

PowerShell equivalent:

```powershell
$env:DATABASE_URL="postgres://postgres:postgres@localhost:5432/tracking_db"
$env:VERIFY_SHIPMENTS="false"
$env:SHIPMENT_STATUS_SYNC_ENABLED="false"
npm start
```
