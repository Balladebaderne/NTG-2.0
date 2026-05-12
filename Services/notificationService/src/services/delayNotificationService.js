const { findDelayedShipments } = require('./delayDetector')
const { getShipment, listInTransitShipments } = require('./shipmentsClient')
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

function buildDriverDelayNotification({ driverId, notes, occurredAt, receiverCustomerId, shipmentId, trackingEventId }) {
  if (!shipmentId) {
    throw new Error('shipmentId is required')
  }

  const detectedAt = new Date().toISOString()
  const noteSuffix = notes ? ` Driver note: ${notes}` : ''
  const metadata = {
    detectedAt,
    driverId,
    notes,
    occurredAt,
    ...(receiverCustomerId ? { receiverCustomerId } : {}),
    source: 'driver_delay_logged',
    trackingEventId,
  }
  const customerNotification = receiverCustomerId ? [{
    receiverCustomerId,
    shipmentId,
    type: 'driver_delay_logged',
    title: 'Shipment delayed',
    message: `Driver reported a delay for shipment ${shipmentId}.${noteSuffix}`,
    metadata,
  }] : []

  const roleNotifications = OPERATION_RECIPIENT_ROLES.map((recipientRole) => ({
    recipientRole,
    shipmentId,
    type: 'driver_delay_logged',
    title: 'Shipment delayed',
    message: `Driver reported a delay for shipment ${shipmentId}.${noteSuffix}`,
    metadata,
  }))

  return [...customerNotification, ...roleNotifications]
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
  const receiverCustomerId = input.receiverCustomerId || await receiverCustomerIdForShipment(input.shipmentId)
  const notificationsToCreate = buildDriverDelayNotification({ ...input, receiverCustomerId })
  const createdNotifications = []

  for (const notification of notificationsToCreate) {
    const created = await createNotification(notification)
    if (created) createdNotifications.push(created)
  }

  return {
    created: createdNotifications.length,
    notifications: createdNotifications,
    targetedCustomer: receiverCustomerId || null,
    targetedRoles: OPERATION_RECIPIENT_ROLES,
  }
}

async function receiverCustomerIdForShipment(shipmentId) {
  if (!shipmentId) return ''

  try {
    const shipment = await getShipment(shipmentId)
    return shipment?.receiverCustomerId || ''
  } catch {
    return ''
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
