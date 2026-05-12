const {
  buildGoogleRoutesRequest,
  normalizeGoogleRouteResponse,
  parseDurationSeconds,
} = require('../modules/googleRoutesClient')

const routeInput = {
  origin: {
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
    address: {
      street: 'Main Street 2',
      city: 'Aarhus',
      postalCode: '8000',
      country: 'DK',
    },
  },
  plannedPickupAt: new Date('2030-05-08T09:00:00.000Z'),
  stops: [
    {
      sequence: 1,
      type: 'pickup',
      address: {
        city: 'Copenhagen',
        country: 'DK',
      },
    },
    {
      sequence: 2,
      type: 'hub',
      address: {
        city: 'Kolding',
        country: 'DK',
      },
      location: {
        lat: 55.4904,
        lng: 9.4722,
      },
    },
    {
      sequence: 3,
      type: 'delivery',
      address: {
        city: 'Aarhus',
        country: 'DK',
      },
    },
  ],
}

describe('googleRoutesClient', () => {
  it('builds a Google Routes API request from the route plan', () => {
    const request = buildGoogleRoutesRequest(routeInput)

    expect(request.origin.location.latLng).toEqual({
      latitude: 55.6761,
      longitude: 12.5683,
    })
    expect(request.destination.address).toBe('Main Street 2, 8000 Aarhus, DK')
    expect(request.intermediates).toHaveLength(1)
    expect(request.intermediates[0].location.latLng.latitude).toBe(55.4904)
    expect(request.departureTime).toBe('2030-05-08T09:00:00.000Z')
  })

  it('normalizes distance, duration, and polyline from Google', () => {
    const normalized = normalizeGoogleRouteResponse({
      routes: [
        {
          distanceMeters: 334250,
          duration: '14400s',
          polyline: {
            encodedPolyline: 'encoded-polyline',
          },
          legs: [
            {
              distanceMeters: 1000,
              duration: '600s',
            },
          ],
        },
      ],
    })

    expect(normalized.distanceKm).toBe(334.25)
    expect(normalized.durationSeconds).toBe(14400)
    expect(normalized.encodedPolyline).toBe('encoded-polyline')
    expect(normalized.legs[0].durationSeconds).toBe(600)
  })

  it('parses google duration strings', () => {
    expect(parseDurationSeconds('10.5s')).toBe(11)
    expect(parseDurationSeconds('bad')).toBeNull()
  })
})
