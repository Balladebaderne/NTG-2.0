const config = require('../config')

const FIELD_MASK = [
  'routes.duration',
  'routes.staticDuration',
  'routes.distanceMeters',
  'routes.polyline.encodedPolyline',
  'routes.legs.distanceMeters',
  'routes.legs.duration',
  'routes.viewport',
  'routes.warnings',
].join(',')

function serviceError(message, status = 502, details = {}) {
  const err = new Error(message)
  err.status = status
  err.details = details
  return err
}

function formatAddress(address = {}) {
  const cityLine = [address.postalCode, address.city].filter(Boolean).join(' ')
  return [address.street, cityLine, address.country].filter(Boolean).join(', ')
}

function waypointFromPlace(place) {
  if (place.location) {
    return {
      location: {
        latLng: {
          latitude: place.location.lat,
          longitude: place.location.lng,
        },
      },
    }
  }

  return {
    address: formatAddress(place.address),
  }
}

function intermediateStops(routeInput) {
  const stops = [...routeInput.stops].sort((a, b) => a.sequence - b.sequence)
  return stops.slice(1, -1).map(waypointFromPlace)
}

function isFutureTimestamp(timestamp) {
  return timestamp.getTime() > Date.now()
}

function buildGoogleRoutesRequest(routeInput) {
  const body = {
    origin: waypointFromPlace(routeInput.origin),
    destination: waypointFromPlace(routeInput.destination),
    travelMode: 'DRIVE',
    routingPreference: 'TRAFFIC_AWARE',
    polylineQuality: 'OVERVIEW',
    polylineEncoding: 'ENCODED_POLYLINE',
    units: 'METRIC',
    languageCode: 'en',
  }

  const intermediates = intermediateStops(routeInput)
  if (intermediates.length > 0) body.intermediates = intermediates
  if (routeInput.plannedPickupAt && isFutureTimestamp(routeInput.plannedPickupAt)) {
    body.departureTime = routeInput.plannedPickupAt.toISOString()
  }

  return body
}

function parseDurationSeconds(duration) {
  if (!duration || typeof duration !== 'string' || !duration.endsWith('s')) return null

  const seconds = Number(duration.slice(0, -1))
  if (!Number.isFinite(seconds)) return null

  return Math.round(seconds)
}

function normalizeLeg(leg) {
  return {
    distanceMeters: Number.isFinite(Number(leg.distanceMeters)) ? Number(leg.distanceMeters) : null,
    durationSeconds: parseDurationSeconds(leg.duration),
  }
}

function normalizeGoogleRouteResponse(responseBody) {
  const route = responseBody && Array.isArray(responseBody.routes) ? responseBody.routes[0] : null
  if (!route) {
    throw serviceError('Google Routes did not return a route')
  }

  const distanceMeters = Number(route.distanceMeters)
  const durationSeconds = parseDurationSeconds(route.duration || route.staticDuration)

  if (!Number.isFinite(distanceMeters) || distanceMeters < 0) {
    throw serviceError('Google Routes response did not include a valid distance')
  }

  return {
    provider: 'google_routes',
    calculatedAt: new Date().toISOString(),
    distanceMeters,
    distanceKm: Number((distanceMeters / 1000).toFixed(3)),
    durationSeconds,
    encodedPolyline: route.polyline ? route.polyline.encodedPolyline : null,
    polylineEncoding: 'ENCODED_POLYLINE',
    viewport: route.viewport || null,
    warnings: route.warnings || [],
    legs: Array.isArray(route.legs) ? route.legs.map(normalizeLeg) : [],
  }
}

async function parseGoogleError(response) {
  let body = null
  try {
    body = await response.json()
  } catch (err) {
    body = null
  }

  const message = body && body.error && body.error.message
    ? body.error.message
    : `Google Routes request failed with status ${response.status}`

  throw serviceError(message, 502, {
    provider: 'google_routes',
    status: response.status,
  })
}

async function computeRoute(routeInput, fetchImpl = global.fetch) {
  if (!config.googleMapsApiKey) {
    throw serviceError('GOOGLE_MAPS_API_KEY is not configured', 503)
  }

  if (typeof fetchImpl !== 'function') {
    throw serviceError('fetch is not available in this runtime', 500)
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), config.httpTimeoutMs)

  try {
    const response = await fetchImpl(config.googleRoutesApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': config.googleMapsApiKey,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify(buildGoogleRoutesRequest(routeInput)),
      signal: controller.signal,
    })

    if (!response.ok) {
      await parseGoogleError(response)
    }

    return normalizeGoogleRouteResponse(await response.json())
  } catch (err) {
    if (err.name === 'AbortError') {
      throw serviceError('Google Routes request timed out', 504, { provider: 'google_routes' })
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }
}

module.exports = {
  buildGoogleRoutesRequest,
  computeRoute,
  normalizeGoogleRouteResponse,
  parseDurationSeconds,
}
