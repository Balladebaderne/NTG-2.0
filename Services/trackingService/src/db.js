const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || null,
})

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tracking_events (
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
      notes TEXT,
      idempotency_key TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT tracking_events_status_check
        CHECK (status IN ('booked', 'in_transit', 'received') OR status IS NULL),
      CONSTRAINT tracking_events_event_type_check
        CHECK (event_type IN (
          'tracking_started',
          'picked_up',
          'location_updated',
          'checkpoint_reached',
          'delayed',
          'exception_reported',
          'received'
        )),
      CONSTRAINT tracking_events_location_pair_check
        CHECK (
          (latitude IS NULL AND longitude IS NULL)
          OR
          (latitude IS NOT NULL AND longitude IS NOT NULL)
        )
    )
  `)

  await pool.query(`
    CREATE INDEX IF NOT EXISTS tracking_events_shipment_occurred_idx
      ON tracking_events (shipment_id, occurred_at DESC)
  `)

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS tracking_events_idempotency_idx
      ON tracking_events (shipment_id, idempotency_key)
      WHERE idempotency_key IS NOT NULL
  `)
}

module.exports = {
  pool,
  ensureSchema,
}
