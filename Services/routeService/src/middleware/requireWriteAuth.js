const jwt = require('jsonwebtoken')

const OPERATOR_WRITE_ROLES = new Set(['admin', 'logistics', 'support'])

function normalizeRole(role) {
  return String(role || '').trim().toLowerCase()
}

function requireWriteAuth(req, res, next) {
  if (process.env.AUTH_REQUIRED !== 'true') return next()

  const serviceToken = process.env.SERVICE_AUTH_TOKEN
  if (serviceToken && req.get('x-service-token') === serviceToken) return next()

  const header = req.get('authorization') || ''
  const [scheme, token] = header.split(' ')

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'local-login-secret-change-me')
    if (!OPERATOR_WRITE_ROLES.has(normalizeRole(req.user.role))) {
      return res.status(403).json({ error: 'Role is not permitted to modify routes' })
    }

    return next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

module.exports = { OPERATOR_WRITE_ROLES, requireWriteAuth }
