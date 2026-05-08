import { apiRequest } from './httpClient'

export function getTrackingStatus(shipmentId, { token, limit = 100, order = 'asc' } = {}) {
  return apiRequest(`/tracking/shipments/${encodeURIComponent(shipmentId)}/status`, {
    params: { limit, order },
    token,
  })
}

export function getTrackingEvents(shipmentId, { token, limit = 100, order = 'asc' } = {}) {
  return apiRequest(`/tracking/shipments/${encodeURIComponent(shipmentId)}/events`, {
    params: { limit, order },
    token,
  })
}

export function getLatestTracking(shipmentId, { token } = {}) {
  return apiRequest(`/tracking/shipments/${encodeURIComponent(shipmentId)}/latest`, { token })
}

export function createTrackingEvent(shipmentId, event, { token } = {}) {
  return apiRequest(`/tracking/shipments/${encodeURIComponent(shipmentId)}/events`, {
    body: event,
    token,
  })
}

export function createLocationUpdate(shipmentId, event, { token } = {}) {
  return apiRequest(`/tracking/shipments/${encodeURIComponent(shipmentId)}/location`, {
    body: event,
    token,
  })
}
