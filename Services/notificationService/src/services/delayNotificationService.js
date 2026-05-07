const { findDelayedShipments } = require('./delayDetector')
const { listInTransitShipments } = require('./shipmentsClient')
const { createNotification } = require('./notificationsRepository')

const OPERATION_RECIPIENT_ROLES = ['support', 'logistics']

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

module.exports = {
  OPERATION_RECIPIENT_ROLES,
  expandDelayNotificationRecipients,
  scanForDelayedShipments,
}
