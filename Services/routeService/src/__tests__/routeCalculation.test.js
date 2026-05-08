const {
  applyRouteCalculation,
  applyRouteCalculationFailure,
} = require('../services/routeCalculation')

const routeInput = {
  shipmentId: 'shipment-1',
  plannedPickupAt: new Date('2026-05-08T09:00:00.000Z'),
  estimatedArrivalAt: null,
  distanceKm: null,
  durationSeconds: null,
  routeGeometry: null,
  metadata: {
    planningSource: 'dispatcher',
  },
}

describe('routeCalculation', () => {
  it('applies calculated google distance, duration, geometry, and ETA', () => {
    const enriched = applyRouteCalculation(routeInput, {
      provider: 'google_routes',
      calculatedAt: '2026-05-08T09:01:00.000Z',
      distanceMeters: 334250,
      distanceKm: 334.25,
      durationSeconds: 14400,
      encodedPolyline: 'encoded-polyline',
      polylineEncoding: 'ENCODED_POLYLINE',
      viewport: null,
      warnings: [],
      legs: [],
    })

    expect(enriched.distanceKm).toBe(334.25)
    expect(enriched.durationSeconds).toBe(14400)
    expect(enriched.estimatedArrivalAt.toISOString()).toBe('2026-05-08T13:00:00.000Z')
    expect(enriched.routeGeometry.encodedPolyline).toBe('encoded-polyline')
    expect(enriched.metadata.planningSource).toBe('dispatcher')
    expect(enriched.metadata.routeCalculation.status).toBe('succeeded')
  })

  it('records calculation failure without removing manual route data', () => {
    const enriched = applyRouteCalculationFailure(routeInput, new Error('billing disabled'))

    expect(enriched.routeGeometry).toBeNull()
    expect(enriched.metadata.routeCalculation.status).toBe('failed')
    expect(enriched.metadata.routeCalculation.error).toBe('billing disabled')
  })
})
