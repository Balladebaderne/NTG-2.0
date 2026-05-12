# Stop confirmation via event-type-to-stop-type mapping

When a Driver logs a milestone tracking event, routeService needs to confirm the corresponding Route Stop. The event carries a `routeId` but no `stopId` — we chose to have routeService map the `trackingEventType` to a stop type internally rather than requiring the caller to resolve the stop ID.

The alternative was to resolve the `stopId` in the frontend (driver picks the stop explicitly) or in trackingService (looks up the route and injects a `stopId` before publishing). Both push Route domain knowledge into contexts that shouldn't own it. Keeping the mapping in routeService means only one service knows how tracking event types relate to stop types.

## Mapping

| trackingEventType | Stop type confirmed |
|---|---|
| `goods_loaded_pickup_confirmed` | `pickup` |
| `departed_origin_terminal` | `origin_terminal` |
| `in_transit_milestone` | next unconfirmed `hub` or `border_crossing` (by sequence) |
| `arrived_destination_terminal` | `destination_terminal` |
| `goods_delivered` / `pod_confirmed` / `shipment_completed_closed` | `delivery` |

## Consequences

trackingService must attach `routeId` to published events (sourced from shipmentsService). routeService consumer no longer requires `metadata.stopId`; events without a matching stop type are silently skipped.
