const test = require('node:test')
const assert = require('node:assert/strict')
const jwt = require('jsonwebtoken')
const { requireWriteAuth } = require('../middleware/requireWriteAuth')

const TEST_SECRET = 'notification-test-secret'

function tokenFor(role, sub = `usr_${role}`) {
  return jwt.sign({ role, sub }, TEST_SECRET)
}

function mockReq({ role, sub } = {}) {
  const headers = {}
  if (role) headers.authorization = `Bearer ${tokenFor(role, sub)}`

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
    json(payload) {
      this.body = payload
      return this
    },
    status(code) {
      this.code = code
      return this
    },
  }
}

function withAuthEnv(fn) {
  return async () => {
    process.env.AUTH_REQUIRED = 'true'
    process.env.JWT_SECRET = TEST_SECRET
    delete process.env.SERVICE_AUTH_TOKEN

    try {
      await fn()
    } finally {
      delete process.env.AUTH_REQUIRED
      delete process.env.JWT_SECRET
      delete process.env.SERVICE_AUTH_TOKEN
    }
  }
}

test('notification writes require a token', withAuthEnv(() => {
  const res = mockRes()
  let called = false

  requireWriteAuth(mockReq(), res, () => { called = true })

  assert.equal(res.code, 401)
  assert.equal(called, false)
}))

test('notification writes reject customer and driver roles', withAuthEnv(() => {
  for (const role of ['customer', 'driver']) {
    const res = mockRes()
    let called = false

    requireWriteAuth(mockReq({ role }), res, () => { called = true })

    assert.equal(res.code, 403)
    assert.equal(called, false)
  }
}))

test('notification writes allow operator roles', withAuthEnv(() => {
  for (const role of ['admin', 'logistics', 'support']) {
    const res = mockRes()
    let called = false

    requireWriteAuth(mockReq({ role }), res, () => { called = true })

    assert.equal(res.code, null)
    assert.equal(called, true)
  }
}))
