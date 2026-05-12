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

  describe('POST /auth/users', () => {
    it('creates a user when the auth service accepts the request', async () => {
      const authService = {
        createUser: jest.fn().mockResolvedValue({
          user: {
            email: 'driver2@ntg.local',
            id: 'driver-2',
            name: 'Driver Two',
            role: 'driver',
            roleLabel: 'Driver',
          },
        }),
        login: jest.fn(),
      }
      const app = createTestApp({ authService })

      const res = await request(app)
        .post('/auth/users')
        .set('Authorization', 'Bearer admin-token')
        .send({
          email: 'driver2@ntg.local',
          id: 'driver-2',
          name: 'Driver Two',
          password: 'driver123',
          role: 'driver',
        })

      expect(res.status).toBe(201)
      expect(res.body).toEqual({
        user: {
          email: 'driver2@ntg.local',
          id: 'driver-2',
          name: 'Driver Two',
          role: 'driver',
          roleLabel: 'Driver',
        },
      })
      expect(authService.createUser).toHaveBeenCalledWith({
        actorToken: 'admin-token',
        user: {
          email: 'driver2@ntg.local',
          id: 'driver-2',
          name: 'Driver Two',
          password: 'driver123',
          role: 'driver',
        },
      })
    })

    it('returns 403 when the caller is not an admin', async () => {
      const error = new Error('Admin role required')
      error.code = 'FORBIDDEN'
      const authService = {
        createUser: jest.fn().mockRejectedValue(error),
        login: jest.fn(),
      }
      const app = createTestApp({ authService })

      const res = await request(app)
        .post('/auth/users')
        .set('Authorization', 'Bearer support-token')
        .send({ email: 'driver2@ntg.local', name: 'Driver Two', password: 'driver123', role: 'driver' })

      expect(res.status).toBe(403)
      expect(res.body).toEqual({ message: 'Admin role required' })
    })

    it('returns 409 for duplicate user records', async () => {
      const error = new Error('Duplicate email')
      error.code = 'DUPLICATE_EMAIL'
      const authService = {
        createUser: jest.fn().mockRejectedValue(error),
        login: jest.fn(),
      }
      const app = createTestApp({ authService })

      const res = await request(app)
        .post('/auth/users')
        .set('Authorization', 'Bearer admin-token')
        .send({ email: 'driver2@ntg.local', name: 'Driver Two', password: 'driver123', role: 'driver' })

      expect(res.status).toBe(409)
      expect(res.body).toEqual({ message: 'A user with that email or id already exists.' })
    })
  })
})
