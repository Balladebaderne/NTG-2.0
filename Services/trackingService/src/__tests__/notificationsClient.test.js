describe('notifications client', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    jest.resetModules()
    process.env.NOTIFICATION_SERVICE_URL = 'http://notification-service:5002'
    process.env.HTTP_TIMEOUT_SECONDS = '3'
    process.env.SERVICE_AUTH_TOKEN = 'service-token'
    global.fetch = jest.fn()
  })

  afterEach(() => {
    global.fetch = originalFetch
    delete process.env.NOTIFICATION_SERVICE_URL
    delete process.env.HTTP_TIMEOUT_SECONDS
    delete process.env.SERVICE_AUTH_TOKEN
  })

  it('skips non-notifiable tracking events', async () => {
    const { dispatchDriverDelayNotification } = require('../services/notificationsClient')

    const result = await dispatchDriverDelayNotification({
      eventType: 'departed_origin_terminal',
      shipmentId: 'shipment-1',
    })

    expect(result).toEqual({
      status: 'skipped',
      reason: 'tracking event is not a driver delay',
    })
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('posts driver delay events to notification-service with service auth', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ created: 2, targetedRoles: ['admin', 'support'] }),
    })
    const { dispatchDriverDelayNotification } = require('../services/notificationsClient')

    const result = await dispatchDriverDelayNotification({
      driverId: 'driver-1',
      eventType: 'delay_logged',
      notes: 'Border queue',
      occurredAt: '2026-05-11T13:00:00.000Z',
      shipmentId: 'shipment-1',
      trackingEventId: 'event-1',
    })

    expect(global.fetch).toHaveBeenCalledWith(
      'http://notification-service:5002/notifications/driver-delay',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'x-service-token': 'service-token',
        }),
      })
    )
    expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual({
      driverId: 'driver-1',
      notes: 'Border queue',
      occurredAt: '2026-05-11T13:00:00.000Z',
      shipmentId: 'shipment-1',
      trackingEventId: 'event-1',
    })
    expect(result).toEqual({
      status: 'succeeded',
      created: 2,
      targetedRoles: ['admin', 'support'],
    })
  })

  it('posts driver delivery events to notification-service with service auth', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ created: 2, targetedRoles: ['admin', 'support'] }),
    })
    const { dispatchDriverDeliveryNotification } = require('../services/notificationsClient')

    const result = await dispatchDriverDeliveryNotification({
      driverId: 'driver-1',
      eventType: 'goods_delivered',
      notes: 'Signed at reception',
      occurredAt: '2026-05-11T13:00:00.000Z',
      shipmentId: 'shipment-1',
      trackingEventId: 'event-1',
    })

    expect(global.fetch).toHaveBeenCalledWith(
      'http://notification-service:5002/notifications/driver-delivery',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'x-service-token': 'service-token',
        }),
      })
    )
    expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual({
      driverId: 'driver-1',
      notes: 'Signed at reception',
      occurredAt: '2026-05-11T13:00:00.000Z',
      shipmentId: 'shipment-1',
      trackingEventId: 'event-1',
    })
    expect(result).toEqual({
      status: 'succeeded',
      created: 2,
      targetedRoles: ['admin', 'support'],
    })
  })
})
