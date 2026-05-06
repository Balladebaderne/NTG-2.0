const TrackingEvent = require('../models/TrackingEvent')

describe('TrackingEvent model input', () => {
  it('builds a location update with in_transit status', () => {
    const input = TrackingEvent.buildEventInput('shipment-1', {
      eventType: 'location_updated',
      location: {
        lat: 55.6761,
        lng: 12.5683,
        label: 'Copenhagen',
      },
    })

    expect(input.shipmentId).toBe('shipment-1')
    expect(input.eventType).toBe('location_updated')
    expect(input.status).toBe('in_transit')
    expect(input.latitude).toBe(55.6761)
    expect(input.longitude).toBe(12.5683)
    expect(input.locationLabel).toBe('Copenhagen')
  })

  it('rejects milestone status contradictions', () => {
    expect(() =>
      TrackingEvent.buildEventInput('shipment-1', {
        eventType: 'received',
        status: 'in_transit',
      })
    ).toThrow('Tracking event status contradicts lifecycle milestone')
  })

  it('rejects invalid event types', () => {
    expect(() =>
      TrackingEvent.buildEventInput('shipment-1', {
        eventType: 'lost',
      })
    ).toThrow('Invalid eventType')
  })
})
