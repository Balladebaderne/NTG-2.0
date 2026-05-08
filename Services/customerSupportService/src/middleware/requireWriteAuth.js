const jwt = require('jsonwebtoken')

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
    return next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

module.exports = { requireWriteAuth }
