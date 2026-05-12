const test = require('node:test')
const assert = require('node:assert/strict')
const {
  OPERATION_RECIPIENT_ROLES,
  expandDelayNotificationRecipients,
} = require('../services/delayNotificationService')

test('targets admin, support, and logistics for delayed shipment notifications', () => {
  const candidate = {
    type: 'shipment_delayed',
    shipmentId: 'shipment-1',
    receiverCustomerId: 'customer-1',
    title: 'Shipment delayed',
    message: 'Shipment shipment-1 is delayed.',
    metadata: {
      estimatedArrivalAt: '2026-05-07T11:30:00.000Z',
      detectedAt: '2026-05-07T12:00:00.000Z',
    },
  }

  const notifications = expandDelayNotificationRecipients(candidate)

  assert.deepEqual(OPERATION_RECIPIENT_ROLES, ['admin', 'support', 'logistics'])
  assert.equal(notifications.length, 4)
  assert.equal(notifications[0].receiverCustomerId, 'customer-1')
  assert.equal(notifications[0].recipientRole, undefined)
  assert.deepEqual(
    notifications.slice(1).map((notification) => notification.recipientRole),
    ['admin', 'support', 'logistics']
  )
  assert.equal(notifications[1].receiverCustomerId, undefined)
  assert.equal(notifications[2].receiverCustomerId, undefined)
  assert.equal(notifications[3].receiverCustomerId, undefined)
  assert.equal(notifications[1].metadata.receiverCustomerId, 'customer-1')
  assert.equal(notifications[2].metadata.receiverCustomerId, 'customer-1')
  assert.equal(notifications[3].metadata.receiverCustomerId, 'customer-1')
})

test('builds role notifications from a driver delay event', () => {
  const {
    buildDriverDelayNotification,
  } = require('../services/delayNotificationService')

  const notifications = buildDriverDelayNotification({
    driverId: 'driver-1',
    notes: 'Border queue',
    occurredAt: '2026-05-11T13:00:00.000Z',
    shipmentId: 'shipment-1',
    trackingEventId: 'event-1',
  })

  assert.equal(notifications.length, 3)
  assert.deepEqual(
    notifications.map((notification) => notification.recipientRole),
    ['admin', 'support', 'logistics']
  )
  assert.equal(notifications[0].type, 'driver_delay_logged')
  assert.equal(notifications[0].title, 'Shipment delayed')
  assert.match(notifications[0].message, /Driver reported a delay for shipment shipment-1/)
  assert.equal(notifications[0].metadata.source, 'driver_delay_logged')
  assert.equal(notifications[0].metadata.trackingEventId, 'event-1')
})

test('builds a customer notification from a driver delay event when receiver customer is known', () => {
  const {
    buildDriverDelayNotification,
  } = require('../services/delayNotificationService')

  const notifications = buildDriverDelayNotification({
    driverId: 'driver-1',
    notes: 'Border queue',
    occurredAt: '2026-05-11T13:00:00.000Z',
    receiverCustomerId: 'customer-1',
    shipmentId: 'shipment-1',
    trackingEventId: 'event-1',
  })

  assert.equal(notifications.length, 4)
  assert.equal(notifications[0].receiverCustomerId, 'customer-1')
  assert.equal(notifications[0].recipientRole, undefined)
  assert.deepEqual(
    notifications.slice(1).map((notification) => notification.recipientRole),
    ['admin', 'support', 'logistics']
  )
  assert.equal(notifications[1].receiverCustomerId, undefined)
  assert.equal(notifications[1].metadata.receiverCustomerId, 'customer-1')
})

test('builds role notifications from a driver delivery event', () => {
  const {
    buildDriverDeliveryNotification,
  } = require('../services/delayNotificationService')

  const notifications = buildDriverDeliveryNotification({
    driverId: 'driver-1',
    notes: 'Signed at reception',
    occurredAt: '2026-05-11T13:00:00.000Z',
    shipmentId: 'shipment-1',
    trackingEventId: 'event-1',
  })

  assert.equal(notifications.length, 3)
  assert.deepEqual(
    notifications.map((notification) => notification.recipientRole),
    ['admin', 'support', 'logistics']
  )
  assert.equal(notifications[0].type, 'driver_delivery_logged')
  assert.equal(notifications[0].title, 'Shipment delivered')
  assert.match(notifications[0].message, /Driver marked shipment shipment-1 as delivered/)
  assert.equal(notifications[0].metadata.source, 'driver_delivery_logged')
  assert.equal(notifications[0].metadata.trackingEventId, 'event-1')
})
