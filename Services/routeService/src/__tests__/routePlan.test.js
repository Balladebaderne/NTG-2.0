const RoutePlan = require('../models/RoutePlan')

const validRoute = {
  shipmentId: 'shipment-1',
  origin: {
    label: 'Sender warehouse',
    address: {
      street: 'Industrivej 1',
      city: 'Copenhagen',
      postalCode: '2100',
      country: 'DK',
    },
    location: {
      lat: 55.6761,
      lng: 12.5683,
    },
  },
  destination: {
    label: 'Receiver',
    address: {
      street: 'Main Street 2',
      city: 'Aarhus',
      postalCode: '8000',
      country: 'DK',
    },
    location: {
      lat: 56.1629,
      lng: 10.2039,
    },
  },
  estimatedArrivalAt: '2026-05-08T14:00:00.000Z',
}

describe('RoutePlan input', () => {
  it('builds a planned route and derives pickup/delivery stops', () => {
    const input = RoutePlan.buildRouteInput(validRoute)

    expect(input.shipmentId).toBe('shipment-1')
    expect(input.status).toBe('planned')
    expect(input.routeId).toBeDefined()
    expect(input.stops).toHaveLength(2)
    expect(input.stops[0].type).toBe('pickup')
    expect(input.stops[1].type).toBe('delivery')
    expect(input.estimatedArrivalAt.toISOString()).toBe('2026-05-08T14:00:00.000Z')
  })

  it('accepts multiple explicit stops for terminals and checkpoints', () => {
    const input = RoutePlan.buildRouteInput({
      ...validRoute,
      durationSeconds: 16800,
      routeGeometry: {
        provider: 'google_routes',
        encodedPolyline: 'encoded-polyline',
        polylineEncoding: 'ENCODED_POLYLINE',
      },
      stops: [
        {
          sequence: 1,
          type: 'pickup',
          address: validRoute.origin.address,
        },
        {
          sequence: 2,
          type: 'hub',
          address: {
            city: 'Hamburg',
            country: 'DE',
          },
          metadata: {
            checkpointId: 'hub-hamburg',
          },
        },
        {
          sequence: 3,
          type: 'delivery',
          address: validRoute.destination.address,
        },
      ],
    })

    expect(input.stops).toHaveLength(3)
    expect(input.stops[1].metadata.checkpointId).toBe('hub-hamburg')
    expect(input.durationSeconds).toBe(16800)
    expect(input.routeGeometry.encodedPolyline).toBe('encoded-polyline')
  })

  it('rejects a route without a shipment id', () => {
    expect(() =>
      RoutePlan.buildRouteInput({
        ...validRoute,
        shipmentId: '',
      })
    ).toThrow('shipmentId is required')
  })

  it('rejects destination before pickup', () => {
    expect(() =>
      RoutePlan.buildRouteInput({
        ...validRoute,
        plannedPickupAt: '2026-05-08T14:00:00.000Z',
        plannedDeliveryAt: '2026-05-08T13:00:00.000Z',
      })
    ).toThrow('plannedDeliveryAt cannot be before plannedPickupAt')
  })

  it('rejects invalid duration', () => {
    expect(() =>
      RoutePlan.buildRouteInput({
        ...validRoute,
        durationSeconds: -1,
      })
    ).toThrow('durationSeconds must be a non-negative integer')
  })

  it('rejects stops without pickup and delivery', () => {
    expect(() =>
      RoutePlan.buildRouteInput({
        ...validRoute,
        stops: [
          {
            sequence: 1,
            type: 'hub',
            address: {
              city: 'Hamburg',
              country: 'DE',
            },
          },
          {
            sequence: 2,
            type: 'hub',
            address: {
              city: 'Kolding',
              country: 'DK',
            },
          },
        ],
      })
    ).toThrow('stops must contain a pickup stop')
  })
})
