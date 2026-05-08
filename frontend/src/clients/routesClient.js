import { apiRequest } from './httpClient'

export function listRoutes({ token, filters } = {}) {
  return apiRequest('/routes', { params: filters, token })
}

export function getRoute(routeId, { token } = {}) {
  return apiRequest(`/routes/${encodeURIComponent(routeId)}`, { token })
}
