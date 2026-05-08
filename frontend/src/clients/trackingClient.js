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
