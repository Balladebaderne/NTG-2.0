const express = require('express')
const router = express.Router({ mergeParams: true })
const { v4: uuidv4 } = require('uuid')
const Shipment = require('../models/Shipment')

// POST /shipments/:id/goods/:goodsId/items
router.post('/', async (req, res) => {
  try {
    const shipment = await Shipment.findOne({ shipmentId: req.params.id })
    if (!shipment) return res.status(404).json({ error: 'Shipment not found' })
    const goods = shipment.goods.find(g => g.goodsId === req.params.goodsId)
    if (!goods) return res.status(404).json({ error: 'Goods not found' })
    const item = { itemId: uuidv4(), ...req.body }
    goods.items.push(item)
    await shipment.save()
    res.status(201).json(goods.items[goods.items.length - 1])
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// PUT /shipments/:id/goods/:goodsId/items/:itemId
router.put('/:itemId', async (req, res) => {
  try {
    const shipment = await Shipment.findOne({ shipmentId: req.params.id })
    if (!shipment) return res.status(404).json({ error: 'Shipment not found' })
    const goods = shipment.goods.find(g => g.goodsId === req.params.goodsId)
    if (!goods) return res.status(404).json({ error: 'Goods not found' })
    const item = goods.items.find(i => i.itemId === req.params.itemId)
    if (!item) return res.status(404).json({ error: 'Item not found' })
    Object.assign(item, req.body)
    await shipment.save()
    res.json(item)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// DELETE /shipments/:id/goods/:goodsId/items/:itemId
router.delete('/:itemId', async (req, res) => {
  try {
    const shipment = await Shipment.findOne({ shipmentId: req.params.id })
    if (!shipment) return res.status(404).json({ error: 'Shipment not found' })
    const goods = shipment.goods.find(g => g.goodsId === req.params.goodsId)
    if (!goods) return res.status(404).json({ error: 'Goods not found' })
    const idx = goods.items.findIndex(i => i.itemId === req.params.itemId)
    if (idx === -1) return res.status(404).json({ error: 'Item not found' })
    goods.items.splice(idx, 1)
    await shipment.save()
    res.json({ message: 'Item removed' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
