const { v4: uuidv4 } = require('uuid')

const { pool } = require('../db')

const SHIPMENT_LIFECYCLE_STATUSES = ['booked', 'in_transit', 'received']

const EVENT_DEFINITIONS = {
  shipment_order_created: {
    label: 'Shipment order created',
    order: 10,
    shipmentStatus: 'booked',
    required: true,
  },
  transport_planned_carrier_assigned: {
    label: 'Transport planned and carrier assigned',
    order: 20,
    shipmentStatus: 'booked',
    required: true,
  },
  pickup_scheduled: {
    label: 'Pickup scheduled',
    order: 30,
    shipmentStatus: 'booked',
    required: true,
  },
  truck_arrived_pickup: {
    label: 'Truck arrives at pickup location',
    order: 40,
    shipmentStatus: 'booked',
    required: true,
  },
  goods_loaded_pickup_confirmed: {
    label: 'Goods loaded and pickup confirmed',
    order: 50,
    shipmentStatus: 'in_transit',
    syncStatus: 'in_transit',
    required: true,
  },
  shipment_in_transit: {
    label: 'Shipment in transit',
    order: 60,
    shipmentStatus: 'in_transit',
    syncStatus: 'in_transit',
    required: true,
  },
  departed_origin_terminal: {
    label: 'Departure from origin terminal',
    order: 70,
    shipmentStatus: 'in_transit',
    optional: true,
  },
  in_transit_milestone: {
    label: 'In transit milestone update',
    order: 80,
    shipmentStatus: 'in_transit',
    optional: true,
    repeatable: true,
  },
  delay_logged: {
    label: 'Delay logged',
    shipmentStatus: null,
    sideEvent: true,
    minOrder: 10,
  },
  exception_logged: {
    label: 'Exception logged',
    shipmentStatus: null,
    sideEvent: true,
    minOrder: 10,
  },
  arrived_destination_terminal: {
    label: 'Arrival at destination terminal',
    order: 90,
    shipmentStatus: 'in_transit',
    optional: true,
  },
  out_for_delivery: {
    label: 'Out for delivery',
    order: 100,
    shipmentStatus: 'in_transit',
    required: true,
  },
  truck_arrived_delivery: {
    label: 'Truck arrives at delivery location',
    order: 110,
    shipmentStatus: 'in_transit',
    required: true,
  },
  goods_delivered: {
    label: 'Goods delivered',
    order: 120,
    shipmentStatus: 'received',
    syncStatus: 'received',
    required: true,
  },
  pod_confirmed: {
    label: 'Proof of Delivery (POD) confirmed',
    order: 130,
    shipmentStatus: 'received',
    syncStatus: 'received',
    required: true,
  },
  shipment_completed_closed: {
    label: 'Shipment completed and closed',
    order: 140,
    shipmentStatus: 'received',
    syncStatus: 'received',
    required: true,
    terminal: true,
  },

  // Kept for GPS pings and old clients. It records telemetry without advancing
  // the operational milestone flow.
  location_updated: {
    label: 'Location updated',
    shipmentStatus: null,
    sideEvent: true,
    minOrder: 50,
  },
}

const LEGACY_EVENT_TYPE_ALIASES = {
  tracking_started: 'shipment_order_created',
  picked_up: 'goods_loaded_pickup_confirmed',
  checkpoint_reached: 'in_transit_milestone',
  delayed: 'delay_logged',
  exception_reported: 'exception_logged',
  received: 'goods_delivered',
}

const HUMAN_EVENT_TYPE_ALIASES = {
  shipment_order_created: 'shipment_order_created',
  transport_planned_and_carrier_assigned: 'transport_planned_carrier_assigned',
  transport_planned_carrier_assigned: 'transport_planned_carrier_assigned',
  pickup_scheduled: 'pickup_scheduled',
  truck_arrives_at_pickup_location: 'truck_arrived_pickup',
  truck_arrived_at_pickup_location: 'truck_arrived_pickup',
  truck_arrived_pickup: 'truck_arrived_pickup',
  goods_loaded_and_pickup_confirmed: 'goods_loaded_pickup_confirmed',
  goods_loaded_pickup_confirmed: 'goods_loaded_pickup_confirmed',
  shipment_in_transit: 'shipment_in_transit',
  departure_from_origin_terminal: 'departed_origin_terminal',
  departed_origin_terminal: 'departed_origin_terminal',
  in_transit_milestone_updates_e_g_border_crossing_hub_arrival: 'in_transit_milestone',
  in_transit_milestone_update: 'in_transit_milestone',
  in_transit_milestone_updates: 'in_transit_milestone',
  in_transit_milestone: 'in_transit_milestone',
  delay_logged: 'delay_logged',
  exception_logged: 'exception_logged',
  arrival_at_destination_terminal: 'arrived_destination_terminal',
  arrived_destination_terminal: 'arrived_destination_terminal',
  out_for_delivery: 'out_for_delivery',
  truck_arrives_at_delivery_location: 'truck_arrived_delivery',
  truck_arrived_at_delivery_location: 'truck_arrived_delivery',
  truck_arrived_delivery: 'truck_arrived_delivery',
  goods_delivered: 'goods_delivered',
  proof_of_delivery_pod_confirmed: 'pod_confirmed',
  pod_confirmed: 'pod_confirmed',
  shipment_completed_and_closed: 'shipment_completed_closed',
  shipment_completed_closed: 'shipment_completed_closed',
  location_updated: 'location_updated',
}

const VALID_EVENT_TYPES = Object.keys(EVENT_DEFINITIONS)
const ACCEPTED_EVENT_TYPES = [
  ...VALID_EVENT_TYPES,
  ...Object.keys(LEGACY_EVENT_TYPE_ALIASES),
]
const REQUIRED_FLOW_EVENTS = VALID_EVENT_TYPES
  .map((eventType) => ({ eventType, ...EVENT_DEFINITIONS[eventType] }))
  .filter((definition) => definition.required)
  .sort((a, b) => a.order - b.order)
const TERMINAL_ORDER = EVENT_DEFINITIONS.shipment_completed_closed.order
const SYNC_STATUS_BY_EVENT = Object.fromEntries(
  VALID_EVENT_TYPES
    .filter((eventType) => EVENT_DEFINITIONS[eventType].syncStatus)
    .map((eventType) => [eventType, EVENT_DEFINITIONS[eventType].syncStatus])
)

function badRequest(message, details = {}) {
  const err = new Error(message)
  err.status = 400
  err.details = details
  return err
}

function eventTypeKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function toCanonicalEventType(eventType) {
  if (!eventType) return null
  if (EVENT_DEFINITIONS[eventType]) return eventType
  if (LEGACY_EVENT_TYPE_ALIASES[eventType]) return LEGACY_EVENT_TYPE_ALIASES[eventType]

  const key = eventTypeKey(eventType)
  return HUMAN_EVENT_TYPE_ALIASES[key] || LEGACY_EVENT_TYPE_ALIASES[key] || null
}

function normalizeEventType(eventType) {
  const canonicalEventType = toCanonicalEventType(eventType)
  if (!canonicalEventType) {
    throw badRequest('Invalid eventType', { allowed: VALID_EVENT_TYPES })
  }

  return canonicalEventType
}

function eventDefinitionFor(eventType) {
  return EVENT_DEFINITIONS[toCanonicalEventType(eventType)]
}

function normalizeEvent(row) {
  const canonicalEventType = toCanonicalEventType(row.event_type) || row.event_type
  const definition = EVENT_DEFINITIONS[canonicalEventType] || {}
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
    shipmentNumber: row.shipment_id,
    eventType: row.event_type,
    canonicalEventType,
    eventLabel: definition.label || row.event_type,
    eventOrder: definition.order || null,
    status: row.status,
    shipmentLifecycleStatus: row.status,
    occurredAt: row.occurred_at,
    location,
    routeId: row.route_id,
    driverId: row.driver_id,
    carrierId: row.carrier_id || null,
    podReference: row.pod_reference || null,
    notes: row.notes,
    metadata: row.metadata || null,
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

function validateMetadata(metadata) {
  if (metadata === undefined || metadata === null) return null
  if (typeof metadata !== 'object' || Array.isArray(metadata)) {
    throw badRequest('metadata must be an object')
  }

  return metadata
}

function optionalString(value) {
  if (value === undefined || value === null || value === '') return null
  return String(value)
}

function parseOccurredAt(value) {
  if (!value) return new Date()

  const occurredAt = new Date(value)
  if (Number.isNaN(occurredAt.getTime())) {
    throw badRequest('occurredAt must be a valid timestamp')
  }

  return occurredAt
}

function buildEventInput(shipmentId, body = {}) {
  const eventType = normalizeEventType(body.eventType)
  const definition = EVENT_DEFINITIONS[eventType]

  if (body.status && !SHIPMENT_LIFECYCLE_STATUSES.includes(body.status)) {
    throw badRequest('Invalid status', { allowed: SHIPMENT_LIFECYCLE_STATUSES })
  }

  if (eventType === 'location_updated') {
    validateLocation(body.location)
  }

  if (body.location) {
    validateLocation(body.location)
  }

  if (definition.shipmentStatus && body.status && body.status !== definition.shipmentStatus) {
    throw badRequest('Tracking event status contradicts lifecycle milestone', {
      eventType,
      expectedStatus: definition.shipmentStatus,
    })
  }

  return {
    trackingEventId: uuidv4(),
    shipmentId,
    eventType,
    status: body.status || definition.shipmentStatus || null,
    occurredAt: parseOccurredAt(body.occurredAt),
    latitude: body.location ? body.location.lat : null,
    longitude: body.location ? body.location.lng : null,
    locationLabel: body.location ? body.location.label || null : null,
    routeId: optionalString(body.routeId),
    driverId: optionalString(body.driverId),
    carrierId: optionalString(body.carrierId),
    podReference: optionalString(body.podReference || body.podId),
    notes: optionalString(body.notes),
    metadata: validateMetadata(body.metadata),
    idempotencyKey: optionalString(body.idempotencyKey),
  }
}

function eventTypeFromEvent(event) {
  return event.canonicalEventType || event.eventType || event.event_type
}

function highestProgressOrder(events) {
  return events.reduce((highest, event) => {
    const definition = eventDefinitionFor(eventTypeFromEvent(event))
    if (!definition || definition.sideEvent || !definition.order) return highest
    return Math.max(highest, definition.order)
  }, 0)
}

function validateFlowTransition(existingEvents, input) {
  const nextDefinition = eventDefinitionFor(input.eventType)
  if (!nextDefinition) {
    throw badRequest('Invalid eventType', { allowed: VALID_EVENT_TYPES })
  }

  const latestOrder = highestProgressOrder(existingEvents)

  if (latestOrder >= TERMINAL_ORDER) {
    throw badRequest('Shipment tracking flow is already completed and closed')
  }

  if (nextDefinition.sideEvent) {
    if (!latestOrder) {
      throw badRequest(`${nextDefinition.label} cannot be the first tracking event`)
    }

    if (nextDefinition.minOrder && latestOrder < nextDefinition.minOrder) {
      const requiredEvent = REQUIRED_FLOW_EVENTS.find((definition) => definition.order === nextDefinition.minOrder)
      throw badRequest(`${nextDefinition.label} cannot be recorded before ${requiredEvent.label}`)
    }

    return
  }

  if (!latestOrder) {
    const firstRequired = REQUIRED_FLOW_EVENTS[0]
    if (nextDefinition.order !== firstRequired.order) {
      throw badRequest(`Tracking flow must start with ${firstRequired.label}`, {
        expectedEventType: firstRequired.eventType,
      })
    }

    return
  }

  if (nextDefinition.order < latestOrder) {
    throw badRequest('Tracking event cannot move the shipment flow backwards', {
      currentOrder: latestOrder,
      attemptedOrder: nextDefinition.order,
    })
  }

  if (nextDefinition.order === latestOrder) {
    if (nextDefinition.repeatable) return

    throw badRequest('Tracking event has already been recorded for the current flow stage', {
      eventType: input.eventType,
    })
  }

  const skippedRequired = REQUIRED_FLOW_EVENTS.find(
    (definition) => definition.order > latestOrder && definition.order < nextDefinition.order
  )
  if (skippedRequired) {
    throw badRequest(`Tracking flow cannot skip ${skippedRequired.label}`, {
      expectedEventType: skippedRequired.eventType,
    })
  }
}

async function listFlowEvents(shipmentId) {
  const result = await pool.query(
    `
      SELECT event_type
      FROM tracking_events
      WHERE shipment_id = $1
    `,
    [shipmentId]
  )

  return result.rows.map((row) => ({ eventType: row.event_type }))
}

async function validateShipmentFlow(shipmentId, input) {
  const existingEvents = await listFlowEvents(shipmentId)
  validateFlowTransition(existingEvents, input)
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

  await validateShipmentFlow(input.shipmentId, input)

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
          carrier_id,
          pod_reference,
          notes,
          metadata,
          idempotency_key
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
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
        input.carrierId,
        input.podReference,
        input.notes,
        input.metadata === null ? null : JSON.stringify(input.metadata),
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

async function latestLifecycleStatusForShipment(shipmentId) {
  const result = await pool.query(
    `
      SELECT *
      FROM tracking_events
      WHERE shipment_id = $1
        AND status IS NOT NULL
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

function currentEventSummary(event) {
  if (!event) return null

  return {
    trackingEventId: event.trackingEventId,
    eventType: event.canonicalEventType,
    eventLabel: event.eventLabel,
    status: event.canonicalEventType,
    shipmentLifecycleStatus: event.shipmentLifecycleStatus,
    occurredAt: event.occurredAt,
    location: event.location,
  }
}

async function summaryForShipment(shipmentId) {
  const [latestEvent, latestLocation, latestLifecycleEvent, eventCount] = await Promise.all([
    latestForShipment(shipmentId),
    latestLocationForShipment(shipmentId),
    latestLifecycleStatusForShipment(shipmentId),
    countByShipment(shipmentId),
  ])
  const currentEvent = currentEventSummary(latestEvent)

  return {
    shipmentId,
    shipmentNumber: shipmentId,
    status: latestLifecycleEvent ? latestLifecycleEvent.status : null,
    shipmentLifecycleStatus: latestLifecycleEvent ? latestLifecycleEvent.status : null,
    trackingStatus: currentEvent ? currentEvent.status : null,
    trackingStatusLabel: currentEvent ? currentEvent.eventLabel : null,
    latestLocation: latestLocation ? latestLocation.location : null,
    lastUpdatedAt: latestEvent ? latestEvent.occurredAt : null,
    currentEvent,
    latestEvent: latestEvent
      ? {
          trackingEventId: latestEvent.trackingEventId,
          eventType: latestEvent.canonicalEventType,
          eventLabel: latestEvent.eventLabel,
          occurredAt: latestEvent.occurredAt,
        }
      : null,
    eventCount,
  }
}

async function statusHistoryForShipment(shipmentId, { limit = 100, order = 'asc' } = {}) {
  const [summary, history] = await Promise.all([
    summaryForShipment(shipmentId),
    listByShipment(shipmentId, { limit, order }),
  ])

  return {
    shipmentId,
    shipmentNumber: shipmentId,
    status: summary.trackingStatus,
    statusLabel: summary.trackingStatusLabel,
    currentEvent: summary.currentEvent,
    shipmentLifecycleStatus: summary.shipmentLifecycleStatus,
    latestLocation: summary.latestLocation,
    lastUpdatedAt: summary.lastUpdatedAt,
    eventCount: summary.eventCount,
    history,
  }
}

module.exports = {
  ACCEPTED_EVENT_TYPES,
  EVENT_DEFINITIONS,
  SYNC_STATUS_BY_EVENT,
  VALID_EVENT_TYPES,
  buildEventInput,
  create,
  listByShipment,
  statusHistoryForShipment,
  summaryForShipment,
  validateFlowTransition,
}
