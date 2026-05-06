const express = require('express')
const router = express.Router({ mergeParams: true })
const { v4: uuidv4 } = require('uuid')
const Shipment = require('../models/Shipment')

// POST /shipments/:id/goods
router.post('/', async (req, res) => {
  try {
    const shipment = await Shipment.findOne({ shipmentId: req.params.id })
    if (!shipment) return res.status(404).json({ error: 'Shipment not found' })
    const goods = { goodsId: uuidv4(), ...req.body, items: req.body.items || [] }
    shipment.goods.push(goods)
    await shipment.save()
    res.status(201).json(shipment.goods[shipment.goods.length - 1])
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// PUT /shipments/:id/goods/:goodsId
router.put('/:goodsId', async (req, res) => {
  try {
    const shipment = await Shipment.findOne({ shipmentId: req.params.id })
    if (!shipment) return res.status(404).json({ error: 'Shipment not found' })
    const goods = shipment.goods.find(g => g.goodsId === req.params.goodsId)
    if (!goods) return res.status(404).json({ error: 'Goods not found' })
    Object.assign(goods, req.body)
    await shipment.save()
    res.json(goods)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// DELETE /shipments/:id/goods/:goodsId
router.delete('/:goodsId', async (req, res) => {
  try {
    const shipment = await Shipment.findOne({ shipmentId: req.params.id })
    if (!shipment) return res.status(404).json({ error: 'Shipment not found' })
    const idx = shipment.goods.findIndex(g => g.goodsId === req.params.goodsId)
    if (idx === -1) return res.status(404).json({ error: 'Goods not found' })
    shipment.goods.splice(idx, 1)
    await shipment.save()
    res.json({ message: 'Goods removed' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
