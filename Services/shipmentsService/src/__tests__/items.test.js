require('./setup')
const request = require('supertest')
const app = require('../app')

const validShipment = {
  senderId: 'sender-1',
  receiverCustomerId: 'customer-1',
  createdByCustomerServiceId: 'agent-1',
}

const validGoods = { totalWeightKG: 10, totalVolumeM3: 0.5 }
const validItem = { description: 'Box of bolts', weightKg: 2.5, volumeM3: 0.1 }

async function createShipmentWithGoods() {
  const shipRes = await request(app).post('/shipments').send(validShipment)
  const goodsRes = await request(app)
    .post(`/shipments/${shipRes.body._id}/goods`)
    .send(validGoods)
  return { shipment: shipRes.body, goods: goodsRes.body }
}

describe('Items API', () => {
  describe('POST /shipments/:id/goods/:goodsId/items', () => {
    it('adds an item to goods', async () => {
      const { shipment, goods } = await createShipmentWithGoods()
      const res = await request(app)
        .post(`/shipments/${shipment._id}/goods/${goods.goodsId}/items`)
        .send(validItem)
      expect(res.status).toBe(201)
      expect(res.body.itemId).toBeDefined()
      expect(res.body.description).toBe('Box of bolts')
    })

    it('returns 404 for unknown shipment', async () => {
      const res = await request(app)
        .post('/shipments/unknown/goods/unknown/items')
        .send(validItem)
      expect(res.status).toBe(404)
    })

    it('returns 404 for unknown goods', async () => {
      const shipRes = await request(app).post('/shipments').send(validShipment)
      const res = await request(app)
        .post(`/shipments/${shipRes.body._id}/goods/unknown-goods/items`)
        .send(validItem)
      expect(res.status).toBe(404)
    })

    it('returns 400 when required item fields are missing', async () => {
      const { shipment, goods } = await createShipmentWithGoods()
      const res = await request(app)
        .post(`/shipments/${shipment._id}/goods/${goods.goodsId}/items`)
        .send({})
      expect(res.status).toBe(400)
    })
  })

  describe('PUT /shipments/:id/goods/:goodsId/items/:itemId', () => {
    it('updates an item', async () => {
      const { shipment, goods } = await createShipmentWithGoods()
      const item = await request(app)
        .post(`/shipments/${shipment._id}/goods/${goods.goodsId}/items`)
        .send(validItem)
      const res = await request(app)
        .put(`/shipments/${shipment._id}/goods/${goods.goodsId}/items/${item.body.itemId}`)
        .send({ description: 'Updated description' })
      expect(res.status).toBe(200)
      expect(res.body.description).toBe('Updated description')
    })

    it('returns 404 for unknown item', async () => {
      const { shipment, goods } = await createShipmentWithGoods()
      const res = await request(app)
        .put(`/shipments/${shipment._id}/goods/${goods.goodsId}/items/unknown-item`)
        .send({ description: 'nope' })
      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /shipments/:id/goods/:goodsId/items/:itemId', () => {
    it('removes an item', async () => {
      const { shipment, goods } = await createShipmentWithGoods()
      const item = await request(app)
        .post(`/shipments/${shipment._id}/goods/${goods.goodsId}/items`)
        .send(validItem)
      const res = await request(app)
        .delete(`/shipments/${shipment._id}/goods/${goods.goodsId}/items/${item.body.itemId}`)
      expect(res.status).toBe(200)
    })

    it('returns 404 for unknown item', async () => {
      const { shipment, goods } = await createShipmentWithGoods()
      const res = await request(app)
        .delete(`/shipments/${shipment._id}/goods/${goods.goodsId}/items/unknown-item`)
      expect(res.status).toBe(404)
    })
  })
})
