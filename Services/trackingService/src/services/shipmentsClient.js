const {
  httpTimeoutMs,
  shipmentsServiceUrl,
  shipmentStatusSyncEnabled,
  verifyShipments,
} = require('../config')

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), httpTimeoutMs)

  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

function serviceHeaders(extraHeaders = {}) {
  const serviceToken = process.env.SERVICE_AUTH_TOKEN
  return {
    ...extraHeaders,
    ...(serviceToken ? { 'x-service-token': serviceToken } : {}),
  }
}

async function verifyShipmentExists(shipmentId) {
  if (!verifyShipments) return

  const encodedShipmentId = encodeURIComponent(shipmentId)
  let response
  try {
    response = await fetchWithTimeout(`${shipmentsServiceUrl}/shipments/${encodedShipmentId}`, {
      headers: serviceHeaders(),
    })
  } catch (err) {
    const unavailable = new Error(`shipmentsService unavailable: ${err.message}`)
    unavailable.status = 503
    throw unavailable
  }

  if (response.status === 404) {
    const notFound = new Error('Shipment not found')
    notFound.status = 404
    throw notFound
  }

  if (!response.ok) {
    const failed = new Error(`shipmentsService rejected verification with ${response.status}`)
    failed.status = 502
    throw failed
  }
}

async function getShipment(shipmentId) {
  const encodedShipmentId = encodeURIComponent(shipmentId)
  let response
  try {
    response = await fetchWithTimeout(`${shipmentsServiceUrl}/shipments/${encodedShipmentId}`, {
      headers: serviceHeaders(),
    })
  } catch (err) {
    const unavailable = new Error(`shipmentsService unavailable: ${err.message}`)
    unavailable.status = 503
    throw unavailable
  }

  if (response.status === 404) {
    const notFound = new Error('Shipment not found')
    notFound.status = 404
    throw notFound
  }

  if (!response.ok) {
    const failed = new Error(`shipmentsService rejected lookup with ${response.status}`)
    failed.status = 502
    throw failed
  }

  return response.json()
}

async function syncShipmentStatus(shipmentId, shipmentStatus) {
  if (!shipmentStatus) {
    return {
      status: 'skipped',
      reason: 'event does not change Shipment lifecycle status',
    }
  }

  if (!shipmentStatusSyncEnabled) {
    return {
      status: 'skipped',
      reason: 'Shipment status sync disabled',
    }
  }

  try {
    const encodedShipmentId = encodeURIComponent(shipmentId)
    const response = await fetchWithTimeout(`${shipmentsServiceUrl}/shipments/${encodedShipmentId}`, {
      method: 'PUT',
      headers: serviceHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ status: shipmentStatus }),
    })

    if (!response.ok) {
      return {
        status: 'failed',
        shipmentStatus,
        error: `shipmentsService returned ${response.status}`,
      }
    }

    return {
      status: 'succeeded',
      shipmentStatus,
    }
  } catch (err) {
    return {
      status: 'failed',
      shipmentStatus,
      error: err.message,
    }
  }
}

module.exports = {
  getShipment,
  verifyShipmentExists,
  syncShipmentStatus,
}
