import { apiRequest } from './httpClient'

export function listNotifications({ token, filters } = {}) {
  return apiRequest('/notifications', { params: filters, token })
}

export function markNotificationRead(notificationId, { token } = {}) {
  return apiRequest(`/notifications/${encodeURIComponent(notificationId)}/read`, {
    method: 'PATCH',
    token,
  })
}
