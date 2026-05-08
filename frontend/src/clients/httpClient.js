const BASE_URL = import.meta.env.VITE_BACKEND_URL || ''

function buildUrl(path, params = {}) {
  const search = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    search.set(key, String(value))
  })

  const query = search.toString()
  return `${BASE_URL}${path}${query ? `?${query}` : ''}`
}

async function parseResponse(response) {
  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export async function apiRequest(path, options = {}) {
  const {
    body,
    headers = {},
    method = body ? 'POST' : 'GET',
    params,
    token,
  } = options

  const response = await fetch(buildUrl(path, params), {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: {
      Accept: 'application/json',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    method,
  })

  const payload = await parseResponse(response)

  if (!response.ok) {
    const message = payload?.error || payload?.message || `Request failed with status ${response.status}`
    const error = new Error(message)
    error.status = response.status
    error.payload = payload
    throw error
  }

  return payload
}
