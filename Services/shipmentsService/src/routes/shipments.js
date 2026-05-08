const express = require('express')
const router = express.Router()
const Shipment = require('../models/Shipment')
const { requireWriteAuth } = require('../middleware/requireWriteAuth')

// GET /shipments — get all, filter by customerId or status
router.get('/', async (req, res) => {
  try {
    const filter = {}
    if (req.query.customerId) filter.receiverCustomerId = req.query.customerId
    if (req.query.receiverCustomerId) filter.receiverCustomerId = req.query.receiverCustomerId
    if (req.query.senderId) filter.senderId = req.query.senderId
    if (req.query.status) filter.status = req.query.status
    if (req.query.routeId) filter.routeId = req.query.routeId
    if (req.query.driverId) filter.driverId = req.query.driverId
    const shipments = await Shipment.find(filter)
    res.json(shipments)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /shipments/:id
router.get('/:id', async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id)
    if (!shipment) return res.status(404).json({ error: 'Shipment not found' })
    res.json(shipment)
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ error: 'Shipment not found' })
    res.status(500).json({ error: err.message })
  }
})

// POST /shipments
router.post('/', requireWriteAuth, async (req, res) => {
  try {
    const shipment = new Shipment(req.body)
    await shipment.save()
    res.status(201).json(shipment)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// PUT /shipments/:id
router.put('/:id', requireWriteAuth, async (req, res) => {
  try {
    const shipment = await Shipment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
    if (!shipment) return res.status(404).json({ error: 'Shipment not found' })
    res.json(shipment)
  } catch (err) {
    if (err.name === 'CastError' && err.path === '_id') {
      return res.status(404).json({ error: 'Shipment not found' })
    }
    res.status(400).json({ error: err.message })
  }
})

// DELETE /shipments/:id
router.delete('/:id', requireWriteAuth, async (req, res) => {
  try {
    const shipment = await Shipment.findByIdAndDelete(req.params.id)
    if (!shipment) return res.status(404).json({ error: 'Shipment not found' })
    res.json({ message: 'Shipment deleted' })
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ error: 'Shipment not found' })
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
