# trackingService

## Purpose

`trackingService` owns Shipment tracking history: operational events, latest known location, route progress references, driver/carrier references, and POD references.

It does not own the Shipment aggregate. Shipment identity, Sender, ReceiverCustomer, Goods, Items, routeId, and the coarse lifecycle status stay in `shipmentsService`.

## Boundary

`trackingService` stores events against a Shipment reference. In the current NTG services this reference is the Mongo `_id` returned by `shipmentsService`; API responses also expose the same value as `shipmentNumber` so the tracking UI can use shipment-number wording without changing storage ownership.

The service must not read or write the shipments MongoDB database directly. When it needs to know whether a Shipment exists, it calls `shipmentsService` through its REST API.

## Tracking Lifecycle

Tracking has a richer operational event flow than the coarse Shipment lifecycle in `shipmentsService`.

| Order | eventType | Meaning | Required |
|---:|---|---|---|
| 10 | `shipment_order_created` | Shipment order created | yes |
| 20 | `transport_planned_carrier_assigned` | Transport planned and carrier assigned | yes |
| 30 | `pickup_scheduled` | Pickup scheduled | yes |
| 40 | `truck_arrived_pickup` | Truck arrives at pickup location | yes |
| 50 | `goods_loaded_pickup_confirmed` | Goods loaded and pickup confirmed | yes |
| 60 | `shipment_in_transit` | Shipment in transit | yes |
| 70 | `departed_origin_terminal` | Departure from origin terminal | optional |
| 80 | `in_transit_milestone` | In transit milestone update, such as border crossing or hub arrival | optional, repeatable |
| - | `delay_logged` | Delay logged | optional side event |
| - | `exception_logged` | Exception logged | optional side event |
| 90 | `arrived_destination_terminal` | Arrival at destination terminal | optional |
| 100 | `out_for_delivery` | Out for delivery | yes |
| 110 | `truck_arrived_delivery` | Truck arrives at delivery location | yes |
| 120 | `goods_delivered` | Goods delivered | yes |
| 130 | `pod_confirmed` | Proof of Delivery (POD) confirmed | yes |
| 140 | `shipment_completed_closed` | Shipment completed and closed | yes |

The service validates that required flow events are not skipped, that the flow cannot move backwards, and that nothing can be appended after `shipment_completed_closed`.

`trackingService` does not create Shipments and does not auto-create the first tracking event by itself. After `shipmentsService` creates a Shipment, the caller that coordinates the workflow should post `shipment_order_created` using the Shipment Mongo `_id`.

Legacy event types are accepted and normalized for old clients:

| Legacy | Canonical |
|---|---|
| `tracking_started` | `shipment_order_created` |
| `picked_up` | `goods_loaded_pickup_confirmed` |
| `checkpoint_reached` | `in_transit_milestone` |
| `delayed` | `delay_logged` |
| `exception_reported` | `exception_logged` |
| `received` | `goods_delivered` |

## Status Semantics

- Event `status` is the coarse Shipment lifecycle status supported by `shipmentsService`: `booked`, `in_transit`, or `received`.
- Top-level `status` from `GET /tracking/shipments/:shipmentNumber/status` is the current tracking event type, such as `out_for_delivery`.
- `shipmentLifecycleStatus` is returned beside it when the caller needs the coarse lifecycle state.

## API

Base route:

```txt
/tracking/shipments/:shipmentNumber
```

### Health

```txt
GET /health
```

### Create Tracking Event

```txt
POST /tracking/shipments/:shipmentNumber/events
```

Request:

```json
{
  "eventType": "transport_planned_carrier_assigned",
  "occurredAt": "2026-05-06T12:30:00.000Z",
  "location": {
    "lat": 55.6761,
    "lng": 12.5683,
    "label": "Copenhagen"
  },
  "routeId": "route-123",
  "driverId": "driver-456",
  "carrierId": "carrier-789",
  "podReference": "POD-123",
  "notes": "Carrier assigned",
  "metadata": {
    "carrierName": "NTG Road"
  },
  "idempotencyKey": "planning-123"
}
```

Response:

```json
{
  "event": {
    "trackingEventId": "uuid",
    "shipmentId": "shipment-uuid",
    "shipmentNumber": "shipment-uuid",
    "eventType": "transport_planned_carrier_assigned",
    "canonicalEventType": "transport_planned_carrier_assigned",
    "eventLabel": "Transport planned and carrier assigned",
    "eventOrder": 20,
    "status": "booked",
    "shipmentLifecycleStatus": "booked",
    "occurredAt": "2026-05-06T12:30:00.000Z",
    "location": {
      "lat": 55.6761,
      "lng": 12.5683,
      "label": "Copenhagen"
    },
    "routeId": "route-123",
    "driverId": "driver-456",
    "carrierId": "carrier-789",
    "podReference": null,
    "notes": "Carrier assigned",
    "metadata": {
      "carrierName": "NTG Road"
    },
    "idempotencyKey": "planning-123",
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
POST /tracking/shipments/:shipmentNumber/location
```

Internally this creates a `location_updated` tracking event. It does not advance the operational milestone flow and does not set or sync the coarse Shipment lifecycle status.

### List Events

```txt
GET /tracking/shipments/:shipmentNumber/events?limit=100&order=asc
```

Returns the event history only.

### Latest Tracking Summary

```txt
GET /tracking/shipments/:shipmentNumber/latest
GET /tracking/shipments/:shipmentNumber
```

Returns the current tracking summary without history.

### Current Status And History

```txt
GET /tracking/shipments/:shipmentNumber/status?limit=100&order=asc
```

Verifies the Shipment reference through `shipmentsService`, then returns the current tracking event as `status` plus the Shipment's event history.

```json
{
  "shipmentId": "shipment-uuid",
  "shipmentNumber": "shipment-uuid",
  "status": "out_for_delivery",
  "statusLabel": "Out for delivery",
  "currentEvent": {
    "trackingEventId": "uuid",
    "eventType": "out_for_delivery",
    "eventLabel": "Out for delivery",
    "status": "out_for_delivery",
    "shipmentLifecycleStatus": "in_transit",
    "occurredAt": "2026-05-06T15:30:00.000Z",
    "location": null
  },
  "shipmentLifecycleStatus": "in_transit",
  "latestLocation": {
    "lat": 55.6761,
    "lng": 12.5683,
    "label": "Copenhagen"
  },
  "lastUpdatedAt": "2026-05-06T15:30:00.000Z",
  "eventCount": 8,
  "history": []
}
```

## Database Model

Recommended table:

```sql
CREATE TABLE tracking_events (
  tracking_event_id TEXT PRIMARY KEY,
  shipment_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  status TEXT,
  occurred_at TIMESTAMPTZ NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  location_label TEXT,
  route_id TEXT,
  driver_id TEXT,
  carrier_id TEXT,
  pod_reference TEXT,
  notes TEXT,
  metadata JSONB,
  idempotency_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

`ensureSchema()` creates this table, adds missing columns for existing databases, and updates the `event_type` check constraint to include the canonical flow plus legacy event types.

## Integration With shipmentsService

Environment variable:

```txt
SHIPMENTS_SERVICE_URL=http://shipments-service:5000
```

Before creating a tracking event, `trackingService` verifies the Shipment exists:

```txt
GET {SHIPMENTS_SERVICE_URL}/shipments/:shipmentNumber
```

Lifecycle sync is intentionally coarse because `shipmentsService` currently supports only `booked`, `in_transit`, and `received`.

| Tracking event | Synced Shipment status |
|---|---|
| `goods_loaded_pickup_confirmed` | `in_transit` |
| `shipment_in_transit` | `in_transit` |
| `goods_delivered` | `received` |
| `pod_confirmed` | `received` |
| `shipment_completed_closed` | `received` |

## Environment

```txt
PORT=5000
DATABASE_URL=postgres://postgres:postgres@tracking_db:5432/tracking_db
SHIPMENTS_SERVICE_URL=http://shipments-service:5000
VERIFY_SHIPMENTS=true
SHIPMENT_STATUS_SYNC_ENABLED=true
HTTP_TIMEOUT_SECONDS=3
```

For isolated local development:

```powershell
$env:DATABASE_URL="postgres://postgres:postgres@localhost:5432/tracking_db"
$env:VERIFY_SHIPMENTS="false"
$env:SHIPMENT_STATUS_SYNC_ENABLED="false"
npm start
```
