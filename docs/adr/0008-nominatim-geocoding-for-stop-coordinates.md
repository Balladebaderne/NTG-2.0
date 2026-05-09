# Nominatim used for server-side geocoding of route stop coordinates

When a route is created with address-only endpoints (no explicit `lat`/`lng`), `routeService` calls the Nominatim API (OpenStreetMap) to resolve `city + country` to coordinates. The resolved `location` is stored permanently on the route's `origin`, `destination`, and each `stop` record in PostgreSQL.

## Context

The shipment creation form collects free-text addresses (city, country, optional street). No coordinates are provided by the user. The `RouteMap` component needs `stop.location.lat/lng` to render circle markers and to draw a fallback dashed line when no encoded polyline is available (e.g., when Google Routes is disabled or fails). Without geocoding, the map renders an empty tile layer.

## Decision

Geocoding is performed server-side in `enrichRouteInput` (`routeCalculation.js`) using Nominatim before the route is persisted:

- **Provider:** Nominatim (`https://nominatim.openstreetmap.org/search`) — free, no API key, no cost.
- **Query:** `city, country` (coarse — sufficient to pin a map marker at city level).
- **Best-effort:** a failed or empty lookup is silently skipped; route creation always succeeds.
- **Parallel lookups:** origin, destination, and all stops are geocoded concurrently.
- **Google Routes integration:** if Google Routes is also enabled, the geocoded coordinates are passed to it as `latLng` waypoints (more accurate routing than address strings).

## Alternatives rejected

- **Client-side geocoding in `RouteMap`:** rejected because it would fire geocoding requests on every page load and the coordinates would not be persisted — repeated loads would re-geocode the same addresses.
- **Google Maps Geocoding API:** rejected because it incurs per-request cost; the project explicitly chose to avoid paid API calls.
- **Manual coordinate input on the form:** rejected for UX reasons — operators should not need to look up lat/lng.

## Consequences

- Stop markers are always visible on the map, even when Google Routes is unavailable.
- Nominatim's usage policy (1 req/s sustained) is respected for the POC's low traffic. This should be revisited if route creation volume increases — a self-hosted Nominatim instance or a commercial geocoder would be needed.
- Coordinates are city-level, not street-level. This is acceptable for a simulated tracking POC; precise door-to-door coordinates are not required.
