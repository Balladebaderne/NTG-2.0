import { apiRequest } from './httpClient'

export function listDrivers({ token, available } = {}) {
  return apiRequest('/drivers', { params: { available }, token })
}

export function createDriver(driver, { token } = {}) {
  return apiRequest('/drivers', {
    body: driver,
    method: 'POST',
    token,
  })
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

export function deleteDriver(driverId, { token } = {}) {
  return apiRequest(`/drivers/${encodeURIComponent(driverId)}`, {
    method: 'DELETE',
    token,
  })
}
