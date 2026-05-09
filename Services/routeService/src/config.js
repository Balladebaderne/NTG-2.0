function envBool(name, defaultValue) {
  const raw = process.env[name]
  if (raw === undefined) return defaultValue
  return ['1', 'true', 'yes', 'on'].includes(raw.trim().toLowerCase())
}

module.exports = {
  shipmentsServiceUrl: (process.env.SHIPMENTS_SERVICE_URL || 'http://shipments-service:5000').replace(/\/$/, ''),
  verifyShipments: envBool('VERIFY_SHIPMENTS', true),
  shipmentRouteSyncEnabled: envBool('SHIPMENT_ROUTE_SYNC_ENABLED', true),
  routeCalculationProvider: (process.env.ROUTE_CALCULATION_PROVIDER || 'google').trim().toLowerCase(),
  routeCalculationRequired: envBool('ROUTE_CALCULATION_REQUIRED', false),
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
  googleRoutesApiUrl: process.env.GOOGLE_ROUTES_API_URL || 'https://routes.googleapis.com/directions/v2:computeRoutes',
  externalRouteProviderUrl: (process.env.EXTERNAL_ROUTE_PROVIDER_URL || '').replace(/\/$/, ''),
  httpTimeoutMs: Number(process.env.HTTP_TIMEOUT_SECONDS || 3) * 1000,
  rabbitmqUrl: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
  trackingEventsExchange: process.env.TRACKING_EVENTS_EXCHANGE || 'tracking.events',
  routeProgressQueue: process.env.ROUTE_PROGRESS_QUEUE || 'route-service.tracking-events',
  trackingConsumerEnabled: envBool('TRACKING_CONSUMER_ENABLED', false),
}
