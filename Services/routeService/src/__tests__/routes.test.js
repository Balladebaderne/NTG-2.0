const request = require('supertest')

jest.mock('../models/RoutePlan', () => ({
  buildRouteInput: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
  list: jest.fn(),
  remove: jest.fn(),
  update: jest.fn(),
}))

jest.mock('../services/shipmentsClient', () => ({
  syncShipmentRoute: jest.fn(),
  verifyShipmentExists: jest.fn(),
}))

jest.mock('../services/routeCalculation', () => ({
  enrichRouteInput: jest.fn(),
}))

const RoutePlan = require('../models/RoutePlan')
const { enrichRouteInput } = require('../services/routeCalculation')
const { syncShipmentRoute, verifyShipmentExists } = require('../services/shipmentsClient')
const app = require('../app')

const route = {
  routeId: 'route-1',
  shipmentId: 'shipment-1',
  status: 'planned',
  estimatedArrivalAt: new Date('2026-05-08T14:00:00.000Z'),
  stops: [],
}

describe('Routes API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    verifyShipmentExists.mockResolvedValue(undefined)
    syncShipmentRoute.mockResolvedValue({ status: 'succeeded' })
    enrichRouteInput.mockImplementation(async (input) => ({
      ...input,
      distanceKm: 123,
      durationSeconds: 7200,
    }))
  })

  it('lists routes with supported filters', async () => {
    RoutePlan.list.mockResolvedValue([route])

    const res = await request(app).get('/routes?shipmentId=shipment-1&status=planned&limit=25')

    expect(res.status).toBe(200)
    expect(RoutePlan.list).toHaveBeenCalledWith({
      shipmentId: 'shipment-1',
      status: 'planned',
      limit: 25,
    })
  })

  it('creates a route after verifying the shipment and syncs route fields back', async () => {
    RoutePlan.buildRouteInput.mockReturnValue({
      routeId: 'route-1',
      shipmentId: 'shipment-1',
    })
    RoutePlan.create.mockResolvedValue(route)

    const res = await request(app).post('/routes').send({ shipmentId: 'shipment-1' })

    expect(res.status).toBe(201)
    expect(verifyShipmentExists).toHaveBeenCalledWith('shipment-1')
    expect(enrichRouteInput).toHaveBeenCalledWith({
      routeId: 'route-1',
      shipmentId: 'shipment-1',
    })
    expect(RoutePlan.create).toHaveBeenCalledWith({
      routeId: 'route-1',
      shipmentId: 'shipment-1',
      distanceKm: 123,
      durationSeconds: 7200,
    })
    expect(syncShipmentRoute).toHaveBeenCalledWith('shipment-1', {
      routeId: 'route-1',
      estimatedArrivalAt: route.estimatedArrivalAt,
    })
    expect(res.body.route.routeId).toBe('route-1')
  })

  it('returns 404 for unknown route', async () => {
    RoutePlan.findById.mockResolvedValue(null)

    const res = await request(app).get('/routes/missing-route')

    expect(res.status).toBe(404)
  })

  it('updates a route by replacing the route plan and stops', async () => {
    RoutePlan.buildRouteInput.mockReturnValue({
      routeId: 'route-1',
      shipmentId: 'shipment-1',
    })
    RoutePlan.update.mockResolvedValue(route)

    const res = await request(app).put('/routes/route-1').send({ shipmentId: 'shipment-1' })

    expect(res.status).toBe(200)
    expect(RoutePlan.update).toHaveBeenCalledWith('route-1', {
      routeId: 'route-1',
      shipmentId: 'shipment-1',
      distanceKm: 123,
      durationSeconds: 7200,
    })
  })

  it('deletes a route', async () => {
    RoutePlan.findById.mockResolvedValue(route)
    RoutePlan.remove.mockResolvedValue({ route_id: 'route-1' })

    const res = await request(app).delete('/routes/route-1')

    expect(res.status).toBe(200)
    expect(res.body.message).toBe('Route deleted')
    expect(syncShipmentRoute).toHaveBeenCalledWith('shipment-1', {
      routeId: null,
      estimatedArrivalAt: null,
    })
  })
})
