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
  httpTimeoutMs: Number(process.env.HTTP_TIMEOUT_SECONDS || 3) * 1000,
}
