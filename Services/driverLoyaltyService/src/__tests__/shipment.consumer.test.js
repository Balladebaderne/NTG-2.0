jest.mock('../db')
const { addPoints, addPointsForEvent } = require('../db')
const { handleShipmentEvent, POINT_VALUES } = require('../consumers/shipment.consumer')

beforeEach(() => {
  addPoints.mockResolvedValue()
  addPointsForEvent.mockResolvedValue({ awarded: true, pointsAwarded: 50 })
})

afterEach(() => {
  jest.resetAllMocks()
})

describe('handleShipmentEvent', () => {
  it('awards 50 points for a delivered event', async () => {
    await handleShipmentEvent({ type: 'delivered', driverId: 'usr_driver', shipmentId: 'shp_1' })
    expect(addPoints).toHaveBeenCalledWith('usr_driver', 50)
  })

  it('awards 10 points for an intermediate_event', async () => {
    await handleShipmentEvent({ type: 'intermediate_event', driverId: 'usr_driver', shipmentId: 'shp_1' })
    expect(addPoints).toHaveBeenCalledWith('usr_driver', 10)
  })

  it('uses idempotent event awards when an event id is present', async () => {
    await handleShipmentEvent({
      type: 'delivered',
      driverId: 'usr_driver',
      shipmentId: 'shp_1',
      trackingEventId: 'event-1',
    })

    expect(addPointsForEvent).toHaveBeenCalledWith('usr_driver', 50, 'event-1', 'delivered')
    expect(addPoints).not.toHaveBeenCalled()
  })

  it('does nothing for an unknown event type', async () => {
    await handleShipmentEvent({ type: 'unknown_event', driverId: 'usr_driver', shipmentId: 'shp_1' })
    expect(addPoints).not.toHaveBeenCalled()
  })

  it('does nothing when driverId is missing', async () => {
    await handleShipmentEvent({ type: 'delivered', shipmentId: 'shp_1' })
    expect(addPoints).not.toHaveBeenCalled()
  })
})

describe('POINT_VALUES', () => {
  it('defines the correct point amounts', () => {
    expect(POINT_VALUES.delivered).toBe(50)
    expect(POINT_VALUES.intermediate_event).toBe(10)
  })
})
