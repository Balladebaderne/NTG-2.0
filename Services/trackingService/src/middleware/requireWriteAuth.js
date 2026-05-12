const jwt = require('jsonwebtoken')
const { getShipment } = require('../services/shipmentsClient')

const OPERATOR_WRITE_ROLES = new Set(['admin', 'logistics', 'support'])

function normalizeRole(role) {
  return String(role || '').trim().toLowerCase()
}

function shipmentReference(req) {
  return req.params.shipmentNumber || req.params.shipmentId
}

async function requireWriteAuth(req, res, next) {
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
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }

  const role = normalizeRole(req.user.role)
  if (OPERATOR_WRITE_ROLES.has(role)) return next()

  if (role !== 'driver') {
    return res.status(403).json({ error: 'Role is not permitted to record tracking events' })
  }

  try {
    const shipment = await getShipment(shipmentReference(req))
    const driverId = String(req.user.sub || '')
    const assignedDriverId = String(shipment.driverId || '')
    const requestedDriverId = req.body?.driverId ? String(req.body.driverId) : driverId

    if (!driverId || assignedDriverId !== driverId || requestedDriverId !== driverId) {
      return res.status(403).json({ error: 'Driver is not assigned to this shipment' })
    }

    req.body.driverId = driverId
    return next()
  } catch (err) {
    return res.status(err.status || 502).json({ error: err.message })
  }
}

module.exports = { OPERATOR_WRITE_ROLES, requireWriteAuth }
