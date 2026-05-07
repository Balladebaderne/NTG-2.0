const express = require('express')
const {
  listNotifications,
  markNotificationRead,
} = require('../services/notificationsRepository')
const { scanForDelayedShipments } = require('../services/delayNotificationService')

const router = express.Router()

// GET /notifications?receiverCustomerId=customer-1&recipientRole=support&unreadOnly=true
router.get('/', async (req, res) => {
  try {
    const notifications = await listNotifications({
      receiverCustomerId: req.query.receiverCustomerId,
      recipientRole: req.query.recipientRole,
      unreadOnly: req.query.unreadOnly === 'true',
    })
    res.json(notifications)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /notifications/scan-delays
router.post('/scan-delays', async (req, res) => {
  try {
    const result = await scanForDelayedShipments()
    res.json(result)
  } catch (err) {
    res.status(502).json({ error: err.message })
  }
})

// PATCH /notifications/:id/read
router.patch('/:id/read', async (req, res) => {
  try {
    const notification = await markNotificationRead(req.params.id)
    if (!notification) return res.status(404).json({ error: 'Notification not found' })
    res.json(notification)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
