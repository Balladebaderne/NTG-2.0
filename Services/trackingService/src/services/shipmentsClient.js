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

async function verifyShipmentExists(shipmentId) {
  if (!verifyShipments) return

  let response
  try {
    response = await fetchWithTimeout(`${shipmentsServiceUrl}/shipments/${shipmentId}`)
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
    const response = await fetchWithTimeout(`${shipmentsServiceUrl}/shipments/${shipmentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
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
  verifyShipmentExists,
  syncShipmentStatus,
}
