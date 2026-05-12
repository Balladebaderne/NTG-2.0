const express = require('express')

const TrackingEvent = require('../models/TrackingEvent')
const { requireWriteAuth } = require('../middleware/requireWriteAuth')
const {
  dispatchDriverDelayNotification,
  dispatchDriverDeliveryNotification,
} = require('../services/notificationsClient')
const { syncShipmentStatus, verifyShipmentExists, getShipment } = require('../services/shipmentsClient')
const { publishTrackingEvent } = require('../services/trackingEventsPublisher')

const router = express.Router({ mergeParams: true })

function sendError(res, err) {
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(err.details ? { details: err.details } : {}),
  })
}

function parseHistoryQuery(req, res) {
  const parsedLimit = Number(req.query.limit || 100)
  if (!Number.isInteger(parsedLimit) || parsedLimit < 1) {
    res.status(400).json({ error: 'limit must be a positive integer' })
    return null
  }

  return {
    limit: Math.min(parsedLimit, 500),
    order: req.query.order === 'desc' ? 'desc' : 'asc',
  }
}

function shipmentReference(req) {
  return req.params.shipmentNumber || req.params.shipmentId
}

router.get('/', async (req, res) => {
  try {
    const summary = await TrackingEvent.summaryForShipment(shipmentReference(req))
    res.json(summary)
  } catch (err) {
    sendError(res, err)
  }
})

router.get('/latest', async (req, res) => {
  try {
    const summary = await TrackingEvent.summaryForShipment(shipmentReference(req))
    res.json(summary)
  } catch (err) {
    sendError(res, err)
  }
})

router.get('/status', async (req, res) => {
  try {
    const options = parseHistoryQuery(req, res)
    if (!options) return

    const shipmentNumber = shipmentReference(req)
    await verifyShipmentExists(shipmentNumber)

    const statusHistory = await TrackingEvent.statusHistoryForShipment(shipmentNumber, options)
    res.json(statusHistory)
  } catch (err) {
    sendError(res, err)
  }
})

router.get('/events', async (req, res) => {
  try {
    const options = parseHistoryQuery(req, res)
    if (!options) return

    const events = await TrackingEvent.listByShipment(shipmentReference(req), options)
    res.json(events)
  } catch (err) {
    sendError(res, err)
  }
})

router.post('/events', requireWriteAuth, async (req, res) => {
  try {
    const shipmentNumber = shipmentReference(req)
    await verifyShipmentExists(shipmentNumber)

    let shipmentContext
    async function loadShipmentContext() {
      if (shipmentContext !== undefined) return shipmentContext
      try {
        shipmentContext = await getShipment(shipmentNumber)
      } catch {
        shipmentContext = null
      }
      return shipmentContext
    }

    let routeId = req.body.routeId || null
    if (!routeId) {
      const shipment = await loadShipmentContext()
      routeId = shipment?.routeId || null
    }

    const input = TrackingEvent.buildEventInput(shipmentNumber, { ...req.body, routeId })
    const { event, duplicate } = await TrackingEvent.create(input)
    const isPlanned = input.isPlanned === true

    const shipmentStatusSync = duplicate
      ? { status: 'skipped', reason: 'duplicate idempotencyKey' }
      : isPlanned
        ? { status: 'skipped', reason: 'planned event does not change shipment status' }
        : await syncShipmentStatus(shipmentNumber, TrackingEvent.SYNC_STATUS_BY_EVENT[input.eventType])
    const trackingEventPublish = duplicate
      ? { status: 'skipped', reason: 'duplicate idempotencyKey' }
      : isPlanned
        ? { status: 'skipped', reason: 'planned event is not published to broker' }
        : await publishTrackingEvent(event)
    let driverDelayNotification
    if (duplicate || isPlanned) {
      driverDelayNotification = { status: 'skipped', reason: isPlanned ? 'planned event' : 'duplicate idempotencyKey' }
    } else {
      const notificationEvent = input.eventType === 'delay_logged'
        ? { ...event, receiverCustomerId: (await loadShipmentContext())?.receiverCustomerId }
        : event
      driverDelayNotification = await dispatchDriverDelayNotification(notificationEvent)
    }
    const driverDeliveryNotification = duplicate || isPlanned
      ? { status: 'skipped', reason: isPlanned ? 'planned event' : 'duplicate idempotencyKey' }
      : await dispatchDriverDeliveryNotification(event)

    res.status(201).json({
      event,
      shipmentStatusSync,
      trackingEventPublish,
      driverDelayNotification,
      driverDeliveryNotification,
    })
  } catch (err) {
    sendError(res, err)
  }
})

router.post('/location', requireWriteAuth, async (req, res) => {
  try {
    const body = {
      eventType: 'location_updated',
      occurredAt: req.body.occurredAt,
      location: req.body.location,
      routeId: req.body.routeId,
      driverId: req.body.driverId,
      notes: req.body.notes,
      idempotencyKey: req.body.idempotencyKey,
    }

    const shipmentNumber = shipmentReference(req)
    await verifyShipmentExists(shipmentNumber)

    const input = TrackingEvent.buildEventInput(shipmentNumber, body)
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
