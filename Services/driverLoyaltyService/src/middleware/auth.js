const jwt = require('jsonwebtoken')

// Roles that can view any Driver's points without restriction
const PRIVILEGED_ROLES = new Set(['admin', 'support'])

function requireAuth(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' })
  }
  const token = header.slice(7)
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

// Drivers can only access their own points.
// Admin and support can access any Driver's points.
function requireDriverSelf(req, res, next) {
  const { role, sub } = req.user
  if (PRIVILEGED_ROLES.has(role)) return next()
  if (role === 'driver' && sub === req.params.driverId) return next()
  return res.status(403).json({ error: 'Access denied' })
}

module.exports = { requireAuth, requireDriverSelf }
