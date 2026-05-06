const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

export async function login(credentials) {
  const response = await fetch(`${API_URL}/auth/login`, {
    body: JSON.stringify(credentials),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(payload?.message || 'Login failed.')
  }

  if (!payload?.token) {
    throw new Error('Login response did not include a token.')
  }

  return payload
}
