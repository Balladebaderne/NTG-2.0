const express = require('express')
const router = express.Router()
const axios = require('axios')

const SHIPMENTS_URL = process.env.SHIPMENTS_SERVICE_URL || 'http://localhost:5000'

// Forsinket = in_transit i mere end 7 dage
const DELAY_DAYS = 7

// GET /search/tracking?id=<shipmentId> — søg på tracking-ID
router.get('/tracking', async (req, res) => {
  try {
    if (!req.query.id) return res.status(400).json({ error: 'Query param "id" is required' })
    const { data } = await axios.get(`${SHIPMENTS_URL}/shipments/${req.query.id}`)
    res.json(data)
  } catch (err) {
    if (err.response?.status === 404) return res.status(404).json({ error: 'Shipment not found' })
    res.status(502).json({ error: 'Could not reach shipments service', details: err.message })
  }
})

// GET /search/shipments?destination=<x>&reference=<x> — søg på reference eller destination
router.get('/shipments', async (req, res) => {
  try {
    const { destination, reference } = req.query
    if (!destination && !reference) {
      return res.status(400).json({ error: 'At least one of "destination" or "reference" is required' })
    }

    const { data } = await axios.get(`${SHIPMENTS_URL}/shipments`)
    const destinationQuery = String(destination || '').toLowerCase()
    const referenceQuery = String(reference || '').toLowerCase()

    const shipments = data.filter((shipment) => {
      const text = JSON.stringify(shipment).toLowerCase()
      const matchesDestination = destinationQuery ? text.includes(destinationQuery) : true
      const matchesReference = referenceQuery
        ? String(shipment._id || shipment.id || shipment.shipmentId || '').toLowerCase().includes(referenceQuery)
          || text.includes(referenceQuery)
        : true

      return matchesDestination && matchesReference
    })

    res.json(shipments)
  } catch (err) {
    res.status(502).json({ error: 'Could not reach shipments service', details: err.message })
  }
})

// GET /search/delayed — forsinkede shipments (in_transit > 7 dage)
router.get('/delayed', async (req, res) => {
  try {
    const { data } = await axios.get(`${SHIPMENTS_URL}/shipments`, {
      params: { status: 'in_transit' },
    })

    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - DELAY_DAYS)

    const delayed = data.filter(s => new Date(s.createdAt) < cutoff)
    res.json({ count: delayed.length, shipments: delayed })
  } catch (err) {
    res.status(502).json({ error: 'Could not reach shipments service', details: err.message })
  }
})

// GET /search/missing-events — shipments der har ingen events (tom goods-liste)
router.get('/missing-events', async (req, res) => {
  try {
    const { data } = await axios.get(`${SHIPMENTS_URL}/shipments`)

    // Shipments med ingen goods betragtes som manglende events
    const missing = data.filter(s => !s.goods || s.goods.length === 0)
    res.json({ count: missing.length, shipments: missing })
  } catch (err) {
    res.status(502).json({ error: 'Could not reach shipments service', details: err.message })
  }
})

// GET /search/discrepancies — uoverensstemmelser: booked/in_transit uden goods, eller received uden routeId
router.get('/discrepancies', async (req, res) => {
  try {
    const { data } = await axios.get(`${SHIPMENTS_URL}/shipments`)

    const discrepancies = data.reduce((acc, s) => {
      const issues = []

      if (['booked', 'in_transit'].includes(s.status) && (!s.goods || s.goods.length === 0)) {
        issues.push('active shipment has no goods registered')
      }
      if (s.status === 'received' && !s.routeId) {
        issues.push('received shipment has no routeId')
      }
      if (s.status === 'in_transit' && !s.routeId) {
        issues.push('in_transit shipment has no routeId')
      }

      if (issues.length > 0) acc.push({ shipment: s, issues })
      return acc
    }, [])

    res.json({ count: discrepancies.length, discrepancies })
  } catch (err) {
    res.status(502).json({ error: 'Could not reach shipments service', details: err.message })
  }
})

module.exports = router
