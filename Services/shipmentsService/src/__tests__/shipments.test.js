require('./setup')
const request = require('supertest')
const app = require('../app')
const Shipment = require('../models/Shipment')

const validShipment = {
  senderId: 'sender-1',
  receiverCustomerId: 'customer-1',
  createdByCustomerServiceId: 'agent-1',
}

describe('Shipments API', () => {
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

    it('filters by status', async () => {
      const created = await request(app).post('/shipments').send(validShipment)
      await request(app).put(`/shipments/${created.body._id}`).send({ status: 'in_transit' })
      await request(app).post('/shipments').send(validShipment)

      const res = await request(app).get('/shipments?status=in_transit')
      expect(res.status).toBe(200)
      expect(res.body.length).toBe(1)
      expect(res.body[0].status).toBe('in_transit')
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
