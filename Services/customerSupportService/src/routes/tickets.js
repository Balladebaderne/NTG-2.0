const express = require('express')
const router = express.Router()
const SupportTicket = require('../models/SupportTicket')

// GET /tickets — filter på status, agentId eller shipmentId
router.get('/', async (req, res) => {
  try {
    const filter = {}
    if (req.query.status)     filter.status = req.query.status
    if (req.query.agentId)    filter.agentId = req.query.agentId
    if (req.query.shipmentId) filter.shipmentId = req.query.shipmentId
    const tickets = await SupportTicket.find(filter).sort({ createdAt: -1 })
    res.json(tickets)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /tickets/:id
router.get('/:id', async (req, res) => {
  try {
    const ticket = await SupportTicket.findOne({ ticketId: req.params.id })
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' })
    res.json(ticket)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /tickets
router.post('/', async (req, res) => {
  try {
    const ticket = new SupportTicket(req.body)
    await ticket.save()
    res.status(201).json(ticket)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// PUT /tickets/:id
router.put('/:id', async (req, res) => {
  try {
    const ticket = await SupportTicket.findOneAndUpdate(
      { ticketId: req.params.id },
      req.body,
      { new: true, runValidators: true }
    )
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' })
    res.json(ticket)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// DELETE /tickets/:id
router.delete('/:id', async (req, res) => {
  try {
    const ticket = await SupportTicket.findOneAndDelete({ ticketId: req.params.id })
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' })
    res.json({ message: 'Ticket deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
