const config = require('../config')
const { computeRoute } = require('./googleRoutesClient')
const { geocodeAddress } = require('./nominatimClient')

function isGoogleCalculationEnabled() {
  return config.routeCalculationProvider === 'google' && Boolean(config.googleMapsApiKey)
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

function applyRouteCalculationFailure(routeInput, err) {
  return {
    ...routeInput,
    metadata: mergeRouteCalculationMetadata(routeInput.metadata, {
      provider: 'google_routes',
      status: 'failed',
      calculatedAt: new Date().toISOString(),
      error: err.message,
    }),
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

  if (!isGoogleCalculationEnabled()) return input

  try {
    return applyRouteCalculation(input, await computeRoute(input))
  } catch (err) {
    if (config.routeCalculationRequired) throw err
    return applyRouteCalculationFailure(input, err)
  }
}

module.exports = {
  applyRouteCalculation,
  applyRouteCalculationFailure,
  enrichRouteInput,
  geocodeRouteLocations,
  isGoogleCalculationEnabled,
}
