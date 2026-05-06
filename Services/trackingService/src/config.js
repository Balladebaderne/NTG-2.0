function envBool(name, defaultValue) {
  const raw = process.env[name]
  if (raw === undefined) return defaultValue
  return ['1', 'true', 'yes', 'on'].includes(raw.trim().toLowerCase())
}

module.exports = {
  shipmentsServiceUrl: (process.env.SHIPMENTS_SERVICE_URL || 'http://shipments-service:5000').replace(/\/$/, ''),
  verifyShipments: envBool('VERIFY_SHIPMENTS', true),
  shipmentStatusSyncEnabled: envBool('SHIPMENT_STATUS_SYNC_ENABLED', true),
  httpTimeoutMs: Number(process.env.HTTP_TIMEOUT_SECONDS || 3) * 1000,
}
