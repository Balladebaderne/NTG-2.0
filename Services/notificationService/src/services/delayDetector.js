const ETA_FIELD_NAMES = [
  'estimatedArrivalAt',
  'estimatedArrivalTime',
  'eta',
  'plannedArrivalAt',
  'expectedArrivalAt',
]

function getShipmentId(shipment) {
  return shipment._id || shipment.id || shipment.shipmentId
}

function getEstimatedArrivalAt(shipment) {
  for (const fieldName of ETA_FIELD_NAMES) {
    if (shipment[fieldName]) return shipment[fieldName]
  }
  return null
}

function parseDate(value) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

function isDelayedShipment(shipment, now = new Date()) {
  if (!shipment || shipment.status !== 'in_transit') return false

  const estimatedArrivalAt = getEstimatedArrivalAt(shipment)
  if (!estimatedArrivalAt) return false

  const estimatedArrivalDate = parseDate(estimatedArrivalAt)
  if (!estimatedArrivalDate) return false

  return estimatedArrivalDate.getTime() < now.getTime()
}

function toDelayNotificationCandidate(shipment, now = new Date()) {
  if (!isDelayedShipment(shipment, now)) return null

  const shipmentId = getShipmentId(shipment)
  const receiverCustomerId = shipment.receiverCustomerId
  const estimatedArrivalAt = getEstimatedArrivalAt(shipment)

  if (!shipmentId || !receiverCustomerId) return null

  return {
    type: 'shipment_delayed',
    shipmentId,
    receiverCustomerId,
    title: 'Shipment delayed',
    message: `Shipment ${shipmentId} is delayed. Estimated arrival was ${estimatedArrivalAt}.`,
    metadata: {
      estimatedArrivalAt,
      detectedAt: now.toISOString(),
    },
  }
}

function findDelayedShipments(shipments, now = new Date()) {
  if (!Array.isArray(shipments)) return []
  return shipments
    .map(shipment => toDelayNotificationCandidate(shipment, now))
    .filter(Boolean)
}

module.exports = {
  ETA_FIELD_NAMES,
  findDelayedShipments,
  getEstimatedArrivalAt,
  isDelayedShipment,
  toDelayNotificationCandidate,
}
