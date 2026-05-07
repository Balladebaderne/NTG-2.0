const test = require('node:test')
const assert = require('node:assert/strict')
const {
  OPERATION_RECIPIENT_ROLES,
  expandDelayNotificationRecipients,
} = require('../services/delayNotificationService')

test('targets support and logistics for delayed shipment notifications', () => {
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

  assert.deepEqual(OPERATION_RECIPIENT_ROLES, ['support', 'logistics'])
  assert.equal(notifications.length, 3)
  assert.equal(notifications[0].receiverCustomerId, 'customer-1')
  assert.equal(notifications[0].recipientRole, undefined)
  assert.deepEqual(
    notifications.slice(1).map((notification) => notification.recipientRole),
    ['support', 'logistics']
  )
  assert.equal(notifications[1].receiverCustomerId, undefined)
  assert.equal(notifications[2].receiverCustomerId, undefined)
  assert.equal(notifications[1].metadata.receiverCustomerId, 'customer-1')
  assert.equal(notifications[2].metadata.receiverCustomerId, 'customer-1')
})
