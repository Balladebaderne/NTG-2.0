const config = require('../config')
const { computeRoute } = require('./googleRoutesClient')
const { computeExternalRoute } = require('./externalRoutingClient')
const { getTemplateIntermediateStops } = require('./templateRoutingClient')
const { geocodeAddress } = require('./nominatimClient')

function isGoogleCalculationEnabled() {
  return config.routeCalculationProvider === 'google' && Boolean(config.googleMapsApiKey)
}

function isExternalProviderEnabled() {
  return config.routeCalculationProvider === 'external' && Boolean(config.externalRouteProviderUrl)
}

function isTemplateProviderEnabled() {
  return config.routeCalculationProvider === 'template'
}

function addSeconds(timestamp, seconds) {
  return new Date(timestamp.getTime() + seconds * 1000)
}

function mergeRouteCalculationMetadata(metadata, calculationMetadata) {
  return {
    ...(metadata || {}),
    routeCalculation: calculationMetadata,
  }
}

function applyRouteCalculation(routeInput, calculation) {
  const estimatedArrivalAt = !routeInput.estimatedArrivalAt
    && routeInput.plannedPickupAt
    && Number.isInteger(calculation.durationSeconds)
    ? addSeconds(routeInput.plannedPickupAt, calculation.durationSeconds)
    : routeInput.estimatedArrivalAt

  return {
    ...routeInput,
    estimatedArrivalAt,
    distanceKm: calculation.distanceKm,
    durationSeconds: calculation.durationSeconds,
    routeGeometry: {
      provider: calculation.provider,
      calculatedAt: calculation.calculatedAt,
      encodedPolyline: calculation.encodedPolyline,
      polylineEncoding: calculation.polylineEncoding,
      distanceMeters: calculation.distanceMeters,
      durationSeconds: calculation.durationSeconds,
      viewport: calculation.viewport,
      warnings: calculation.warnings,
      legs: calculation.legs,
    },
    metadata: mergeRouteCalculationMetadata(routeInput.metadata, {
      provider: calculation.provider,
      status: 'succeeded',
      calculatedAt: calculation.calculatedAt,
    }),
  }
}

function applyRouteCalculationFailure(routeInput, err, provider = 'google_routes') {
  return {
    ...routeInput,
    metadata: mergeRouteCalculationMetadata(routeInput.metadata, {
      provider,
      status: 'failed',
      calculatedAt: new Date().toISOString(),
      error: err.message,
    }),
  }
}

// Insert intermediate stops between the pickup and delivery stops, re-sequencing all stops.
function applyIntermediateStops(routeInput, intermediateStops) {
  if (!Array.isArray(intermediateStops) || intermediateStops.length === 0) return routeInput

  const sorted = [...routeInput.stops].sort((a, b) => a.sequence - b.sequence)
  const pickup = sorted.find((s) => s.type === 'pickup')
  const delivery = sorted.find((s) => s.type === 'delivery')
  const existingIntermediates = sorted.filter((s) => s.type !== 'pickup' && s.type !== 'delivery')

  const combined = [pickup, ...existingIntermediates, ...intermediateStops, delivery].filter(Boolean)

  return {
    ...routeInput,
    stops: combined.map((stop, i) => ({ ...stop, sequence: i + 1 })),
  }
}

async function fillLocation(item) {
  if (item.location || !item.address) return item
  try {
    const location = await geocodeAddress(item.address)
    return location ? { ...item, location: { lat: location.lat, lng: location.lng } } : item
  } catch {
    return item
  }
}

// Geocode any origin, destination, or stop that lacks lat/lng coordinates.
// Best-effort — a failed lookup is silently ignored so route creation still succeeds.
async function geocodeRouteLocations(routeInput) {
  const [origin, destination, ...stops] = await Promise.all([
    fillLocation(routeInput.origin),
    fillLocation(routeInput.destination),
    ...routeInput.stops.map(fillLocation),
  ])
  return { ...routeInput, origin, destination, stops }
}

async function enrichRouteInput(routeInput) {
  // Populate missing coordinates from Nominatim (free, no key required).
  let input = routeInput
  try {
    input = await geocodeRouteLocations(routeInput)
  } catch {
    // non-fatal — proceed with whatever locations we have
  }

  if (isExternalProviderEnabled()) {
    try {
      const { geometry, stops } = await computeExternalRoute(input)
      if (geometry) input = applyRouteCalculation(input, geometry)
      input = applyIntermediateStops(input, stops)
    } catch (err) {
      if (config.routeCalculationRequired) throw err
      input = applyRouteCalculationFailure(input, err, 'external_routing')
    }
    return input
  }

  if (isTemplateProviderEnabled()) {
    return applyIntermediateStops(input, getTemplateIntermediateStops())
  }

  if (isGoogleCalculationEnabled()) {
    try {
      return applyRouteCalculation(input, await computeRoute(input))
    } catch (err) {
      if (config.routeCalculationRequired) throw err
      return applyRouteCalculationFailure(input, err)
    }
  }

  return input
}

module.exports = {
  applyIntermediateStops,
  applyRouteCalculation,
  applyRouteCalculationFailure,
  enrichRouteInput,
  geocodeRouteLocations,
  isExternalProviderEnabled,
  isGoogleCalculationEnabled,
  isTemplateProviderEnabled,
}
