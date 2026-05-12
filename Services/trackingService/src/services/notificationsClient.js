const {
  httpTimeoutMs,
  notificationServiceUrl,
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

function delayPayloadFromEvent(event) {
  const eventType = event.canonicalEventType || event.eventType
  if (eventType !== 'delay_logged') return null

  return {
    driverId: event.driverId,
    notes: event.notes,
    occurredAt: event.occurredAt,
    shipmentId: event.shipmentId,
    trackingEventId: event.trackingEventId,
  }
}

function deliveryPayloadFromEvent(event) {
  const eventType = event.canonicalEventType || event.eventType
  if (eventType !== 'goods_delivered') return null

  return {
    driverId: event.driverId,
    notes: event.notes,
    occurredAt: event.occurredAt,
    shipmentId: event.shipmentId,
    trackingEventId: event.trackingEventId,
  }
}

async function postNotification(path, payload) {
  const response = await fetchWithTimeout(`${notificationServiceUrl}${path}`, {
    body: JSON.stringify(payload),
    headers: serviceHeaders({ 'Content-Type': 'application/json' }),
    method: 'POST',
  })

  if (!response.ok) {
    return {
      status: 'failed',
      error: `notificationService returned ${response.status}`,
    }
  }

  const result = await response.json()
  return {
    status: 'succeeded',
    created: result.created || 0,
    targetedRoles: result.targetedRoles || [],
  }
}

async function dispatchDriverDelayNotification(event) {
  const payload = delayPayloadFromEvent(event)
  if (!payload) {
    return { status: 'skipped', reason: 'tracking event is not a driver delay' }
  }

  try {
    return await postNotification('/notifications/driver-delay', payload)
  } catch (err) {
    return {
      status: 'failed',
      error: err.message,
    }
  }
}

async function dispatchDriverDeliveryNotification(event) {
  const payload = deliveryPayloadFromEvent(event)
  if (!payload) {
    return { status: 'skipped', reason: 'tracking event is not a driver delivery' }
  }

  try {
    return await postNotification('/notifications/driver-delivery', payload)
  } catch (err) {
    return {
      status: 'failed',
      error: err.message,
    }
  }
}

module.exports = {
  delayPayloadFromEvent,
  deliveryPayloadFromEvent,
  dispatchDriverDeliveryNotification,
  dispatchDriverDelayNotification,
}
