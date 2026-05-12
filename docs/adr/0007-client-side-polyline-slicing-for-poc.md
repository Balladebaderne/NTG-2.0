# Client-side polyline slicing for simulated route progress (POC)

For the POC, the visual split between "completed" and "remaining" route segments is computed client-side. routeService exposes the full encoded polyline (already stored in `routeGeometry.encodedPolyline`) and the `actualArrivalAt` timestamps on each confirmed Stop. The frontend decodes the polyline and finds the split point nearest to the last confirmed Stop's coordinates.

Server-side polyline decoding and progress-index storage was rejected for the POC because it requires a polyline codec library dependency and additional schema columns (`progressPolylineIndex`) with no material benefit at this stage — modern mapping SDKs (Mapbox, Leaflet, Google Maps JS) expose native polyline decoding. This decision should be revisited if the progress calculation needs to move server-side for non-browser consumers (e.g., a mobile app with offline constraints).
