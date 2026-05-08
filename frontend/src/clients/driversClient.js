import { apiRequest } from './httpClient'

export function listDrivers({ token, available } = {}) {
  return apiRequest('/drivers', { params: { available }, token })
}

export function getDriver(driverId, { token } = {}) {
  return apiRequest(`/drivers/${encodeURIComponent(driverId)}`, { token })
}

export function updateDriverAvailability(driverId, available, { token } = {}) {
  return apiRequest(`/drivers/${encodeURIComponent(driverId)}/availability`, {
    body: { available },
    method: 'PATCH',
    token,
  })
}
