const DEFAULT_TIMEOUT_MS = 5000

async function fetchJson(url, options = {}) {
  const timeoutMs = Number(process.env.SHIPMENTS_TIMEOUT_MS || DEFAULT_TIMEOUT_MS)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    if (!response.ok) {
      throw new Error(`Shipments service returned ${response.status}`)
    }
    return await response.json()
  } finally {
    clearTimeout(timeout)
  }
}

async function listInTransitShipments() {
  const baseUrl = process.env.SHIPMENTS_SERVICE_URL || 'http://shipments-service:5000'
  const url = new URL('/shipments', baseUrl)
  url.searchParams.set('status', 'in_transit')
  return fetchJson(url)
}

module.exports = {
  listInTransitShipments,
}
