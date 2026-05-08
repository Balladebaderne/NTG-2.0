const express = require('express')

const RoutePlan = require('../models/RoutePlan')
const { enrichRouteInput } = require('../services/routeCalculation')
const { syncShipmentRoute, verifyShipmentExists } = require('../services/shipmentsClient')

const router = express.Router()

function sendError(res, err) {
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(err.details ? { details: err.details } : {}),
  })
}

function parseListQuery(req, res) {
  const parsedLimit = Number(req.query.limit || 100)
  if (!Number.isInteger(parsedLimit) || parsedLimit < 1) {
    res.status(400).json({ error: 'limit must be a positive integer' })
    return null
  }

  return {
    shipmentId: req.query.shipmentId || null,
    status: req.query.status || null,
    limit: Math.min(parsedLimit, 500),
  }
}

function routeSyncPayload(route) {
  return {
    routeId: route.routeId,
    estimatedArrivalAt: route.estimatedArrivalAt,
  }
}

router.get('/', async (req, res) => {
  try {
    const options = parseListQuery(req, res)
    if (!options) return

    const routes = await RoutePlan.list(options)
    res.json(routes)
  } catch (err) {
    sendError(res, err)
  }
})

router.get('/:routeId', async (req, res) => {
  try {
    const route = await RoutePlan.findById(req.params.routeId)
    if (!route) return res.status(404).json({ error: 'Route not found' })

    res.json(route)
  } catch (err) {
    sendError(res, err)
  }
})

router.post('/', async (req, res) => {
  try {
    const input = RoutePlan.buildRouteInput(req.body)
    await verifyShipmentExists(input.shipmentId)

    const enrichedInput = await enrichRouteInput(input)
    const route = await RoutePlan.create(enrichedInput)
    const shipmentRouteSync = await syncShipmentRoute(enrichedInput.shipmentId, routeSyncPayload(route))

    res.status(201).json({ route, shipmentRouteSync })
  } catch (err) {
    sendError(res, err)
  }
})

router.put('/:routeId', async (req, res) => {
  try {
    const input = RoutePlan.buildRouteInput(req.body, req.params.routeId)
    await verifyShipmentExists(input.shipmentId)

    const enrichedInput = await enrichRouteInput(input)
    const route = await RoutePlan.update(req.params.routeId, enrichedInput)
    if (!route) return res.status(404).json({ error: 'Route not found' })

    const shipmentRouteSync = await syncShipmentRoute(enrichedInput.shipmentId, routeSyncPayload(route))

    res.json({ route, shipmentRouteSync })
  } catch (err) {
    sendError(res, err)
  }
})

router.delete('/:routeId', async (req, res) => {
  try {
    const route = await RoutePlan.findById(req.params.routeId)
    if (!route) return res.status(404).json({ error: 'Route not found' })

    const deleted = await RoutePlan.remove(req.params.routeId)
    if (!deleted) return res.status(404).json({ error: 'Route not found' })

    const shipmentRouteSync = await syncShipmentRoute(route.shipmentId, {
      routeId: null,
      estimatedArrivalAt: null,
    })

    res.json({ message: 'Route deleted', shipmentRouteSync })
  } catch (err) {
    sendError(res, err)
  }
})

module.exports = router
