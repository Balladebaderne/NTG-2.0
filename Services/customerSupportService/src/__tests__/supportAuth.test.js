const jwt = require('jsonwebtoken')
const {
  requireTicketCreateAuth,
  requireTicketManageAuth,
} = require('../middleware/requireWriteAuth')

const TEST_SECRET = 'support-test-secret'

function tokenFor(role, sub = `usr_${role}`) {
  return jwt.sign({ role, sub }, TEST_SECRET)
}

function mockReq({ body = {}, role, sub } = {}) {
  const headers = {}
  if (role) headers.authorization = `Bearer ${tokenFor(role, sub)}`

  return {
    body,
    get(name) {
      return headers[String(name).toLowerCase()] || ''
    },
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

describe('support ticket authorization', () => {
  beforeEach(() => {
    process.env.AUTH_REQUIRED = 'true'
    process.env.JWT_SECRET = TEST_SECRET
    delete process.env.SERVICE_AUTH_TOKEN
  })

  afterEach(() => {
    delete process.env.AUTH_REQUIRED
    delete process.env.JWT_SECRET
    delete process.env.SERVICE_AUTH_TOKEN
  })

  it('allows customers to create tickets for their own customer id only', () => {
    const req = mockReq({
      body: { agentId: 'spoofed', customerId: 'customer-1', status: 'resolved' },
      role: 'customer',
      sub: 'customer-1',
    })
    const res = mockRes()
    const next = jest.fn()

    requireTicketCreateAuth(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(req.body.agentId).toBe('customer-1')
    expect(req.body.status).toBe('open')
  })

  it('rejects customer tickets for another customer id', () => {
    const res = mockRes()
    const next = jest.fn()

    requireTicketCreateAuth(
      mockReq({ body: { customerId: 'customer-2' }, role: 'customer', sub: 'customer-1' }),
      res,
      next
    )

    expect(res.status).toHaveBeenCalledWith(403)
    expect(next).not.toHaveBeenCalled()
  })

  it('allows operator roles to create and manage tickets', () => {
    const createNext = jest.fn()
    const manageNext = jest.fn()

    requireTicketCreateAuth(
      mockReq({ body: { customerId: 'customer-2' }, role: 'support', sub: 'usr_support' }),
      mockRes(),
      createNext
    )
    requireTicketManageAuth(
      mockReq({ role: 'logistics', sub: 'usr_logistics' }),
      mockRes(),
      manageNext
    )

    expect(createNext).toHaveBeenCalled()
    expect(manageNext).toHaveBeenCalled()
  })

  it('rejects customers managing ticket status', () => {
    const res = mockRes()
    const next = jest.fn()

    requireTicketManageAuth(mockReq({ role: 'customer', sub: 'customer-1' }), res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(next).not.toHaveBeenCalled()
  })
})
