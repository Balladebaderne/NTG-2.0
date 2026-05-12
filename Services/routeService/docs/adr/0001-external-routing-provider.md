# External Routing Provider Integration

We need to let the client plug in their own route calculation tool while retaining the existing Google Routes integration for demos. routeService now supports three provider modes selected by `ROUTE_CALCULATION_PROVIDER`: `google` (unchanged), `external` (HTTP call to the client's REST endpoint), and `template` (built-in static stops, no HTTP call).

The client's tool is the authority on intermediate stops — border crossings, hub waypoints, and mandatory EU rest periods. routeService always owns the pickup and delivery stops; the external tool returns only the stops between them. This keeps the contract minimal and avoids the client needing to know how NTG models shipment endpoints.

## Considered Options

**Separate mock service vs built-in template mode** — A dedicated mock HTTP service would exercise the full integration path but adds a service to run for demos. A built-in `template` provider avoids the extra service at the cost of not exercising the HTTP adapter during demos. We chose the built-in template; the HTTP adapter code is still present and is exercised when `external` is configured.

**Geometry + stops vs stops only from external tool** — Requiring the external tool to return only intermediate stops would force continued dependence on Google for geometry. Requiring geometry + stops makes the external tool a full replacement. We chose geometry + stops, with geometry fields optional so a client tool that only returns stops still works.

## Consequences

The external provider REST contract is defined by routeService. The client's tool must accept a POST request with origin, destination, plannedPickupAt, and waypoints, and return intermediate stops (and optionally geometry) in the documented shape. Geometry fields in the external response are optional — if absent, distance, duration, and polyline remain unpopulated.
