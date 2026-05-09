# routeService consumes tracking events for simulated real-time route progress

routeService subscribes to the `tracking.events` RabbitMQ exchange and consumes `shipment.intermediate_event` and `shipment.delivered` routing keys to update Route Plan progress. When a Driver confirms a Stop via trackingService, routeService stamps `actualArrivalAt` on the corresponding Stop, recalculates `estimatedArrivalAt` using a simple time-delta shift, and auto-transitions the Route Plan status (`planned → active` on first confirmation, `active → completed` on delivery confirmation).

This deliberately places actual-progress side-effects inside routeService rather than a separate tracking read-model, which conflicts with the original separation of "planned movement" (routing) from "what actually happened" (tracking). The trade-off was accepted for the POC because: (1) routeService already owns all the data needed for the calculation (Stop planned times, geometry), (2) the message broker keeps the services loosely coupled — trackingService publishes without knowing routeService exists, and (3) driverLoyaltyService consumes the same events for loyalty point awards, making RabbitMQ the natural integration bus for all downstream consumers of driver stop confirmations.

## Considered Options

- **trackingService calls routeService via HTTP** on each check-in — rejected: creates hard coupling between services and requires routeService to be available for tracking to succeed.
- **Frontend composes both services** (pull model) — rejected: puts business logic (ETA calculation, status transition) in the client.
