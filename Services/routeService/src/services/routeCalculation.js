const config = require('../config')
const { computeRoute } = require('./googleRoutesClient')

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

async function enrichRouteInput(routeInput) {
  if (!isGoogleCalculationEnabled()) return routeInput

  try {
    return applyRouteCalculation(routeInput, await computeRoute(routeInput))
  } catch (err) {
    if (config.routeCalculationRequired) throw err
    return applyRouteCalculationFailure(routeInput, err)
  }
}

module.exports = {
  applyRouteCalculation,
  applyRouteCalculationFailure,
  enrichRouteInput,
  isGoogleCalculationEnabled,
}
