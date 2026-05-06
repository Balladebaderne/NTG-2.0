const AUTH_API_URL = import.meta.env.VITE_AUTH_API_URL || 'http://localhost:5001'

export async function login({ email, password, role }) {
  const response = await fetch(`${AUTH_API_URL}/auth/login`, {
    body: JSON.stringify({ email: email.trim(), password, role }),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(payload?.message || 'Unable to sign in.')
  }

  return {
    token: payload.token,
    user: parseJwtPayload(payload.token),
  }
}

function parseJwtPayload(token) {
  const [, payload] = token.split('.')
  const decodedPayload = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))

  return {
    id: decodedPayload.sub,
    email: decodedPayload.email,
    name: decodedPayload.name,
    role: decodedPayload.role,
    roleLabel: decodedPayload.roleLabel,
  }
}
