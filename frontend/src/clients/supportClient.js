import { apiRequest } from './httpClient'

export function listTickets({ token, filters } = {}) {
  return apiRequest('/tickets', { params: filters, token })
}

export function createTicket(ticket, { token } = {}) {
  return apiRequest('/tickets', { body: ticket, token })
}

export function searchTracking(shipmentId, { token } = {}) {
  return apiRequest('/search/tracking', { params: { id: shipmentId }, token })
}

export function searchShipments({ destination, reference, token } = {}) {
  return apiRequest('/search/shipments', { params: { destination, reference }, token })
}

export function getDelayedShipments({ token } = {}) {
  return apiRequest('/search/delayed', { token })
}

export function getDiscrepancies({ token } = {}) {
  return apiRequest('/search/discrepancies', { token })
}
