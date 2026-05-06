const { v4: uuidv4 } = require('uuid')

const { pool } = require('../db')

const VALID_EVENT_TYPES = [
  'tracking_started',
  'picked_up',
  'location_updated',
  'checkpoint_reached',
  'delayed',
  'exception_reported',
  'received',
]

const VALID_STATUSES = ['booked', 'in_transit', 'received']

const DEFAULT_STATUS_BY_EVENT = {
  tracking_started: 'booked',
  picked_up: 'in_transit',
  location_updated: 'in_transit',
  checkpoint_reached: 'in_transit',
  received: 'received',
}

const SYNC_STATUS_BY_EVENT = {
  picked_up: 'in_transit',
  received: 'received',
}

function badRequest(message, details = {}) {
  const err = new Error(message)
  err.status = 400
  err.details = details
  return err
}

function normalizeEvent(row) {
  const location = row.latitude === null || row.longitude === null
    ? null
    : {
        lat: row.latitude,
        lng: row.longitude,
        label: row.location_label,
      }

  return {
    trackingEventId: row.tracking_event_id,
    shipmentId: row.shipment_id,
    eventType: row.event_type,
    status: row.status,
    occurredAt: row.occurred_at,
    location,
    routeId: row.route_id,
    driverId: row.driver_id,
    notes: row.notes,
    idempotencyKey: row.idempotency_key,
    createdAt: row.created_at,
  }
}

function validateLocation(location) {
  if (!location || typeof location !== 'object') {
    throw badRequest('location is required')
  }

  if (typeof location.lat !== 'number' || location.lat < -90 || location.lat > 90) {
    throw badRequest('location.lat must be a number between -90 and 90')
  }

  if (typeof location.lng !== 'number' || location.lng < -180 || location.lng > 180) {
    throw badRequest('location.lng must be a number between -180 and 180')
  }
}

function buildEventInput(shipmentId, body) {
  if (!VALID_EVENT_TYPES.includes(body.eventType)) {
    throw badRequest('Invalid eventType', { allowed: VALID_EVENT_TYPES })
  }

  if (body.status && !VALID_STATUSES.includes(body.status)) {
    throw badRequest('Invalid status', { allowed: VALID_STATUSES })
  }

  if (body.eventType === 'location_updated') {
    validateLocation(body.location)
  }

  if (body.location) {
    validateLocation(body.location)
  }

  const milestoneStatus = SYNC_STATUS_BY_EVENT[body.eventType]
  if (milestoneStatus && body.status && body.status !== milestoneStatus) {
    throw badRequest('Tracking event status contradicts lifecycle milestone', {
      eventType: body.eventType,
      expectedStatus: milestoneStatus,
    })
  }

  return {
    trackingEventId: uuidv4(),
    shipmentId,
    eventType: body.eventType,
    status: body.status || DEFAULT_STATUS_BY_EVENT[body.eventType] || null,
    occurredAt: parseOccurredAt(body.occurredAt),
    latitude: body.location ? body.location.lat : null,
    longitude: body.location ? body.location.lng : null,
    locationLabel: body.location ? body.location.label || null : null,
    routeId: body.routeId || null,
    driverId: body.driverId || null,
    notes: body.notes || null,
    idempotencyKey: body.idempotencyKey || null,
  }
}

function parseOccurredAt(value) {
  if (!value) return new Date()

  const occurredAt = new Date(value)
  if (Number.isNaN(occurredAt.getTime())) {
    throw badRequest('occurredAt must be a valid timestamp')
  }

  return occurredAt
}

async function findByIdempotencyKey(shipmentId, idempotencyKey) {
  if (!idempotencyKey) return null

  const result = await pool.query(
    `
      SELECT *
      FROM tracking_events
      WHERE shipment_id = $1 AND idempotency_key = $2
      LIMIT 1
    `,
    [shipmentId, idempotencyKey]
  )

  return result.rows[0] ? normalizeEvent(result.rows[0]) : null
}

async function create(input) {
  const existing = await findByIdempotencyKey(input.shipmentId, input.idempotencyKey)
  if (existing) return { event: existing, duplicate: true }

  try {
    const result = await pool.query(
      `
        INSERT INTO tracking_events (
          tracking_event_id,
          shipment_id,
          event_type,
          status,
          occurred_at,
          latitude,
          longitude,
          location_label,
          route_id,
          driver_id,
          notes,
          idempotency_key
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `,
      [
        input.trackingEventId,
        input.shipmentId,
        input.eventType,
        input.status,
        input.occurredAt,
        input.latitude,
        input.longitude,
        input.locationLabel,
        input.routeId,
        input.driverId,
        input.notes,
        input.idempotencyKey,
      ]
    )

    return { event: normalizeEvent(result.rows[0]), duplicate: false }
  } catch (err) {
    if (err.code === '23505') {
      const duplicate = await findByIdempotencyKey(input.shipmentId, input.idempotencyKey)
      if (duplicate) return { event: duplicate, duplicate: true }
    }
    throw err
  }
}

async function listByShipment(shipmentId, { limit = 100, order = 'asc' } = {}) {
  const direction = order === 'desc' ? 'DESC' : 'ASC'
  const result = await pool.query(
    `
      SELECT *
      FROM tracking_events
      WHERE shipment_id = $1
      ORDER BY occurred_at ${direction}, created_at ${direction}
      LIMIT $2
    `,
    [shipmentId, limit]
  )

  return result.rows.map(normalizeEvent)
}

async function latestForShipment(shipmentId) {
  const result = await pool.query(
    `
      SELECT *
      FROM tracking_events
      WHERE shipment_id = $1
      ORDER BY occurred_at DESC, created_at DESC
      LIMIT 1
    `,
    [shipmentId]
  )

  return result.rows[0] ? normalizeEvent(result.rows[0]) : null
}

async function latestLocationForShipment(shipmentId) {
  const result = await pool.query(
    `
      SELECT *
      FROM tracking_events
      WHERE shipment_id = $1
        AND latitude IS NOT NULL
        AND longitude IS NOT NULL
      ORDER BY occurred_at DESC, created_at DESC
      LIMIT 1
    `,
    [shipmentId]
  )

  return result.rows[0] ? normalizeEvent(result.rows[0]) : null
}

async function countByShipment(shipmentId) {
  const result = await pool.query(
    `
      SELECT COUNT(*)::int AS count
      FROM tracking_events
      WHERE shipment_id = $1
    `,
    [shipmentId]
  )

  return result.rows[0].count
}

async function summaryForShipment(shipmentId) {
  const [latestEvent, latestLocation, eventCount] = await Promise.all([
    latestForShipment(shipmentId),
    latestLocationForShipment(shipmentId),
    countByShipment(shipmentId),
  ])

  return {
    shipmentId,
    status: latestEvent ? latestEvent.status : null,
    latestLocation: latestLocation ? latestLocation.location : null,
    lastUpdatedAt: latestEvent ? latestEvent.occurredAt : null,
    latestEvent: latestEvent
      ? {
          trackingEventId: latestEvent.trackingEventId,
          eventType: latestEvent.eventType,
        }
      : null,
    eventCount,
  }
}

module.exports = {
  SYNC_STATUS_BY_EVENT,
  buildEventInput,
  create,
  listByShipment,
  summaryForShipment,
}
