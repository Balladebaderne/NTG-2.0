const { addPoints, addPointsForEvent } = require('../db')

const POINT_VALUES = {
  delivered: 50,
  intermediate_event: 10,
}

async function handleShipmentEvent(event) {
  const { type, driverId } = event
  const amount = POINT_VALUES[type]
  const eventId = event.eventId || event.trackingEventId || event.idempotencyKey

  if (!amount || !driverId) return { status: 'skipped' }

  if (eventId) {
    return addPointsForEvent(driverId, amount, eventId, type)
  }

  await addPoints(driverId, amount)
  return { awarded: true, pointsAwarded: amount }
}

module.exports = { handleShipmentEvent, POINT_VALUES }
