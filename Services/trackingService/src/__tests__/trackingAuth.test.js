const jwt = require('jsonwebtoken')

jest.mock('../services/shipmentsClient', () => ({
  getShipment: jest.fn(),
}))

const { getShipment } = require('../services/shipmentsClient')
const { requireWriteAuth } = require('../middleware/requireWriteAuth')

const TEST_SECRET = 'tracking-test-secret'

function tokenFor(role, sub = `usr_${role}`) {
  return jwt.sign({ role, sub }, TEST_SECRET)
}

function mockReq({ body = {}, role, shipmentNumber = 'shipment-1', sub } = {}) {
  const headers = {}
  if (role) headers.authorization = `Bearer ${tokenFor(role, sub)}`

  return {
    body,
    get(name) {
      return headers[String(name).toLowerCase()] || ''
    },
    params: { shipmentNumber },
  }
}

function mockRes() {
  return {
    body: null,
    code: null,
    json: jest.fn(function json(payload) {
      this.body = payload
      return this
    }),
    status: jest.fn(function status(code) {
      this.code = code
      return this
    }),
  }
}

describe('tracking write authorization', () => {
  beforeEach(() => {
    process.env.AUTH_REQUIRED = 'true'
    process.env.JWT_SECRET = TEST_SECRET
    delete process.env.SERVICE_AUTH_TOKEN
    jest.clearAllMocks()
  })

  afterEach(() => {
    delete process.env.AUTH_REQUIRED
    delete process.env.JWT_SECRET
    delete process.env.SERVICE_AUTH_TOKEN
  })

  it('rejects writes without a token', async () => {
    const res = mockRes()
    const next = jest.fn()

    await requireWriteAuth(mockReq(), res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('rejects customer writes before shipment lookup', async () => {
    const res = mockRes()
    const next = jest.fn()

    await requireWriteAuth(mockReq({ role: 'customer', sub: 'customer-1' }), res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(getShipment).not.toHaveBeenCalled()
    expect(next).not.toHaveBeenCalled()
  })

  it('allows operator roles to write without shipment ownership checks', async () => {
    const res = mockRes()
    const next = jest.fn()

    await requireWriteAuth(mockReq({ role: 'support' }), res, next)

    expect(getShipment).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalled()
  })

  it('allows an assigned driver and normalizes driverId', async () => {
    getShipment.mockResolvedValue({ driverId: 'driver-1' })
    const res = mockRes()
    const next = jest.fn()
    const req = mockReq({ body: {}, role: 'driver', sub: 'driver-1' })

    await requireWriteAuth(req, res, next)

    expect(req.body.driverId).toBe('driver-1')
    expect(next).toHaveBeenCalled()
  })

  it('rejects drivers assigned to a different shipment', async () => {
    getShipment.mockResolvedValue({ driverId: 'driver-2' })
    const res = mockRes()
    const next = jest.fn()

    await requireWriteAuth(mockReq({ role: 'driver', sub: 'driver-1' }), res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(next).not.toHaveBeenCalled()
  })

  it('rejects driverId spoofing from assigned drivers', async () => {
    getShipment.mockResolvedValue({ driverId: 'driver-1' })
    const res = mockRes()
    const next = jest.fn()

    await requireWriteAuth(
      mockReq({ body: { driverId: 'driver-2' }, role: 'driver', sub: 'driver-1' }),
      res,
      next
    )

    expect(res.status).toHaveBeenCalledWith(403)
    expect(next).not.toHaveBeenCalled()
  })
})
