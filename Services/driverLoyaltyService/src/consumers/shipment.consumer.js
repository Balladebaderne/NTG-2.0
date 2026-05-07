// Stub: will consume shipment status-change events from the message broker.
//
// When wired up, this consumer handles two event types:
//   - "delivered"          → addPoints(driverId, 50)
//   - "intermediate_event" → addPoints(driverId, 10)
//
// Expected event shape:
//   { type: "delivered" | "intermediate_event", driverId: string, shipmentId: string }

const { addPoints } = require('../db')

const POINT_VALUES = {
  delivered: 50,
  intermediate_event: 10,
}

async function handleShipmentEvent(event) {
  const { type, driverId } = event
  const amount = POINT_VALUES[type]
  if (!amount || !driverId) return
  await addPoints(driverId, amount)
}

module.exports = { handleShipmentEvent, POINT_VALUES }
