const express = require('express')

const TrackingEvent = require('../models/TrackingEvent')
const { syncShipmentStatus, verifyShipmentExists } = require('../services/shipmentsClient')

const router = express.Router({ mergeParams: true })

function sendError(res, err) {
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(err.details ? { details: err.details } : {}),
  })
}

router.get('/', async (req, res) => {
  try {
    const summary = await TrackingEvent.summaryForShipment(req.params.shipmentId)
    res.json(summary)
  } catch (err) {
    sendError(res, err)
  }
})

router.get('/latest', async (req, res) => {
  try {
    const summary = await TrackingEvent.summaryForShipment(req.params.shipmentId)
    res.json(summary)
  } catch (err) {
    sendError(res, err)
  }
})

router.get('/events', async (req, res) => {
  try {
    const parsedLimit = Number(req.query.limit || 100)
    if (!Number.isInteger(parsedLimit) || parsedLimit < 1) {
      return res.status(400).json({ error: 'limit must be a positive integer' })
    }

    const limit = Math.min(parsedLimit, 500)
    const order = req.query.order === 'desc' ? 'desc' : 'asc'
    const events = await TrackingEvent.listByShipment(req.params.shipmentId, { limit, order })
    res.json(events)
  } catch (err) {
    sendError(res, err)
  }
})

router.post('/events', async (req, res) => {
  try {
    await verifyShipmentExists(req.params.shipmentId)

    const input = TrackingEvent.buildEventInput(req.params.shipmentId, req.body)
    const { event, duplicate } = await TrackingEvent.create(input)
    const shipmentStatusSync = duplicate
      ? { status: 'skipped', reason: 'duplicate idempotencyKey' }
      : await syncShipmentStatus(req.params.shipmentId, TrackingEvent.SYNC_STATUS_BY_EVENT[input.eventType])

    res.status(201).json({ event, shipmentStatusSync })
  } catch (err) {
    sendError(res, err)
  }
})

router.post('/location', async (req, res) => {
  try {
    const body = {
      eventType: 'location_updated',
      status: 'in_transit',
      occurredAt: req.body.occurredAt,
      location: req.body.location,
      routeId: req.body.routeId,
      driverId: req.body.driverId,
      notes: req.body.notes,
      idempotencyKey: req.body.idempotencyKey,
    }

    await verifyShipmentExists(req.params.shipmentId)

    const input = TrackingEvent.buildEventInput(req.params.shipmentId, body)
    const { event, duplicate } = await TrackingEvent.create(input)

    res.status(201).json({
      event,
      shipmentStatusSync: duplicate
        ? { status: 'skipped', reason: 'duplicate idempotencyKey' }
        : { status: 'skipped', reason: 'location update does not change Shipment lifecycle status' },
    })
  } catch (err) {
    sendError(res, err)
  }
})

module.exports = router
