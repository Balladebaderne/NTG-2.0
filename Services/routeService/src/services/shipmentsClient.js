const {
  httpTimeoutMs,
  shipmentRouteSyncEnabled,
  shipmentsServiceUrl,
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

  const encodedShipmentId = encodeURIComponent(shipmentId)
  let response
  try {
    response = await fetchWithTimeout(`${shipmentsServiceUrl}/shipments/${encodedShipmentId}`)
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

async function syncShipmentRoute(shipmentId, routePatch) {
  if (!shipmentRouteSyncEnabled) {
    return {
      status: 'skipped',
      reason: 'Shipment route sync disabled',
    }
  }

  const payload = {
    routeId: routePatch.routeId,
    estimatedArrivalAt: routePatch.estimatedArrivalAt || null,
  }

  try {
    const encodedShipmentId = encodeURIComponent(shipmentId)
    const response = await fetchWithTimeout(`${shipmentsServiceUrl}/shipments/${encodedShipmentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      return {
        status: 'failed',
        error: `shipmentsService returned ${response.status}`,
      }
    }

    return {
      status: 'succeeded',
      routeId: payload.routeId,
      estimatedArrivalAt: payload.estimatedArrivalAt,
    }
  } catch (err) {
    return {
      status: 'failed',
      error: err.message,
    }
  }
}

module.exports = {
  syncShipmentRoute,
  verifyShipmentExists,
}
