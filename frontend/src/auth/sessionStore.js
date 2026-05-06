const SESSION_KEY = 'ntg-login-session'
const REMEMBERED_ROLE_KEY = 'ntg-login-role'

export function readSession() {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY))
    return session?.token && session?.user ? session : null
  } catch {
    return null
  }
}

export function readRememberedRole() {
  return localStorage.getItem(REMEMBERED_ROLE_KEY)
}

export function saveSession(session, { rememberRole }) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))

  if (rememberRole) {
    localStorage.setItem(REMEMBERED_ROLE_KEY, session.user.role)
  } else {
    localStorage.removeItem(REMEMBERED_ROLE_KEY)
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}
