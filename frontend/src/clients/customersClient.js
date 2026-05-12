import { apiRequest } from './httpClient'

export function listCustomers({ token } = {}) {
  return apiRequest('/customers', { token })
}

export function createCustomer(customer, { token } = {}) {
  return apiRequest('/customers', {
    body: customer,
    method: 'POST',
    token,
  })
}

export function getCustomer(customerId, { token } = {}) {
  return apiRequest(`/customers/${encodeURIComponent(customerId)}`, { token })
}

export function deleteCustomer(customerId, { token } = {}) {
  return apiRequest(`/customers/${encodeURIComponent(customerId)}`, {
    method: 'DELETE',
    token,
  })
}
