const jwt = require('jsonwebtoken')

const OPERATOR_WRITE_ROLES = new Set(['admin', 'logistics', 'support'])

function normalizeRole(role) {
  return String(role || '').trim().toLowerCase()
}

function authenticate(req, res) {
  const serviceToken = process.env.SERVICE_AUTH_TOKEN
  if (serviceToken && req.get('x-service-token') === serviceToken) return { service: true }

  const header = req.get('authorization') || ''
  const [scheme, token] = header.split(' ')

  if (scheme !== 'Bearer' || !token) {
    res.status(401).json({ error: 'Authentication required' })
    return null
  }

  try {
    return { user: jwt.verify(token, process.env.JWT_SECRET || 'local-login-secret-change-me') }
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
    return null
  }
}

function requireOperatorWriteAuth(req, res, next) {
  if (process.env.AUTH_REQUIRED !== 'true') return next()

  const auth = authenticate(req, res)
  if (!auth) return undefined
  if (auth.service) return next()

  req.user = auth.user
  if (!OPERATOR_WRITE_ROLES.has(normalizeRole(req.user.role))) {
    return res.status(403).json({ error: 'Role is not permitted to modify drivers' })
  }

  return next()
}

function requireAvailabilityWriteAuth(req, res, next) {
  if (process.env.AUTH_REQUIRED !== 'true') return next()

  const auth = authenticate(req, res)
  if (!auth) return undefined
  if (auth.service) return next()

  req.user = auth.user
  const role = normalizeRole(req.user.role)
  const isDriverSelf = role === 'driver' && String(req.user.sub) === String(req.params.id)
  const isOperator = OPERATOR_WRITE_ROLES.has(role)

  if (!isOperator && !isDriverSelf) {
    return res.status(403).json({ error: 'Role is not permitted to change driver availability' })
  }

  return next()
}

module.exports = {
  OPERATOR_WRITE_ROLES,
  requireAvailabilityWriteAuth,
  requireOperatorWriteAuth,
}
