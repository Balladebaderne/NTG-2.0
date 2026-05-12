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

-- No sample routes or stops — tables start empty.