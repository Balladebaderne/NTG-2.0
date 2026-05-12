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
      carrier_id TEXT,
      pod_reference TEXT,
      notes TEXT,
      metadata JSONB,
      idempotency_key TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT tracking_events_status_check
        CHECK (status IN ('booked', 'in_transit', 'received') OR status IS NULL),
      CONSTRAINT tracking_events_event_type_check
        CHECK (event_type IN (
          'shipment_order_created',
          'transport_planned_carrier_assigned',
          'pickup_scheduled',
          'truck_arrived_pickup',
          'goods_loaded_pickup_confirmed',
          'shipment_in_transit',
          'departed_origin_terminal',
          'in_transit_milestone',
          'delay_logged',
          'exception_logged',
          'arrived_destination_terminal',
          'out_for_delivery',
          'truck_arrived_delivery',
          'goods_delivered',
          'pod_confirmed',
          'shipment_completed_closed',
          'location_updated',
          'tracking_started',
          'picked_up',
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

  await pool.query('ALTER TABLE tracking_events ADD COLUMN IF NOT EXISTS carrier_id TEXT')
  await pool.query('ALTER TABLE tracking_events ADD COLUMN IF NOT EXISTS pod_reference TEXT')
  await pool.query('ALTER TABLE tracking_events ADD COLUMN IF NOT EXISTS metadata JSONB')

  await pool.query(`
    ALTER TABLE tracking_events
    DROP CONSTRAINT IF EXISTS tracking_events_event_type_check
  `)

  await pool.query(`
    ALTER TABLE tracking_events
    ADD CONSTRAINT tracking_events_event_type_check
      CHECK (event_type IN (
        'shipment_order_created',
        'transport_planned_carrier_assigned',
        'pickup_scheduled',
        'truck_arrived_pickup',
        'goods_loaded_pickup_confirmed',
        'shipment_in_transit',
        'departed_origin_terminal',
        'in_transit_milestone',
        'delay_logged',
        'exception_logged',
        'arrived_destination_terminal',
        'out_for_delivery',
        'truck_arrived_delivery',
        'goods_delivered',
        'pod_confirmed',
        'shipment_completed_closed',
        'location_updated',
        'tracking_started',
        'picked_up',
        'checkpoint_reached',
        'delayed',
        'exception_reported',
        'received'
      ))
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

  await pool.query('ALTER TABLE tracking_events ADD COLUMN IF NOT EXISTS is_planned BOOLEAN NOT NULL DEFAULT FALSE')
}

module.exports = {
  pool,
  ensureSchema,
}
