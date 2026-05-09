import { apiRequest } from './httpClient'
import { notificationInboxFilters } from '../utils/notificationPolicy'

export function listNotifications({ filters, profile, token, unreadOnly } = {}) {
  return apiRequest('/notifications', {
    params: {
      ...notificationInboxFilters(profile),
      ...filters,
      ...(unreadOnly === undefined ? {} : { unreadOnly }),
    },
    token,
  })
}

export function markNotificationRead(notificationId, { token } = {}) {
  return apiRequest(`/notifications/${encodeURIComponent(notificationId)}/read`, {
    method: 'PATCH',
    token,
  })
}

export function scanDelayNotifications({ token } = {}) {
  return apiRequest('/notifications/scan-delays', {
    method: 'POST',
    token,
  })
}
