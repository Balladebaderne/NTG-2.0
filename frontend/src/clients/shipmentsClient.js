import { apiRequest } from './httpClient'

export function listShipments({ token, filters } = {}) {
  return apiRequest('/shipments', { params: filters, token })
}

export function getShipment(shipmentId, { token } = {}) {
  return apiRequest(`/shipments/${encodeURIComponent(shipmentId)}`, { token })
}
