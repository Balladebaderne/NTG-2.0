const { randomUUID } = require('crypto')

const ROLE_LABELS = {
  customer: 'Customer',
  driver: 'Driver',
  logistics: 'Logistics Manager',
}

const CREATE_USER_ROLES = new Set(Object.keys(ROLE_LABELS))

function createAuthService({ jwtService, usersRepository }) {
  return {
    async login({ email, password }) {
      if (!email || !password) {
        throw invalidCredentials()
      }

      const user = await usersRepository.findByEmail(email)
      const passwordMatches = user ? user.password === password : false

      if (!user || !passwordMatches) {
        throw invalidCredentials()
      }

      const tokenUser = {
        id: user.id,
        customerId: user.customerId || null,
        email: user.email,
        name: user.name,
        role: user.role,
        roleLabel: user.roleLabel,
      }

      return {
        token: jwtService.signForUser(tokenUser),
      }
    },
    async createUser({ actorToken, user }) {
      const actor = verifyActor({ actorToken, jwtService })
      if (normalizeRole(actor.role) !== 'admin') {
        throw forbidden()
      }

      const preparedUser = prepareUser(user)
      const savedUser = await usersRepository.create(preparedUser)

      return {
        user: sanitizeUser(savedUser),
      }
    },
  }
}

function prepareUser(input = {}) {
  const id = clean(input.id) || randomUUID()
  const name = clean(input.name)
  const email = clean(input.email).toLowerCase()
  const password = String(input.password || '')
  const role = normalizeRole(input.role)
  const roleLabel = clean(input.roleLabel) || ROLE_LABELS[role]
  let customerId = clean(input.customerId) || null

  if (!name || !email || !password || !role) {
    throw validationError('name, email, password, and role are required')
  }

  if (!CREATE_USER_ROLES.has(role)) {
    throw validationError('role must be driver, customer, or logistics')
  }

  if (!email.includes('@')) {
    throw validationError('email must be valid')
  }

  if (role === 'customer' && !customerId) {
    customerId = id
  }

  if (role === 'logistics' && !customerId) {
    throw validationError('customerId is required for logistics users')
  }

  return {
    id,
    ...(customerId ? { customerId } : {}),
    name,
    email,
    password,
    role,
    roleLabel,
  }
}

function verifyActor({ actorToken, jwtService }) {
  if (!actorToken) {
    const error = new Error('Authentication required')
    error.code = 'AUTH_REQUIRED'
    throw error
  }

  try {
    return jwtService.verifyToken(actorToken)
  } catch {
    const error = new Error('Invalid or expired token')
    error.code = 'INVALID_TOKEN'
    throw error
  }
}

function sanitizeUser(user) {
  const { password, ...safeUser } = user
  return safeUser
}

function normalizeRole(role) {
  return clean(role).toLowerCase()
}

function clean(value) {
  return String(value || '').trim()
}

function validationError(message) {
  const error = new Error(message)
  error.code = 'VALIDATION_FAILED'
  return error
}

function forbidden() {
  const error = new Error('Admin role required')
  error.code = 'FORBIDDEN'
  return error
}

function invalidCredentials() {
  const error = new Error('Invalid credentials')
  error.code = 'INVALID_CREDENTIALS'
  return error
}

module.exports = { createAuthService }
