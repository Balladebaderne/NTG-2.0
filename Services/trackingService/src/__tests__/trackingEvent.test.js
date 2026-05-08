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

  it('normalizes the requested tracking flow labels into canonical event types', () => {
    const input = TrackingEvent.buildEventInput('shipment-1', {
      eventType: 'Proof of Delivery (POD) confirmed',
      podReference: 'POD-123',
    })

    expect(input.eventType).toBe('pod_confirmed')
    expect(input.status).toBe('received')
    expect(input.podReference).toBe('POD-123')
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

  it('allows optional terminal and milestone events to be skipped before out for delivery', () => {
    expect(() =>
      TrackingEvent.validateFlowTransition(
        [
          { eventType: 'shipment_order_created' },
          { eventType: 'transport_planned_carrier_assigned' },
          { eventType: 'pickup_scheduled' },
          { eventType: 'truck_arrived_pickup' },
          { eventType: 'goods_loaded_pickup_confirmed' },
          { eventType: 'shipment_in_transit' },
        ],
        { eventType: 'out_for_delivery' }
      )
    ).not.toThrow()
  })

  it('rejects skipping required flow events', () => {
    expect(() =>
      TrackingEvent.validateFlowTransition(
        [{ eventType: 'shipment_order_created' }],
        { eventType: 'truck_arrived_pickup' }
      )
    ).toThrow('Tracking flow cannot skip Transport planned and carrier assigned')
  })

  it('allows repeated in-transit milestone updates', () => {
    expect(() =>
      TrackingEvent.validateFlowTransition(
        [
          { eventType: 'shipment_order_created' },
          { eventType: 'transport_planned_carrier_assigned' },
          { eventType: 'pickup_scheduled' },
          { eventType: 'truck_arrived_pickup' },
          { eventType: 'goods_loaded_pickup_confirmed' },
          { eventType: 'shipment_in_transit' },
          { eventType: 'in_transit_milestone' },
        ],
        { eventType: 'in_transit_milestone' }
      )
    ).not.toThrow()
  })

  it('rejects new events after the shipment is completed and closed', () => {
    expect(() =>
      TrackingEvent.validateFlowTransition(
        [{ eventType: 'shipment_completed_closed' }],
        { eventType: 'exception_logged' }
      )
    ).toThrow('Shipment tracking flow is already completed and closed')
  })
})
