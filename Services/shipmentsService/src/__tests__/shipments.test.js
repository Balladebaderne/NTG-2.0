require('./setup')
const jwt = require('jsonwebtoken')
const request = require('supertest')
const app = require('../app')
const Shipment = require('../models/Shipment')

const TEST_SECRET = 'shipments-test-secret'
const validShipment = {
  senderId: 'sender-1',
  receiverCustomerId: 'customer-1',
  createdByCustomerServiceId: 'agent-1',
}

function tokenFor(role) {
  return jwt.sign(
    {
      email: `${role}@ntg.local`,
      name: `NTG ${role}`,
      role,
      sub: `usr_${role}`,
    },
    TEST_SECRET
  )
}

function bearer(role) {
  return `Bearer ${tokenFor(role)}`
}

describe('Shipments API', () => {
  describe('write authorization', () => {
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

    it('rejects shipment creation without a token', async () => {
      const res = await request(app).post('/shipments').send(validShipment)

      expect(res.status).toBe(401)
      expect(res.body.error).toBe('Authentication required')
    })

    it('rejects shipment creation for customer and driver roles', async () => {
      for (const role of ['customer', 'driver']) {
        const res = await request(app)
          .post('/shipments')
          .set('Authorization', bearer(role))
          .send(validShipment)

        expect(res.status).toBe(403)
        expect(res.body.error).toBe('Role is not permitted to modify shipments')
      }
    })

    it('allows shipment creation for admin, logistics, and support roles', async () => {
      for (const role of ['admin', 'logistics', 'support']) {
        const res = await request(app)
          .post('/shipments')
          .set('Authorization', bearer(role))
          .send(validShipment)

        expect(res.status).toBe(201)
        expect(res.body._id).toBeDefined()
      }
    })

    it('rejects driver assignment for non-operator roles', async () => {
      const created = await request(app)
        .post('/shipments')
        .set('Authorization', bearer('admin'))
        .send(validShipment)

      const res = await request(app)
        .put(`/shipments/${created.body._id}`)
        .set('Authorization', bearer('customer'))
        .send({ driverId: 'driver-uuid-1' })

      expect(res.status).toBe(403)
      expect(res.body.error).toBe('Role is not permitted to modify shipments')
    })

    it('allows internal service-token writes', async () => {
      process.env.SERVICE_AUTH_TOKEN = 'test-service-token'

      const res = await request(app)
        .post('/shipments')
        .set('x-service-token', 'test-service-token')
        .send(validShipment)

      expect(res.status).toBe(201)
      expect(res.body._id).toBeDefined()
    })
  })

  describe('POST /shipments', () => {
    it('creates a shipment with status booked', async () => {
      const res = await request(app).post('/shipments').send(validShipment)
      expect(res.status).toBe(201)
      expect(res.body.status).toBe('booked')
      expect(res.body._id).toBeDefined()
    })

    it('creates a shipment with an estimated arrival', async () => {
      const estimatedArrivalAt = '2026-05-07T14:00:00.000Z'
      const res = await request(app)
        .post('/shipments')
        .send({ ...validShipment, estimatedArrivalAt })

      expect(res.status).toBe(201)
      expect(res.body.estimatedArrivalAt).toBe(estimatedArrivalAt)
    })

    it('creates a shipment without a driver assignment by default', async () => {
      const res = await request(app).post('/shipments').send(validShipment)

      expect(res.status).toBe(201)
      expect(res.body.driverId).toBeNull()
    })

    it('returns 400 when required fields are missing', async () => {
      const res = await request(app).post('/shipments').send({})
      expect(res.status).toBe(400)
    })
  })

  describe('GET /shipments', () => {
    it('returns all shipments', async () => {
      await request(app).post('/shipments').send(validShipment)
      await request(app).post('/shipments').send({ ...validShipment, receiverCustomerId: 'customer-2' })
      const res = await request(app).get('/shipments')
      expect(res.status).toBe(200)
      expect(res.body.length).toBe(2)
    })

    it('filters by customerId', async () => {
      await request(app).post('/shipments').send(validShipment)
      await request(app).post('/shipments').send({ ...validShipment, receiverCustomerId: 'customer-2' })
      const res = await request(app).get('/shipments?customerId=customer-2')
      expect(res.status).toBe(200)
      expect(res.body.length).toBe(1)
      expect(res.body[0].receiverCustomerId).toBe('customer-2')
    })

    it('filters by receiverCustomerId', async () => {
      await request(app).post('/shipments').send(validShipment)
      await request(app).post('/shipments').send({ ...validShipment, receiverCustomerId: 'customer-2' })

      const res = await request(app).get('/shipments?receiverCustomerId=customer-2')

      expect(res.status).toBe(200)
      expect(res.body.length).toBe(1)
      expect(res.body[0].receiverCustomerId).toBe('customer-2')
    })

    it('filters by senderId', async () => {
      await request(app).post('/shipments').send(validShipment)
      await request(app).post('/shipments').send({ ...validShipment, senderId: 'sender-2' })

      const res = await request(app).get('/shipments?senderId=sender-2')

      expect(res.status).toBe(200)
      expect(res.body.length).toBe(1)
      expect(res.body[0].senderId).toBe('sender-2')
    })

    it('filters by status', async () => {
      const created = await request(app).post('/shipments').send(validShipment)
      await request(app).put(`/shipments/${created.body._id}`).send({ status: 'in_transit' })
      await request(app).post('/shipments').send(validShipment)

      const res = await request(app).get('/shipments?status=in_transit')
      expect(res.status).toBe(200)
      expect(res.body.length).toBe(1)
      expect(res.body[0].status).toBe('in_transit')
    })

    it('filters by routeId', async () => {
      const created = await request(app).post('/shipments').send(validShipment)
      await request(app).put(`/shipments/${created.body._id}`).send({ routeId: 'route-1' })
      await request(app).post('/shipments').send(validShipment)

      const res = await request(app).get('/shipments?routeId=route-1')

      expect(res.status).toBe(200)
      expect(res.body.length).toBe(1)
      expect(res.body[0].routeId).toBe('route-1')
    })

    it('filters by driverId', async () => {
      const created = await request(app).post('/shipments').send(validShipment)
      await request(app).put(`/shipments/${created.body._id}`).send({ driverId: 'driver-uuid-1' })
      await request(app).post('/shipments').send(validShipment)

      const res = await request(app).get('/shipments?driverId=driver-uuid-1')

      expect(res.status).toBe(200)
      expect(res.body.length).toBe(1)
      expect(res.body[0].driverId).toBe('driver-uuid-1')
    })
  })

  describe('GET /shipments/:id', () => {
    it('returns a shipment by id', async () => {
      const created = await request(app).post('/shipments').send(validShipment)
      const res = await request(app).get(`/shipments/${created.body._id}`)
      expect(res.status).toBe(200)
      expect(res.body._id).toBe(created.body._id)
    })

    it('returns 404 for unknown id', async () => {
      const res = await request(app).get('/shipments/does-not-exist')
      expect(res.status).toBe(404)
    })
  })

  describe('PUT /shipments/:id', () => {
    it('updates status from booked to in_transit', async () => {
      const created = await request(app).post('/shipments').send(validShipment)
      const res = await request(app).put(`/shipments/${created.body._id}`).send({ status: 'in_transit' })
      expect(res.status).toBe(200)
      expect(res.body.status).toBe('in_transit')
    })

    it('updates estimated arrival', async () => {
      const created = await request(app).post('/shipments').send(validShipment)
      const estimatedArrivalAt = '2026-05-07T15:30:00.000Z'
      const res = await request(app)
        .put(`/shipments/${created.body._id}`)
        .send({ estimatedArrivalAt })

      expect(res.status).toBe(200)
      expect(res.body.estimatedArrivalAt).toBe(estimatedArrivalAt)
    })

    it('assigns a driver by driverService id', async () => {
      const created = await request(app).post('/shipments').send(validShipment)
      const res = await request(app)
        .put(`/shipments/${created.body._id}`)
        .send({ driverId: 'driver-uuid-1' })

      expect(res.status).toBe(200)
      expect(res.body.driverId).toBe('driver-uuid-1')
    })

    it('returns 400 for invalid estimated arrival', async () => {
      const created = await request(app).post('/shipments').send(validShipment)
      const res = await request(app)
        .put(`/shipments/${created.body._id}`)
        .send({ estimatedArrivalAt: 'not-a-date' })

      expect(res.status).toBe(400)
    })

    it('returns 400 for invalid status', async () => {
      const created = await request(app).post('/shipments').send(validShipment)
      const res = await request(app).put(`/shipments/${created.body._id}`).send({ status: 'lost' })
      expect(res.status).toBe(400)
    })

    it('returns 404 for unknown id', async () => {
      const res = await request(app).put('/shipments/does-not-exist').send({ status: 'in_transit' })
      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /shipments/:id', () => {
    it('deletes a shipment', async () => {
      const created = await request(app).post('/shipments').send(validShipment)
      const res = await request(app).delete(`/shipments/${created.body._id}`)
      expect(res.status).toBe(200)
      const check = await request(app).get(`/shipments/${created.body._id}`)
      expect(check.status).toBe(404)
    })

    it('returns 404 for unknown id', async () => {
      const res = await request(app).delete('/shipments/does-not-exist')
      expect(res.status).toBe(404)
    })
  })
})
