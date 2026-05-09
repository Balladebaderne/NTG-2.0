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

function requireTicketCreateAuth(req, res, next) {
  if (process.env.AUTH_REQUIRED !== 'true') return next()

  const auth = authenticate(req, res)
  if (!auth) return undefined
  if (auth.service) return next()

  req.user = auth.user
  const role = normalizeRole(req.user.role)
  const isOperator = OPERATOR_WRITE_ROLES.has(role)
  const isOwnCustomerTicket = role === 'customer' && String(req.body.customerId || '') === String(req.user.sub || '')

  if (!isOperator && !isOwnCustomerTicket) {
    return res.status(403).json({ error: 'Role is not permitted to create this support ticket' })
  }

  if (role === 'customer') {
    req.body.agentId = req.user.sub
    req.body.status = 'open'
  }

  return next()
}

function requireTicketManageAuth(req, res, next) {
  if (process.env.AUTH_REQUIRED !== 'true') return next()

  const auth = authenticate(req, res)
  if (!auth) return undefined
  if (auth.service) return next()

  req.user = auth.user
  if (!OPERATOR_WRITE_ROLES.has(normalizeRole(req.user.role))) {
    return res.status(403).json({ error: 'Role is not permitted to manage support tickets' })
  }

  return next()
}

module.exports = {
  OPERATOR_WRITE_ROLES,
  requireTicketCreateAuth,
  requireTicketManageAuth,
}
