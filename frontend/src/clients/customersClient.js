import { apiRequest } from './httpClient'

export function listCustomers({ token } = {}) {
  return apiRequest('/customers', { token })
}

export function getCustomer(customerId, { token } = {}) {
  return apiRequest(`/customers/${encodeURIComponent(customerId)}`, { token })
}
