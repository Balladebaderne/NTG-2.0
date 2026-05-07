const request = require('supertest')
const jwt = require('jsonwebtoken')
const { createApp } = require('../app')

jest.mock('../db')
const db = require('../db')

const TEST_SECRET = 'test-secret'
process.env.JWT_SECRET = TEST_SECRET

function makeToken({ sub, role }) {
  return jwt.sign({ role }, TEST_SECRET, { subject: sub })
}

const driverToken = makeToken({ sub: 'usr_driver', role: 'driver' })
const adminToken = makeToken({ sub: 'usr_admin', role: 'admin' })
const supportToken = makeToken({ sub: 'usr_support', role: 'support' })
const logisticsToken = makeToken({ sub: 'usr_logistics', role: 'logistics' })

describe('GET /drivers/:driverId/points', () => {
  let app

  beforeEach(() => {
    app = createApp()
    db.getPoints.mockResolvedValue(210)
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('returns 401 when Authorization header is missing', async () => {
    const res = await request(app).get('/drivers/usr_driver/points')
    expect(res.status).toBe(401)
  })

  it('returns 401 when token is invalid', async () => {
    const res = await request(app)
      .get('/drivers/usr_driver/points')
      .set('Authorization', 'Bearer not-a-valid-token')
    expect(res.status).toBe(401)
  })

  it('returns points when a Driver requests their own score', async () => {
    const res = await request(app)
      .get('/drivers/usr_driver/points')
      .set('Authorization', `Bearer ${driverToken}`)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ driver_id: 'usr_driver', points: 210 })
    expect(db.getPoints).toHaveBeenCalledWith('usr_driver')
  })

  it('returns 403 when a Driver requests another Driver\'s score', async () => {
    const res = await request(app)
      .get('/drivers/usr_other_driver/points')
      .set('Authorization', `Bearer ${driverToken}`)
    expect(res.status).toBe(403)
    expect(db.getPoints).not.toHaveBeenCalled()
  })

  it('allows admin to view any Driver\'s score', async () => {
    const res = await request(app)
      .get('/drivers/usr_driver/points')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.points).toBe(210)
  })

  it('allows support to view any Driver\'s score', async () => {
    const res = await request(app)
      .get('/drivers/usr_driver/points')
      .set('Authorization', `Bearer ${supportToken}`)
    expect(res.status).toBe(200)
    expect(res.body.points).toBe(210)
  })

  it('returns 403 for logistics role', async () => {
    const res = await request(app)
      .get('/drivers/usr_driver/points')
      .set('Authorization', `Bearer ${logisticsToken}`)
    expect(res.status).toBe(403)
  })

  it('returns 0 points for a Driver with no recorded activity', async () => {
    db.getPoints.mockResolvedValue(0)
    const res = await request(app)
      .get('/drivers/usr_driver/points')
      .set('Authorization', `Bearer ${driverToken}`)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ driver_id: 'usr_driver', points: 0 })
  })

  it('returns 500 when the database throws', async () => {
    db.getPoints.mockRejectedValue(new Error('DB unavailable'))
    jest.spyOn(console, 'error').mockImplementation(() => {})
    const res = await request(app)
      .get('/drivers/usr_driver/points')
      .set('Authorization', `Bearer ${driverToken}`)
    expect(res.status).toBe(500)
    console.error.mockRestore()
  })
})
