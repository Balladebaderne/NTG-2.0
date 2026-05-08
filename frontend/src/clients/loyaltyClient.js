import { apiRequest } from './httpClient'

export function getDriverPoints(driverId, { token } = {}) {
  return apiRequest(`/drivers/${encodeURIComponent(driverId)}/points`, { token })
}
