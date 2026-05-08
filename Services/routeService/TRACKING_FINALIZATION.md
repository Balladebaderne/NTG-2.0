# Tracking And Routing Finalization

Route Service is responsible for planned movement. Tracking Service is responsible for actual movement.

## Completed In routeService

- Route Plans are stored by `routeId`
- Route Plans reference Shipments by the current public Shipment reference, the Mongo `_id`
- Origin and Destination are stored on the Route Plan
- Ordered Stops support pickup, terminals, hubs, borders, delivery, and other planned checkpoints
- Stop metadata can hold future route/checkpoint identifiers used by tracking events
- Route creation and replacement verify Shipment existence through `shipmentsService`
- Route creation, replacement, and deletion sync `routeId` and `estimatedArrivalAt` back to `shipmentsService` when enabled
- Google Routes API enrichment can store planned distance, duration, and encoded route geometry on the Route Plan when `GOOGLE_MAPS_API_KEY` is configured

## Tracking Integration Contract

Tracking events should reference planned route progress with:

```json
{
  "routeId": "route-uuid",
  "metadata": {
    "stopId": "stop-uuid",
    "checkpointId": "hub-hamburg"
  }
}
```

Tracking should not own Route Plan stops, route geometry, or planned times. Tracking records actual event history and can reference `routeId`, `stopId`, and future checkpoint identifiers through metadata.

## Customer Read Model

A customer-facing shipment view can combine:

```txt
GET /shipments/:shipmentId
GET /routes?shipmentId=:shipmentId
GET /tracking/shipments/:shipmentId/status
```

The Shipment provides the order aggregate, the Route Plan provides planned movement, and Tracking provides current actual progress.
