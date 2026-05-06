const express = require('express')
const router = express.Router()
const Shipment = require('../models/Shipment')

// GET /shipments — get all, filter by customerId or status
router.get('/', async (req, res) => {
  try {
    const filter = {}
    if (req.query.customerId) filter.receiverCustomerId = req.query.customerId
    if (req.query.status) filter.status = req.query.status
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
router.post('/', async (req, res) => {
  try {
    const shipment = new Shipment(req.body)
    await shipment.save()
    res.status(201).json(shipment)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// PUT /shipments/:id
router.put('/:id', async (req, res) => {
  try {
    const shipment = await Shipment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
    if (!shipment) return res.status(404).json({ error: 'Shipment not found' })
    res.json(shipment)
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ error: 'Shipment not found' })
    res.status(400).json({ error: err.message })
  }
})

// DELETE /shipments/:id
router.delete('/:id', async (req, res) => {
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
