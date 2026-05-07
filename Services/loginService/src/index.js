const { createApp } = require('./app')
const { createAuthService } = require('./login/auth.service')
const { createJwtService } = require('./login/jwt.service')
const { createUsersRepository } = require('./login/users.repository')

const PORT = process.env.PORT || 5001
const JWT_SECRET = process.env.JWT_SECRET || 'local-login-secret-change-me'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h'
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000'

async function start() {
  const usersRepository = createUsersRepository()
  const jwtService = createJwtService({
    expiresIn: JWT_EXPIRES_IN,
    secret: JWT_SECRET,
  })
  const authService = createAuthService({ jwtService, usersRepository })
  const app = createApp({
    authService,
    corsOrigin: CORS_ORIGIN,
  })

  app.listen(PORT, () => {
    console.log(`Login service listening on ${PORT}`)
  })
}

start().catch((error) => {
  console.error('Login service failed to start', error)
  process.exit(1)
})
