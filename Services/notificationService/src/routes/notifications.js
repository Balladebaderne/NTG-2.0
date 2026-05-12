const express = require('express')
const {
  listNotifications,
  markNotificationRead,
} = require('../services/notificationsRepository')
const {
  createDriverDelayNotifications,
  createDriverDeliveryNotifications,
  scanForDelayedShipments,
} = require('../services/delayNotificationService')
const { requireWriteAuth } = require('../middleware/requireWriteAuth')

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

// POST /notifications/driver-delay
router.post('/driver-delay', requireWriteAuth, async (req, res) => {
  try {
    const result = await createDriverDelayNotifications({
      driverId: req.body.driverId,
      notes: req.body.notes,
      occurredAt: req.body.occurredAt,
      receiverCustomerId: req.body.receiverCustomerId,
      shipmentId: req.body.shipmentId,
      trackingEventId: req.body.trackingEventId,
    })

    res.status(201).json(result)
  } catch (err) {
    const status = /shipmentId is required/.test(err.message) ? 400 : 500
    res.status(status).json({ error: err.message })
  }
})

// POST /notifications/driver-delivery
router.post('/driver-delivery', requireWriteAuth, async (req, res) => {
  try {
    const result = await createDriverDeliveryNotifications({
      driverId: req.body.driverId,
      notes: req.body.notes,
      occurredAt: req.body.occurredAt,
      shipmentId: req.body.shipmentId,
      trackingEventId: req.body.trackingEventId,
    })

    res.status(201).json(result)
  } catch (err) {
    const status = /shipmentId is required/.test(err.message) ? 400 : 500
    res.status(status).json({ error: err.message })
  }
})

// POST /notifications/scan-delays
router.post('/scan-delays', requireWriteAuth, async (req, res) => {
  try {
    const result = await scanForDelayedShipments()
    res.json(result)
  } catch (err) {
    res.status(502).json({ error: err.message })
  }
})

// PATCH /notifications/:id/read
router.patch('/:id/read', requireWriteAuth, async (req, res) => {
  try {
    const notification = await markNotificationRead(req.params.id)
    if (!notification) return res.status(404).json({ error: 'Notification not found' })
    res.json(notification)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
