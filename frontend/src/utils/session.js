function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padding = (4 - (normalized.length % 4)) % 4
  const binary = window.atob(`${normalized}${'='.repeat(padding)}`)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))

  return new TextDecoder().decode(bytes)
}

export function readSessionProfile(token) {
  if (!token) return null

  const [, payload] = token.split('.')
  if (!payload) return null

  try {
    const claims = JSON.parse(decodeBase64Url(payload))

    return {
      email: claims.email || '',
      id: claims.sub || '',
      name: claims.name || 'NTG user',
      role: claims.role || 'unknown',
      roleLabel: claims.roleLabel || 'Signed in',
    }
  } catch {
    return null
  }
}
