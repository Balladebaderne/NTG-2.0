require('./setup')
const request = require('supertest')
const app = require('../app')

const validShipment = {
  senderId: 'sender-1',
  receiverCustomerId: 'customer-1',
  createdByCustomerServiceId: 'agent-1',
}

const validGoods = {
  totalWeightKG: 10,
  totalVolumeM3: 0.5,
}

async function createShipment() {
  const res = await request(app).post('/shipments').send(validShipment)
  return res.body
}

describe('Goods API', () => {
  describe('POST /shipments/:id/goods', () => {
    it('adds goods to a shipment', async () => {
      const shipment = await createShipment()
      const res = await request(app)
        .post(`/shipments/${shipment.shipmentId}/goods`)
        .send(validGoods)
      expect(res.status).toBe(201)
      expect(res.body.goodsId).toBeDefined()
      expect(res.body.totalWeightKG).toBe(10)
    })

    it('returns 404 for unknown shipment', async () => {
      const res = await request(app)
        .post('/shipments/unknown/goods')
        .send(validGoods)
      expect(res.status).toBe(404)
    })

    it('returns 400 when required fields are missing', async () => {
      const shipment = await createShipment()
      const res = await request(app)
        .post(`/shipments/${shipment.shipmentId}/goods`)
        .send({})
      expect(res.status).toBe(400)
    })
  })

  describe('PUT /shipments/:id/goods/:goodsId', () => {
    it('updates goods fields', async () => {
      const shipment = await createShipment()
      const goods = await request(app)
        .post(`/shipments/${shipment.shipmentId}/goods`)
        .send(validGoods)
      const res = await request(app)
        .put(`/shipments/${shipment.shipmentId}/goods/${goods.body.goodsId}`)
        .send({ totalWeightKG: 20 })
      expect(res.status).toBe(200)
      expect(res.body.totalWeightKG).toBe(20)
    })

    it('returns 404 for unknown goods', async () => {
      const shipment = await createShipment()
      const res = await request(app)
        .put(`/shipments/${shipment.shipmentId}/goods/unknown-goods`)
        .send({ totalWeightKG: 20 })
      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /shipments/:id/goods/:goodsId', () => {
    it('removes goods from a shipment', async () => {
      const shipment = await createShipment()
      const goods = await request(app)
        .post(`/shipments/${shipment.shipmentId}/goods`)
        .send(validGoods)
      const res = await request(app)
        .delete(`/shipments/${shipment.shipmentId}/goods/${goods.body.goodsId}`)
      expect(res.status).toBe(200)
    })

    it('returns 404 for unknown goods', async () => {
      const shipment = await createShipment()
      const res = await request(app)
        .delete(`/shipments/${shipment.shipmentId}/goods/unknown-goods`)
      expect(res.status).toBe(404)
    })
  })
})
