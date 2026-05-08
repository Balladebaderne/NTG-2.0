const request = require('supertest')
const { createApp } = require('../app')

function createTestApp({ authService }) {
  return createApp({
    authService,
    corsOrigin: 'http://localhost:3000',
  })
}

describe('Auth routes', () => {
  describe('GET /health', () => {
    it('returns service health', async () => {
      const app = createTestApp({
        authService: { login: jest.fn() },
      })

      const res = await request(app).get('/health')

      expect(res.status).toBe(200)
      expect(res.body).toEqual({ status: 'ok', service: 'login-service' })
    })
  })

  describe('POST /auth/login', () => {
    it('returns a token for valid credentials', async () => {
      const authService = {
        login: jest.fn().mockResolvedValue({ token: 'signed-token' }),
      }
      const app = createTestApp({ authService })

      const res = await request(app).post('/auth/login').send({
        email: 'admin@ntg.local',
        password: 'admin123',
      })

      expect(res.status).toBe(200)
      expect(res.body).toEqual({ token: 'signed-token' })
      expect(authService.login).toHaveBeenCalledWith({
        email: 'admin@ntg.local',
        password: 'admin123',
      })
    })

    it('returns 401 for invalid credentials', async () => {
      const error = new Error('Invalid credentials')
      error.code = 'INVALID_CREDENTIALS'
      const authService = {
        login: jest.fn().mockRejectedValue(error),
      }
      const app = createTestApp({ authService })

      const res = await request(app).post('/auth/login').send({
        email: 'admin@ntg.local',
        password: 'wrong-password',
      })

      expect(res.status).toBe(401)
      expect(res.body).toEqual({ message: 'Invalid email or password.' })
    })

    it('returns 500 when login fails unexpectedly', async () => {
      const authService = {
        login: jest.fn().mockRejectedValue(new Error('Database unavailable')),
      }
      const app = createTestApp({ authService })
      jest.spyOn(console, 'error').mockImplementation(() => {})

      const res = await request(app).post('/auth/login').send({
        email: 'admin@ntg.local',
        password: 'admin123',
      })

      expect(res.status).toBe(500)
      expect(res.body).toEqual({ message: 'Login failed.' })

      console.error.mockRestore()
    })
  })
})
