const { v4: uuidv4 } = require('uuid')

const config = require('../config')

function serviceError(message, status = 502, details = {}) {
  const err = new Error(message)
  err.status = status
  err.details = details
  return err
}

function buildExternalRouteRequest(routeInput) {
  const waypoints = routeInput.stops
    .filter((s) => s.type !== 'pickup' && s.type !== 'delivery')
    .sort((a, b) => a.sequence - b.sequence)
    .map((s) => ({
      type: s.type,
      address: s.address,
      location: s.location || null,
    }))

  return {
    origin: {
      label: routeInput.origin.label || null,
      address: routeInput.origin.address,
      location: routeInput.origin.location || null,
    },
    destination: {
      label: routeInput.destination.label || null,
      address: routeInput.destination.address,
      location: routeInput.destination.location || null,
    },
    plannedPickupAt: routeInput.plannedPickupAt
      ? routeInput.plannedPickupAt.toISOString()
      : null,
    waypoints,
  }
}

function normalizeResponseStop(stop) {
  return {
    stopId: uuidv4(),
    type: stop.type,
    address: stop.address || { street: null, city: null, postalCode: null, country: null },
    location: stop.location || null,
    plannedArrivalAt: stop.plannedArrivalAt ? new Date(stop.plannedArrivalAt) : null,
    plannedDepartureAt: stop.plannedDepartureAt ? new Date(stop.plannedDepartureAt) : null,
    notes: stop.notes || null,
    metadata: stop.metadata || null,
  }
}

function normalizeExternalRouteResponse(body) {
  const stops = Array.isArray(body.stops) ? body.stops.map(normalizeResponseStop) : []

  const hasGeometry = body.distanceKm != null || body.durationSeconds != null || body.encodedPolyline != null

  const geometry = hasGeometry
    ? {
        provider: 'external_routing',
        calculatedAt: new Date().toISOString(),
        distanceMeters: body.distanceKm != null ? Math.round(body.distanceKm * 1000) : null,
        distanceKm: body.distanceKm != null ? Number(body.distanceKm) : null,
        durationSeconds: body.durationSeconds != null ? Number(body.durationSeconds) : null,
        encodedPolyline: body.encodedPolyline || null,
        polylineEncoding: body.polylineEncoding || null,
        viewport: body.viewport || null,
        warnings: body.warnings || [],
        legs: body.legs || [],
      }
    : null

  return { geometry, stops }
}

async function computeExternalRoute(routeInput, fetchImpl = global.fetch) {
  if (!config.externalRouteProviderUrl) {
    throw serviceError('EXTERNAL_ROUTE_PROVIDER_URL is not configured', 503)
  }

  if (typeof fetchImpl !== 'function') {
    throw serviceError('fetch is not available in this runtime', 500)
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), config.httpTimeoutMs)

  try {
    const response = await fetchImpl(config.externalRouteProviderUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildExternalRouteRequest(routeInput)),
      signal: controller.signal,
    })

    if (!response.ok) {
      let message = `External routing provider responded with status ${response.status}`
      try {
        const body = await response.json()
        if (body && body.error) message = body.error
      } catch { /* ignore */ }
      throw serviceError(message, 502, { provider: 'external_routing', status: response.status })
    }

    return normalizeExternalRouteResponse(await response.json())
  } catch (err) {
    if (err.name === 'AbortError') {
      throw serviceError('External routing provider request timed out', 504, { provider: 'external_routing' })
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }
}

module.exports = {
  buildExternalRouteRequest,
  computeExternalRoute,
  normalizeExternalRouteResponse,
}
