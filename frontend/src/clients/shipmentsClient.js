import { apiRequest } from './httpClient'

export function listShipments({ token, filters } = {}) {
  return apiRequest('/shipments', { params: filters, token })
}

export function getShipment(shipmentId, { token } = {}) {
  return apiRequest(`/shipments/${encodeURIComponent(shipmentId)}`, { token })
}

export function createShipment(shipment, { token } = {}) {
  return apiRequest('/shipments', { body: shipment, token })
}

export function updateShipment(shipmentId, shipment, { token } = {}) {
  return apiRequest(`/shipments/${encodeURIComponent(shipmentId)}`, {
    body: shipment,
    method: 'PUT',
    token,
  })
}
