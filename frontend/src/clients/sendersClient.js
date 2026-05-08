import { apiRequest } from './httpClient'

export function listSenders({ token } = {}) {
  return apiRequest('/senders', { token })
}

export function getSender(senderId, { token } = {}) {
  return apiRequest(`/senders/${encodeURIComponent(senderId)}`, { token })
}
