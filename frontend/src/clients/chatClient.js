import { apiRequest } from './httpClient'

export function sendChatMessage({ message, customerId, conversationId, token }) {
  return apiRequest('/chat', {
    body: { message, customerId, conversationId },
    token,
  })
}

export function listConversations({ token, customerId } = {}) {
  return apiRequest('/conversations', { params: { customerId }, token })
}

export function getConversation(conversationId, { token } = {}) {
  return apiRequest(`/conversations/${encodeURIComponent(conversationId)}`, { token })
}
