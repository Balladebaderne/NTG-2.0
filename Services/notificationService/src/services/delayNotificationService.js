const { findDelayedShipments } = require('./delayDetector')
const { listInTransitShipments } = require('./shipmentsClient')
const { createNotification } = require('./notificationsRepository')

const OPERATION_RECIPIENT_ROLES = ['admin', 'support', 'logistics']

function expandDelayNotificationRecipients(candidate) {
  if (!candidate) return []

  const roleNotifications = OPERATION_RECIPIENT_ROLES.map((recipientRole) => ({
    ...candidate,
    receiverCustomerId: undefined,
    recipientRole,
    metadata: {
      ...candidate.metadata,
      receiverCustomerId: candidate.receiverCustomerId,
    },
  }))

  return [candidate, ...roleNotifications]
}

async function scanForDelayedShipments(now = new Date()) {
  const shipments = await listInTransitShipments()
  const candidates = findDelayedShipments(shipments, now)
  const notificationsToCreate = candidates.flatMap(expandDelayNotificationRecipients)
  const createdNotifications = []

  for (const notification of notificationsToCreate) {
    const created = await createNotification(notification)
    if (created) createdNotifications.push(created)
  }

  return {
    scanned: Array.isArray(shipments) ? shipments.length : 0,
    delayed: candidates.length,
    created: createdNotifications.length,
    notifications: createdNotifications,
  }
}

function buildDriverDelayNotification({ driverId, notes, occurredAt, shipmentId, trackingEventId }) {
  if (!shipmentId) {
    throw new Error('shipmentId is required')
  }

  const detectedAt = new Date().toISOString()
  const noteSuffix = notes ? ` Driver note: ${notes}` : ''

  return OPERATION_RECIPIENT_ROLES.map((recipientRole) => ({
    recipientRole,
    shipmentId,
    type: 'driver_delay_logged',
    title: 'Shipment delayed',
    message: `Driver reported a delay for shipment ${shipmentId}.${noteSuffix}`,
    metadata: {
      detectedAt,
      driverId,
      notes,
      occurredAt,
      source: 'driver_delay_logged',
      trackingEventId,
    },
  }))
}

function buildDriverDeliveryNotification({ driverId, notes, occurredAt, shipmentId, trackingEventId }) {
  if (!shipmentId) {
    throw new Error('shipmentId is required')
  }

  const detectedAt = new Date().toISOString()
  const noteSuffix = notes ? ` Driver note: ${notes}` : ''

  return OPERATION_RECIPIENT_ROLES.map((recipientRole) => ({
    recipientRole,
    shipmentId,
    type: 'driver_delivery_logged',
    title: 'Shipment delivered',
    message: `Driver marked shipment ${shipmentId} as delivered.${noteSuffix}`,
    metadata: {
      detectedAt,
      driverId,
      notes,
      occurredAt,
      source: 'driver_delivery_logged',
      trackingEventId,
    },
  }))
}

async function createDriverDelayNotifications(input) {
  const notificationsToCreate = buildDriverDelayNotification(input)
  const createdNotifications = []

  for (const notification of notificationsToCreate) {
    const created = await createNotification(notification)
    if (created) createdNotifications.push(created)
  }

  return {
    created: createdNotifications.length,
    notifications: createdNotifications,
    targetedRoles: OPERATION_RECIPIENT_ROLES,
  }
}

async function createDriverDeliveryNotifications(input) {
  const notificationsToCreate = buildDriverDeliveryNotification(input)
  const createdNotifications = []

  for (const notification of notificationsToCreate) {
    const created = await createNotification(notification)
    if (created) createdNotifications.push(created)
  }

  return {
    created: createdNotifications.length,
    notifications: createdNotifications,
    targetedRoles: OPERATION_RECIPIENT_ROLES,
  }
}

module.exports = {
  OPERATION_RECIPIENT_ROLES,
  buildDriverDeliveryNotification,
  buildDriverDelayNotification,
  createDriverDeliveryNotifications,
  createDriverDelayNotifications,
  expandDelayNotificationRecipients,
  scanForDelayedShipments,
}
