const test = require('node:test')
const assert = require('node:assert/strict')
const {
  findDelayedShipments,
  isDelayedShipment,
  toDelayNotificationCandidate,
} = require('../services/delayDetector')

const now = new Date('2026-05-07T12:00:00.000Z')

test('detects in-transit shipments with a past estimated arrival', () => {
  const shipment = {
    _id: 'shipment-1',
    receiverCustomerId: 'customer-1',
    status: 'in_transit',
    estimatedArrivalAt: '2026-05-07T11:30:00.000Z',
  }

  assert.equal(isDelayedShipment(shipment, now), true)
})

test('does not flag received shipments as delayed', () => {
  const shipment = {
    _id: 'shipment-1',
    receiverCustomerId: 'customer-1',
    status: 'received',
    estimatedArrivalAt: '2026-05-07T11:30:00.000Z',
  }

  assert.equal(isDelayedShipment(shipment, now), false)
})

test('does not flag shipments without an ETA-like field', () => {
  const shipment = {
    _id: 'shipment-1',
    receiverCustomerId: 'customer-1',
    status: 'in_transit',
  }

  assert.equal(isDelayedShipment(shipment, now), false)
})

test('builds a delay notification candidate for a delayed shipment', () => {
  const shipment = {
    _id: 'shipment-1',
    receiverCustomerId: 'customer-1',
    status: 'in_transit',
    eta: '2026-05-07T11:30:00.000Z',
  }

  assert.deepEqual(toDelayNotificationCandidate(shipment, now), {
    type: 'shipment_delayed',
    shipmentId: 'shipment-1',
    receiverCustomerId: 'customer-1',
    title: 'Shipment delayed',
    message: 'Shipment shipment-1 is delayed. Estimated arrival was 2026-05-07T11:30:00.000Z.',
    metadata: {
      estimatedArrivalAt: '2026-05-07T11:30:00.000Z',
      detectedAt: '2026-05-07T12:00:00.000Z',
    },
  })
})

test('filters delayed shipments and skips invalid candidates', () => {
  const delayedShipments = findDelayedShipments([
    {
      _id: 'shipment-1',
      receiverCustomerId: 'customer-1',
      status: 'in_transit',
      plannedArrivalAt: '2026-05-07T11:30:00.000Z',
    },
    {
      _id: 'shipment-2',
      receiverCustomerId: 'customer-2',
      status: 'in_transit',
      plannedArrivalAt: '2026-05-07T12:30:00.000Z',
    },
    {
      _id: 'shipment-3',
      status: 'in_transit',
      plannedArrivalAt: '2026-05-07T11:30:00.000Z',
    },
  ], now)

  assert.equal(delayedShipments.length, 1)
  assert.equal(delayedShipments[0].shipmentId, 'shipment-1')
})
