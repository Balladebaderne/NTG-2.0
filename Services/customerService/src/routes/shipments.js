const express = require('express')
const router = express.Router({ mergeParams: true })
const axios = require('axios')

const SHIPMENTS_URL = process.env.SHIPMENTS_SERVICE_URL || 'http://localhost:5000'

// GET /customers/:id/shipments — overblik, filter på status og destination
router.get('/:id/shipments', async (req, res) => {
  try {
    const params = { customerId: req.params.id }
    if (req.query.status) params.status = req.query.status

    const { data } = await axios.get(`${SHIPMENTS_URL}/shipments`, { params })
    const shipments = req.query.destination
      ? data.filter((shipment) =>
          JSON.stringify(shipment).toLowerCase().includes(String(req.query.destination).toLowerCase())
        )
      : data

    res.json(shipments)
  } catch (err) {
    res.status(502).json({ error: 'Could not reach shipments service', details: err.message })
  }
})

// GET /customers/:id/shipments/:shipmentId — detaljer og event-historik
router.get('/:id/shipments/:shipmentId', async (req, res) => {
  try {
    const { data } = await axios.get(`${SHIPMENTS_URL}/shipments/${req.params.shipmentId}`)

    if (data.receiverCustomerId !== req.params.id) {
      return res.status(403).json({ error: 'Shipment does not belong to this customer' })
    }

    res.json(data)
  } catch (err) {
    if (err.response?.status === 404) return res.status(404).json({ error: 'Shipment not found' })
    res.status(502).json({ error: 'Could not reach shipments service', details: err.message })
  }
})

// GET /customers/:id/delays — forsendelser der er forsinket (in_transit i mere end 7 dage)
router.get('/:id/delays', async (req, res) => {
  try {
    const { data } = await axios.get(`${SHIPMENTS_URL}/shipments`, {
      params: { customerId: req.params.id, status: 'in_transit' },
    })

    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 7)

    const delayed = data.filter(s => new Date(s.createdAt) < cutoff)
    res.json({ count: delayed.length, shipments: delayed })
  } catch (err) {
    res.status(502).json({ error: 'Could not reach shipments service', details: err.message })
  }
})

// GET /customers/:id/stats — statistik: on-time rate, status-fordeling, destinationer
router.get('/:id/stats', async (req, res) => {
  try {
    const { data } = await axios.get(`${SHIPMENTS_URL}/shipments`, {
      params: { customerId: req.params.id },
    })

    const total = data.length
    const byStatus = data.reduce((acc, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1
      return acc
    }, {})

    const received = byStatus['received'] || 0
    const inTransit = byStatus['in_transit'] || 0

    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 7)
    const delayed = data.filter(s => s.status === 'in_transit' && new Date(s.createdAt) < cutoff).length

    const onTimeRate = total > 0
      ? Math.round(((received) / total) * 100)
      : null

    res.json({
      total,
      byStatus,
      delayed,
      onTimeRate: onTimeRate !== null ? `${onTimeRate}%` : 'N/A',
    })
  } catch (err) {
    res.status(502).json({ error: 'Could not reach shipments service', details: err.message })
  }
})

module.exports = router
