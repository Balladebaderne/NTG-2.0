const { v4: uuidv4 } = require('uuid')

const { pool } = require('../db')

const VALID_ROUTE_STATUSES = ['planned', 'active', 'completed', 'cancelled']
const VALID_STOP_TYPES = [
  'pickup',
  'origin_terminal',
  'hub',
  'border_crossing',
  'destination_terminal',
  'delivery',
  'other',
]

function badRequest(message, details = {}) {
  const err = new Error(message)
  err.status = 400
  err.details = details
  return err
}

function optionalString(value) {
  if (value === undefined || value === null || value === '') return null
  return String(value)
}

function parseTimestamp(value, fieldName) {
  if (!value) return null

  const timestamp = new Date(value)
  if (Number.isNaN(timestamp.getTime())) {
    throw badRequest(`${fieldName} must be a valid timestamp`)
  }

  return timestamp
}

function validateMetadata(metadata, fieldName = 'metadata') {
  if (metadata === undefined || metadata === null) return null
  if (typeof metadata !== 'object' || Array.isArray(metadata)) {
    throw badRequest(`${fieldName} must be an object`)
  }

  return metadata
}

function validateRouteGeometry(routeGeometry) {
  if (routeGeometry === undefined || routeGeometry === null) return null
  if (typeof routeGeometry !== 'object' || Array.isArray(routeGeometry)) {
    throw badRequest('routeGeometry must be an object')
  }

  if (routeGeometry.encodedPolyline !== undefined && typeof routeGeometry.encodedPolyline !== 'string') {
    throw badRequest('routeGeometry.encodedPolyline must be a string')
  }

  if (routeGeometry.polylineEncoding !== undefined && typeof routeGeometry.polylineEncoding !== 'string') {
    throw badRequest('routeGeometry.polylineEncoding must be a string')
  }

  return routeGeometry
}

function validateLocation(location, fieldName = 'location') {
  if (location === undefined || location === null) return null
  if (typeof location !== 'object' || Array.isArray(location)) {
    throw badRequest(`${fieldName} must be an object`)
  }

  if (typeof location.lat !== 'number' || location.lat < -90 || location.lat > 90) {
    throw badRequest(`${fieldName}.lat must be a number between -90 and 90`)
  }

  if (typeof location.lng !== 'number' || location.lng < -180 || location.lng > 180) {
    throw badRequest(`${fieldName}.lng must be a number between -180 and 180`)
  }

  return {
    lat: location.lat,
    lng: location.lng,
    label: optionalString(location.label),
  }
}

function normalizeAddress(address, fieldName = 'address') {
  if (!address || typeof address !== 'object' || Array.isArray(address)) {
    throw badRequest(`${fieldName} is required`)
  }

  const normalized = {
    street: optionalString(address.street),
    city: optionalString(address.city),
    postalCode: optionalString(address.postalCode),
    country: optionalString(address.country),
  }

  if (!normalized.city || !normalized.country) {
    throw badRequest(`${fieldName}.city and ${fieldName}.country are required`)
  }

  return normalized
}

function normalizeEndpoint(endpoint, fieldName) {
  if (!endpoint || typeof endpoint !== 'object' || Array.isArray(endpoint)) {
    throw badRequest(`${fieldName} is required`)
  }

  return {
    label: optionalString(endpoint.label),
    address: normalizeAddress(endpoint.address, `${fieldName}.address`),
    location: validateLocation(endpoint.location, `${fieldName}.location`),
    contactName: optionalString(endpoint.contactName),
    contactPhone: optionalString(endpoint.contactPhone),
    instructions: optionalString(endpoint.instructions),
  }
}

function normalizeStop(stop, index) {
  if (!stop || typeof stop !== 'object' || Array.isArray(stop)) {
    throw badRequest(`stops[${index}] must be an object`)
  }

  const type = optionalString(stop.type)
  if (!VALID_STOP_TYPES.includes(type)) {
    throw badRequest(`stops[${index}].type is invalid`, { allowed: VALID_STOP_TYPES })
  }

  const sequence = Number(stop.sequence || index + 1)
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw badRequest(`stops[${index}].sequence must be a positive integer`)
  }

  return {
    stopId: optionalString(stop.stopId) || uuidv4(),
    sequence,
    type,
    address: normalizeAddress(stop.address, `stops[${index}].address`),
    location: validateLocation(stop.location, `stops[${index}].location`),
    plannedArrivalAt: parseTimestamp(stop.plannedArrivalAt, `stops[${index}].plannedArrivalAt`),
    plannedDepartureAt: parseTimestamp(stop.plannedDepartureAt, `stops[${index}].plannedDepartureAt`),
    notes: optionalString(stop.notes),
    metadata: validateMetadata(stop.metadata, `stops[${index}].metadata`),
  }
}

function defaultStopsFromEndpoints(origin, destination, body) {
  return [
    {
      stopId: uuidv4(),
      sequence: 1,
      type: 'pickup',
      address: origin.address,
      location: origin.location,
      plannedArrivalAt: parseTimestamp(body.plannedPickupAt, 'plannedPickupAt'),
      plannedDepartureAt: null,
      notes: origin.instructions,
      metadata: null,
    },
    {
      stopId: uuidv4(),
      sequence: 2,
      type: 'delivery',
      address: destination.address,
      location: destination.location,
      plannedArrivalAt: parseTimestamp(body.plannedDeliveryAt || body.estimatedArrivalAt, 'plannedDeliveryAt'),
      plannedDepartureAt: null,
      notes: destination.instructions,
      metadata: null,
    },
  ]
}

function validateStops(stops) {
  if (!Array.isArray(stops) || stops.length < 2) {
    throw badRequest('stops must contain at least pickup and delivery stops')
  }

  const sequences = new Set()
  for (const stop of stops) {
    if (sequences.has(stop.sequence)) {
      throw badRequest('stops.sequence values must be unique')
    }
    sequences.add(stop.sequence)

    if (stop.plannedArrivalAt && stop.plannedDepartureAt && stop.plannedDepartureAt < stop.plannedArrivalAt) {
      throw badRequest('stop plannedDepartureAt cannot be before plannedArrivalAt', {
        stopId: stop.stopId,
      })
    }
  }

  if (!stops.some((stop) => stop.type === 'pickup')) {
    throw badRequest('stops must contain a pickup stop')
  }

  if (!stops.some((stop) => stop.type === 'delivery')) {
    throw badRequest('stops must contain a delivery stop')
  }

  return stops.sort((a, b) => a.sequence - b.sequence)
}

function buildRouteInput(body = {}, existingRouteId = null) {
  const shipmentId = optionalString(body.shipmentId)
  if (!shipmentId) {
    throw badRequest('shipmentId is required')
  }

  const status = optionalString(body.status) || 'planned'
  if (!VALID_ROUTE_STATUSES.includes(status)) {
    throw badRequest('Invalid route status', { allowed: VALID_ROUTE_STATUSES })
  }

  const origin = normalizeEndpoint(body.origin, 'origin')
  const destination = normalizeEndpoint(body.destination, 'destination')
  const plannedPickupAt = parseTimestamp(body.plannedPickupAt, 'plannedPickupAt')
  const plannedDeliveryAt = parseTimestamp(body.plannedDeliveryAt, 'plannedDeliveryAt')
  const estimatedArrivalAt = parseTimestamp(body.estimatedArrivalAt, 'estimatedArrivalAt')

  if (plannedPickupAt && plannedDeliveryAt && plannedDeliveryAt < plannedPickupAt) {
    throw badRequest('plannedDeliveryAt cannot be before plannedPickupAt')
  }

  if (plannedPickupAt && estimatedArrivalAt && estimatedArrivalAt < plannedPickupAt) {
    throw badRequest('estimatedArrivalAt cannot be before plannedPickupAt')
  }

  const distanceKm = body.distanceKm === undefined || body.distanceKm === null
    ? null
    : Number(body.distanceKm)
  if (distanceKm !== null && (!Number.isFinite(distanceKm) || distanceKm < 0)) {
    throw badRequest('distanceKm must be a non-negative number')
  }

  const durationSeconds = body.durationSeconds === undefined || body.durationSeconds === null
    ? null
    : Number(body.durationSeconds)
  if (durationSeconds !== null && (!Number.isInteger(durationSeconds) || durationSeconds < 0)) {
    throw badRequest('durationSeconds must be a non-negative integer')
  }

  const stops = Array.isArray(body.stops) && body.stops.length > 0
    ? body.stops.map(normalizeStop)
    : defaultStopsFromEndpoints(origin, destination, body)

  return {
    routeId: existingRouteId || optionalString(body.routeId) || uuidv4(),
    shipmentId,
    status,
    origin,
    destination,
    plannedPickupAt,
    plannedDeliveryAt,
    estimatedArrivalAt,
    assignedDriverId: optionalString(body.assignedDriverId || body.driverId),
    carrierId: optionalString(body.carrierId),
    distanceKm,
    durationSeconds,
    routeGeometry: validateRouteGeometry(body.routeGeometry),
    metadata: validateMetadata(body.metadata),
    stops: validateStops(stops),
  }
}

function parseJsonColumn(value) {
  if (typeof value === 'string') return JSON.parse(value)
  return value
}

function normalizeRoute(row, stops = []) {
  return {
    routeId: row.route_id,
    shipmentId: row.shipment_id,
    status: row.status,
    origin: parseJsonColumn(row.origin),
    destination: parseJsonColumn(row.destination),
    plannedPickupAt: row.planned_pickup_at,
    plannedDeliveryAt: row.planned_delivery_at,
    estimatedArrivalAt: row.estimated_arrival_at,
    assignedDriverId: row.assigned_driver_id,
    carrierId: row.carrier_id,
    distanceKm: row.distance_km,
    durationSeconds: row.duration_seconds,
    routeGeometry: row.route_geometry ? parseJsonColumn(row.route_geometry) : null,
    metadata: row.metadata ? parseJsonColumn(row.metadata) : null,
    stops,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function normalizeStopRow(row) {
  return {
    stopId: row.stop_id,
    routeId: row.route_id,
    sequence: row.sequence,
    type: row.type,
    address: parseJsonColumn(row.address),
    location: row.location ? parseJsonColumn(row.location) : null,
    plannedArrivalAt: row.planned_arrival_at,
    plannedDepartureAt: row.planned_departure_at,
    actualArrivalAt: row.actual_arrival_at || null,
    notes: row.notes,
    metadata: row.metadata ? parseJsonColumn(row.metadata) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function loadStops(routeId, client = pool) {
  const result = await client.query(
    `
      SELECT *
      FROM route_stops
      WHERE route_id = $1
      ORDER BY sequence ASC
    `,
    [routeId]
  )

  return result.rows.map(normalizeStopRow)
}

async function insertStops(client, routeId, stops) {
  for (const stop of stops) {
    await client.query(
      `
        INSERT INTO route_stops (
          stop_id,
          route_id,
          sequence,
          type,
          address,
          location,
          planned_arrival_at,
          planned_departure_at,
          notes,
          metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `,
      [
        stop.stopId,
        routeId,
        stop.sequence,
        stop.type,
        JSON.stringify(stop.address),
        stop.location ? JSON.stringify(stop.location) : null,
        stop.plannedArrivalAt,
        stop.plannedDepartureAt,
        stop.notes,
        stop.metadata ? JSON.stringify(stop.metadata) : null,
      ]
    )
  }
}

async function create(input) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const result = await client.query(
      `
        INSERT INTO route_plans (
          route_id,
          shipment_id,
          status,
          origin,
          destination,
          planned_pickup_at,
          planned_delivery_at,
          estimated_arrival_at,
          assigned_driver_id,
          carrier_id,
          distance_km,
          duration_seconds,
          route_geometry,
          metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `,
      [
        input.routeId,
        input.shipmentId,
        input.status,
        JSON.stringify(input.origin),
        JSON.stringify(input.destination),
        input.plannedPickupAt,
        input.plannedDeliveryAt,
        input.estimatedArrivalAt,
        input.assignedDriverId,
        input.carrierId,
        input.distanceKm,
        input.durationSeconds,
        input.routeGeometry ? JSON.stringify(input.routeGeometry) : null,
        input.metadata ? JSON.stringify(input.metadata) : null,
      ]
    )

    await insertStops(client, input.routeId, input.stops)
    const stops = await loadStops(input.routeId, client)
    await client.query('COMMIT')

    return normalizeRoute(result.rows[0], stops)
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

async function findById(routeId) {
  const result = await pool.query(
    `
      SELECT *
      FROM route_plans
      WHERE route_id = $1
      LIMIT 1
    `,
    [routeId]
  )

  if (!result.rows[0]) return null
  return normalizeRoute(result.rows[0], await loadStops(routeId))
}

async function list({ shipmentId, status, limit = 100 } = {}) {
  const filters = []
  const params = []

  if (shipmentId) {
    params.push(shipmentId)
    filters.push(`shipment_id = $${params.length}`)
  }

  if (status) {
    if (!VALID_ROUTE_STATUSES.includes(status)) {
      throw badRequest('Invalid route status', { allowed: VALID_ROUTE_STATUSES })
    }
    params.push(status)
    filters.push(`status = $${params.length}`)
  }

  params.push(limit)
  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : ''
  const result = await pool.query(
    `
      SELECT *
      FROM route_plans
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${params.length}
    `,
    params
  )

  const routes = []
  for (const row of result.rows) {
    routes.push(normalizeRoute(row, await loadStops(row.route_id)))
  }
  return routes
}

async function update(routeId, input) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const result = await client.query(
      `
        UPDATE route_plans
        SET
          shipment_id = $2,
          status = $3,
          origin = $4,
          destination = $5,
          planned_pickup_at = $6,
          planned_delivery_at = $7,
          estimated_arrival_at = $8,
          assigned_driver_id = $9,
          carrier_id = $10,
          distance_km = $11,
          duration_seconds = $12,
          route_geometry = $13,
          metadata = $14,
          updated_at = NOW()
        WHERE route_id = $1
        RETURNING *
      `,
      [
        routeId,
        input.shipmentId,
        input.status,
        JSON.stringify(input.origin),
        JSON.stringify(input.destination),
        input.plannedPickupAt,
        input.plannedDeliveryAt,
        input.estimatedArrivalAt,
        input.assignedDriverId,
        input.carrierId,
        input.distanceKm,
        input.durationSeconds,
        input.routeGeometry ? JSON.stringify(input.routeGeometry) : null,
        input.metadata ? JSON.stringify(input.metadata) : null,
      ]
    )

    if (!result.rows[0]) {
      await client.query('ROLLBACK')
      return null
    }

    await client.query('DELETE FROM route_stops WHERE route_id = $1', [routeId])
    await insertStops(client, routeId, input.stops)
    const stops = await loadStops(routeId, client)
    await client.query('COMMIT')

    return normalizeRoute(result.rows[0], stops)
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

async function remove(routeId) {
  const result = await pool.query(
    `
      DELETE FROM route_plans
      WHERE route_id = $1
      RETURNING route_id
    `,
    [routeId]
  )

  return result.rows[0] || null
}

async function confirmStop(routeId, stopId, actualArrivalAt) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const stopResult = await client.query(
      `
        UPDATE route_stops
        SET actual_arrival_at = $1, updated_at = NOW()
        WHERE stop_id = $2 AND route_id = $3
        RETURNING *
      `,
      [actualArrivalAt, stopId, routeId]
    )

    if (!stopResult.rows[0]) {
      await client.query('ROLLBACK')
      return null
    }

    const stop = normalizeStopRow(stopResult.rows[0])

    const routeResult = await client.query(
      `SELECT * FROM route_plans WHERE route_id = $1 LIMIT 1`,
      [routeId]
    )

    if (!routeResult.rows[0]) {
      await client.query('ROLLBACK')
      return null
    }

    const route = routeResult.rows[0]
    const plannedArrivalAt = stop.plannedArrivalAt ? new Date(stop.plannedArrivalAt) : null
    const confirmedAt = new Date(actualArrivalAt)

    let newEstimatedArrivalAt = route.estimated_arrival_at
    if (plannedArrivalAt && route.estimated_arrival_at) {
      const deltaMs = confirmedAt.getTime() - plannedArrivalAt.getTime()
      newEstimatedArrivalAt = new Date(new Date(route.estimated_arrival_at).getTime() + deltaMs)
    }

    let newStatus = route.status
    if (route.status === 'planned') newStatus = 'active'
    if (stop.type === 'delivery') newStatus = 'completed'

    const updatedRoute = await client.query(
      `
        UPDATE route_plans
        SET estimated_arrival_at = $2, status = $3, updated_at = NOW()
        WHERE route_id = $1
        RETURNING *
      `,
      [routeId, newEstimatedArrivalAt, newStatus]
    )

    const stops = await loadStops(routeId, client)
    await client.query('COMMIT')

    return normalizeRoute(updatedRoute.rows[0], stops)
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

module.exports = {
  VALID_ROUTE_STATUSES,
  VALID_STOP_TYPES,
  buildRouteInput,
  confirmStop,
  create,
  findById,
  list,
  remove,
  update,
}
