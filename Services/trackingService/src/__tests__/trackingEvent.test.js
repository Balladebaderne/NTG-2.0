const TrackingEvent = require('../models/TrackingEvent')
const {
  BROKER_EVENT_BY_TRACKING_EVENT,
  brokerEventFromTrackingEvent,
} = require('../services/trackingEventsPublisher')

describe('TrackingEvent model input', () => {
  it('builds a location update without changing lifecycle status', () => {
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
    expect(input.status).toBeNull()
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

describe('tracking event broker mapping', () => {
  it('maps delivered lifecycle events to broker delivered events', () => {
    const event = brokerEventFromTrackingEvent({
      canonicalEventType: 'goods_delivered',
      driverId: 'driver-1',
      trackingEventId: 'event-1',
      shipmentId: 'shipment-1',
      occurredAt: '2026-05-08T10:00:00.000Z',
    })

    expect(event).toMatchObject({
      type: 'delivered',
      eventId: 'event-1',
      driverId: 'driver-1',
      shipmentId: 'shipment-1',
      trackingEventType: 'goods_delivered',
    })
  })

  it('maps route milestone events to broker intermediate events', () => {
    expect(BROKER_EVENT_BY_TRACKING_EVENT.out_for_delivery).toBe('intermediate_event')
    expect(BROKER_EVENT_BY_TRACKING_EVENT.in_transit_milestone).toBe('intermediate_event')
  })

  it('does not publish events that have no driver assignment', () => {
    const event = brokerEventFromTrackingEvent({
      canonicalEventType: 'goods_delivered',
      trackingEventId: 'event-1',
      shipmentId: 'shipment-1',
    })

    expect(event).toBeNull()
  })
})
