# routeService

## Purpose

`routeService` owns planned Shipment movement: origin, destination, ordered stops, planned pickup/delivery windows, ETA, distance, and driver/carrier assignment references.

It does not own the Shipment aggregate, Sender, ReceiverCustomer, Goods, Items, or actual tracking history.

When `GOOGLE_MAPS_API_KEY` is configured, routeService can calculate driving distance, duration, and an encoded route polyline through Google Routes API during route creation and replacement.

## Boundary

Route plans reference Shipments by the Mongo `_id` returned by `shipmentsService`.

`routeService` verifies Shipment existence through the `shipmentsService` REST API and can sync `routeId` plus `estimatedArrivalAt` back to the Shipment. It must not read or write the shipments MongoDB database directly.

## API

Base route:

```txt
/routes
```

### Health

```txt
GET /health
```

### Create Route

```txt
POST /routes
```

Request:

```json
{
  "shipmentId": "shipment-mongo-id",
  "origin": {
    "label": "Sender warehouse",
    "address": {
      "street": "Industrivej 1",
      "city": "Copenhagen",
      "postalCode": "2100",
      "country": "DK"
    },
    "location": {
      "lat": 55.6761,
      "lng": 12.5683
    }
  },
  "destination": {
    "label": "Receiver",
    "address": {
      "street": "Main Street 2",
      "city": "Aarhus",
      "postalCode": "8000",
      "country": "DK"
    },
    "location": {
      "lat": 56.1629,
      "lng": 10.2039
    }
  },
  "stops": [
    {
      "sequence": 1,
      "type": "pickup",
      "address": {
        "city": "Copenhagen",
        "country": "DK"
      }
    },
    {
      "sequence": 2,
      "type": "hub",
      "address": {
        "city": "Hamburg",
        "country": "DE"
      },
      "metadata": {
        "checkpointId": "hub-hamburg"
      }
    },
    {
      "sequence": 3,
      "type": "delivery",
      "address": {
        "city": "Aarhus",
        "country": "DK"
      }
    }
  ],
  "plannedPickupAt": "2026-05-08T09:00:00.000Z",
  "plannedDeliveryAt": "2026-05-08T16:00:00.000Z",
  "estimatedArrivalAt": "2026-05-08T16:00:00.000Z",
  "assignedDriverId": "driver-123",
  "carrierId": "carrier-456",
  "distanceKm": 330,
  "metadata": {
    "planningSource": "dispatcher"
  }
}
```

If `stops` are omitted, routeService derives a `pickup` stop from `origin` and a `delivery` stop from `destination`.

Response:

```json
{
  "route": {
    "routeId": "route-uuid",
    "shipmentId": "shipment-mongo-id",
    "status": "planned",
    "distanceKm": 330.442,
    "durationSeconds": 14400,
    "routeGeometry": {
      "provider": "google_routes",
      "encodedPolyline": "encoded-polyline",
      "polylineEncoding": "ENCODED_POLYLINE"
    },
    "origin": {},
    "destination": {},
    "stops": []
  },
  "shipmentRouteSync": {
    "status": "succeeded",
    "routeId": "route-uuid",
    "estimatedArrivalAt": "2026-05-08T16:00:00.000Z"
  }
}
```

### List Routes

```txt
GET /routes?shipmentId=shipment-mongo-id&status=planned&limit=100
```

### Get Route

```txt
GET /routes/:routeId
```

### Replace Route

```txt
PUT /routes/:routeId
```

`PUT` replaces the route plan and stop list.

### Delete Route

```txt
DELETE /routes/:routeId
```

Deletes the route plan and clears the Shipment `routeId` and `estimatedArrivalAt` through `shipmentsService` when sync is enabled.

## Route Statuses

```txt
planned
active
completed
cancelled
```

## Stop Types

```txt
pickup
origin_terminal
hub
border_crossing
destination_terminal
delivery
other
```

## Integration With trackingService

Tracking should reference Route Plan details instead of owning route data.

Tracking events can store:

```json
{
  "routeId": "route-uuid",
  "metadata": {
    "stopId": "stop-uuid",
    "checkpointId": "hub-hamburg"
  }
}
```

## Google Route Calculation

Set `GOOGLE_MAPS_API_KEY` locally to enable Google route calculation. The key must stay in environment configuration and must not be committed to source control.

On `POST /routes` and `PUT /routes/:routeId`, routeService sends the planned origin, destination, and intermediate stops to Google Routes API. When Google returns a route, routeService stores:

```txt
distanceKm
durationSeconds
routeGeometry.encodedPolyline
routeGeometry.polylineEncoding
routeGeometry.viewport
```

The encoded polyline can be decoded by a frontend map library to draw the route. If `plannedPickupAt` is supplied and `estimatedArrivalAt` is omitted, routeService derives ETA from the calculated driving duration.

By default, route calculation is non-blocking. If Google is unavailable or the API key is not enabled for Routes API, the route is still created and `metadata.routeCalculation.status` is recorded as `failed`. Set `ROUTE_CALCULATION_REQUIRED=true` when route creation should fail instead.

## Environment

```txt
PORT=5000
DATABASE_URL=postgres://postgres:postgres@route_db:5432/route_db
SHIPMENTS_SERVICE_URL=http://shipments-service:5000
VERIFY_SHIPMENTS=true
SHIPMENT_ROUTE_SYNC_ENABLED=true
HTTP_TIMEOUT_SECONDS=3
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
ROUTE_CALCULATION_PROVIDER=google
ROUTE_CALCULATION_REQUIRED=false
GOOGLE_ROUTES_API_URL=https://routes.googleapis.com/directions/v2:computeRoutes
```
