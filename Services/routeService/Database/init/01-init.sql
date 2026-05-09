-- Route Service — schema creation + sample data
-- This script runs once when route_db is first initialised (empty volume).
-- The app also calls ensureSchema() on startup, which is idempotent, so
-- running both is safe.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Tables ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS route_plans (
  route_id            TEXT PRIMARY KEY,
  shipment_id         TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'planned',
  origin              JSONB NOT NULL,
  destination         JSONB NOT NULL,
  planned_pickup_at   TIMESTAMPTZ,
  planned_delivery_at TIMESTAMPTZ,
  estimated_arrival_at TIMESTAMPTZ,
  assigned_driver_id  TEXT,
  carrier_id          TEXT,
  distance_km         DOUBLE PRECISION,
  duration_seconds    INTEGER,
  route_geometry      JSONB,
  metadata            JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT route_plans_status_check
    CHECK (status IN ('planned', 'active', 'completed', 'cancelled')),
  CONSTRAINT route_plans_distance_check
    CHECK (distance_km IS NULL OR distance_km >= 0),
  CONSTRAINT route_plans_duration_check
    CHECK (duration_seconds IS NULL OR duration_seconds >= 0)
);

CREATE TABLE IF NOT EXISTS route_stops (
  stop_id              TEXT PRIMARY KEY,
  route_id             TEXT NOT NULL REFERENCES route_plans(route_id) ON DELETE CASCADE,
  sequence             INTEGER NOT NULL,
  type                 TEXT NOT NULL,
  address              JSONB NOT NULL,
  location             JSONB,
  planned_arrival_at   TIMESTAMPTZ,
  planned_departure_at TIMESTAMPTZ,
  actual_arrival_at    TIMESTAMPTZ,
  notes                TEXT,
  metadata             JSONB,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT route_stops_type_check
    CHECK (type IN (
      'pickup', 'origin_terminal', 'hub',
      'border_crossing', 'destination_terminal', 'delivery', 'other'
    )),
  CONSTRAINT route_stops_sequence_check
    CHECK (sequence > 0),
  CONSTRAINT route_stops_route_sequence_unique
    UNIQUE (route_id, sequence)
);

CREATE INDEX IF NOT EXISTS route_plans_shipment_idx ON route_plans (shipment_id);
CREATE INDEX IF NOT EXISTS route_stops_route_sequence_idx ON route_stops (route_id, sequence);

-- ─── Sample routes ─────────────────────────────────────────────────────────
-- Shipment IDs match the ObjectIds seeded in shipments_db (init.js).
-- route-plan-001 → shipment 111111111111111111111111 (status: planned)
--   Hamburg → Copenhagen, seeded with the full template corridor stops.
-- route-plan-002 → shipment 222222222222222222222222 (status: active)
--   Aarhus → Berlin, seeded with border + hub intermediate stops.
--   Pickup is already confirmed; driver is currently between Flensburg and Hamburg.

INSERT INTO route_plans (
  route_id, shipment_id, status,
  origin, destination,
  planned_pickup_at, planned_delivery_at, estimated_arrival_at,
  distance_km, duration_seconds,
  route_geometry,
  metadata
) VALUES
(
  'route-plan-001',
  '111111111111111111111111',
  'planned',
  '{
    "label": "NTG Hamburg Hub",
    "address": { "street": "Reeperbahn 1", "city": "Hamburg", "postalCode": "20359", "country": "DE" },
    "location": { "lat": 53.5511, "lng": 9.9937 }
  }'::jsonb,
  '{
    "label": "NTG Copenhagen",
    "address": { "street": "Rådhuspladsen 1", "city": "Copenhagen", "postalCode": "1550", "country": "DK" },
    "location": { "lat": 55.6761, "lng": 12.5683 }
  }'::jsonb,
  NOW() + INTERVAL '24 hours',
  NOW() + INTERVAL '30 hours',
  NOW() + INTERVAL '30 hours',
  460.5,
  19800,
  '{
    "encodedPolyline": "sfyrI{vukAzdt@z_fLg|Oz~sDfyfCnqFj}qF_wkB",
    "polylineEncoding": "ENCODED_POLYLINE"
  }'::jsonb,
  '{ "routeCalculationProvider": "template" }'::jsonb
),
(
  'route-plan-002',
  '222222222222222222222222',
  'active',
  '{
    "label": "NTG Aarhus",
    "address": { "street": "Store Torv 4", "city": "Aarhus", "postalCode": "8000", "country": "DK" },
    "location": { "lat": 56.1629, "lng": 10.2039 }
  }'::jsonb,
  '{
    "label": "NTG Berlin Hub",
    "address": { "street": "Unter den Linden 1", "city": "Berlin", "postalCode": "10117", "country": "DE" },
    "location": { "lat": 52.5200, "lng": 13.4050 }
  }'::jsonb,
  NOW() - INTERVAL '3 hours',
  NOW() + INTERVAL '6 hours',
  NOW() + INTERVAL '6 hours',
  780.2,
  32400,
  '{
    "encodedPolyline": "cixuIk}g}@bjbCffmCrwyJoddBjkhEsgyS",
    "polylineEncoding": "ENCODED_POLYLINE"
  }'::jsonb,
  '{ "routeCalculationProvider": "template" }'::jsonb
)
ON CONFLICT (route_id) DO NOTHING;

-- ─── Sample stops ──────────────────────────────────────────────────────────
-- route-plan-001: planned (Hamburg → Copenhagen) — 6 stops, no actual arrivals yet
--   pickup → origin_terminal → border_crossing → hub → destination_terminal → delivery
-- route-plan-002: active (Aarhus → Berlin) — 4 stops
--   pickup [confirmed] → border_crossing → hub → delivery

INSERT INTO route_stops (
  stop_id, route_id, sequence, type,
  address, location,
  planned_arrival_at, actual_arrival_at, notes, metadata
) VALUES

-- ── route-plan-001 (planned, Hamburg → Copenhagen) ──────────────────────────
(
  'stop-001-1-pickup',
  'route-plan-001', 1, 'pickup',
  '{ "street": "Reeperbahn 1", "city": "Hamburg", "postalCode": "20359", "country": "DE" }'::jsonb,
  '{ "lat": 53.5511, "lng": 9.9937 }'::jsonb,
  NOW() + INTERVAL '24 hours',
  NULL,
  'Collect pallets from warehouse bay 3',
  NULL
),
(
  'stop-001-2-origin-terminal',
  'route-plan-001', 2, 'origin_terminal',
  '{ "street": null, "city": "Hamburg", "postalCode": null, "country": "DE" }'::jsonb,
  '{ "lat": 53.5511, "lng": 9.9937, "label": "Hamburg Terminal" }'::jsonb,
  NOW() + INTERVAL '24 hours 30 minutes',
  NULL,
  'Template stop: origin terminal',
  '{ "source": "template" }'::jsonb
),
(
  'stop-001-3-border',
  'route-plan-001', 3, 'border_crossing',
  '{ "street": null, "city": "Flensburg", "postalCode": null, "country": "DE" }'::jsonb,
  '{ "lat": 54.7833, "lng": 9.4333, "label": "DE/DK Border Crossing" }'::jsonb,
  NOW() + INTERVAL '26 hours',
  NULL,
  'Template stop: border crossing DE/DK',
  '{ "source": "template" }'::jsonb
),
(
  'stop-001-4-hub',
  'route-plan-001', 4, 'hub',
  '{ "street": null, "city": "Kolding", "postalCode": null, "country": "DK" }'::jsonb,
  '{ "lat": 55.4904, "lng": 9.4721, "label": "Kolding Relay Hub" }'::jsonb,
  NOW() + INTERVAL '27 hours',
  NULL,
  'Template stop: relay hub',
  '{ "source": "template" }'::jsonb
),
(
  'stop-001-5-dest-terminal',
  'route-plan-001', 5, 'destination_terminal',
  '{ "street": null, "city": "Copenhagen", "postalCode": null, "country": "DK" }'::jsonb,
  '{ "lat": 55.6761, "lng": 12.5683, "label": "Copenhagen Terminal" }'::jsonb,
  NOW() + INTERVAL '29 hours 30 minutes',
  NULL,
  'Template stop: destination terminal',
  '{ "source": "template" }'::jsonb
),
(
  'stop-001-6-delivery',
  'route-plan-001', 6, 'delivery',
  '{ "street": "Rådhuspladsen 1", "city": "Copenhagen", "postalCode": "1550", "country": "DK" }'::jsonb,
  '{ "lat": 55.6761, "lng": 12.5683 }'::jsonb,
  NOW() + INTERVAL '30 hours',
  NULL,
  'Deliver to loading dock B',
  NULL
),

-- ── route-plan-002 (active, Aarhus → Berlin) ────────────────────────────────
(
  'stop-002-1-pickup',
  'route-plan-002', 1, 'pickup',
  '{ "street": "Store Torv 4", "city": "Aarhus", "postalCode": "8000", "country": "DK" }'::jsonb,
  '{ "lat": 56.1629, "lng": 10.2039 }'::jsonb,
  NOW() - INTERVAL '3 hours',
  NOW() - INTERVAL '2 hours 45 minutes',
  'Fragile goods — handle with care',
  NULL
),
(
  'stop-002-2-border',
  'route-plan-002', 2, 'border_crossing',
  '{ "street": null, "city": "Flensburg", "postalCode": null, "country": "DK" }'::jsonb,
  '{ "lat": 54.7833, "lng": 9.4333, "label": "DK/DE Border Crossing" }'::jsonb,
  NOW() - INTERVAL '30 minutes',
  NULL,
  'Template stop: border crossing DK/DE',
  '{ "source": "template" }'::jsonb
),
(
  'stop-002-3-hub',
  'route-plan-002', 3, 'hub',
  '{ "street": null, "city": "Hamburg", "postalCode": null, "country": "DE" }'::jsonb,
  '{ "lat": 53.5511, "lng": 9.9937, "label": "Hamburg Relay Hub" }'::jsonb,
  NOW() + INTERVAL '1 hour',
  NULL,
  'Template stop: relay hub',
  '{ "source": "template" }'::jsonb
),
(
  'stop-002-4-delivery',
  'route-plan-002', 4, 'delivery',
  '{ "street": "Unter den Linden 1", "city": "Berlin", "postalCode": "10117", "country": "DE" }'::jsonb,
  '{ "lat": 52.5200, "lng": 13.4050 }'::jsonb,
  NOW() + INTERVAL '6 hours',
  NULL,
  'Receiver available 08:00–18:00',
  NULL
)
ON CONFLICT (stop_id) DO NOTHING;
