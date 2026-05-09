const jwt = require('jsonwebtoken')
const { requireWriteAuth } = require('../middleware/requireWriteAuth')

const TEST_SECRET = 'route-test-secret'

function tokenFor(role) {
  return jwt.sign({ role, sub: `usr_${role}` }, TEST_SECRET)
}

function mockReq({ role } = {}) {
  const headers = {}
  if (role) headers.authorization = `Bearer ${tokenFor(role)}`

  return {
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

describe('route write authorization', () => {
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

  it('rejects writes without a token', () => {
    const res = mockRes()
    const next = jest.fn()

    requireWriteAuth(mockReq(), res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('rejects customer and driver roles', () => {
    for (const role of ['customer', 'driver']) {
      const res = mockRes()
      const next = jest.fn()

      requireWriteAuth(mockReq({ role }), res, next)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(next).not.toHaveBeenCalled()
    }
  })

  it('allows operator roles', () => {
    for (const role of ['admin', 'logistics', 'support']) {
      const res = mockRes()
      const next = jest.fn()

      requireWriteAuth(mockReq({ role }), res, next)

      expect(next).toHaveBeenCalled()
    }
  })
})
