import { apiRequest } from './httpClient'

export function listDrivers({ token, available } = {}) {
  return apiRequest('/drivers', { params: { available }, token })
}

export function getDriver(driverId, { token } = {}) {
  return apiRequest(`/drivers/${encodeURIComponent(driverId)}`, { token })
}
