const express = require('express')
const router = express.Router()
const Shipment = require('../models/Shipment')
const { requireWriteAuth } = require('../middleware/requireWriteAuth')

const DRIVER_SERVICE_URL = process.env.DRIVER_SERVICE_URL || 'http://driver-service:5001'

async function assertDriverAvailable(driverId) {
  try {
    const res = await fetch(`${DRIVER_SERVICE_URL}/drivers/${encodeURIComponent(driverId)}`)
    if (!res.ok) return // driver not found — allow assignment, let driver service own that validation
    const driver = await res.json()
    if (driver.available === false) {
      const err = new Error(`Driver ${driver.name || driverId} is not available for assignment`)
      err.status = 422
      throw err
    }
  } catch (err) {
    if (err.status === 422) throw err
    // network/timeout — fail open so a driver service outage doesn't block shipment ops
  }
}

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
    if (req.body.driverId) await assertDriverAvailable(req.body.driverId)
    const shipment = new Shipment(req.body)
    await shipment.save()
    res.status(201).json(shipment)
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message })
  }
})

// PUT /shipments/:id
router.put('/:id', requireWriteAuth, async (req, res) => {
  try {
    if (req.body.driverId) await assertDriverAvailable(req.body.driverId)
    const shipment = await Shipment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
    if (!shipment) return res.status(404).json({ error: 'Shipment not found' })
    res.json(shipment)
  } catch (err) {
    if (err.status === 422) return res.status(422).json({ error: err.message })
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
