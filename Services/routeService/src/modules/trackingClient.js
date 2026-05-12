const config = require('../config')

const INTERMEDIATE_STOP_TYPES = new Set(['hub', 'border_crossing'])

async function postPlannedStop(shipmentId, stop, { routeId } = {}) {
  const url = `${config.trackingServiceUrl}/tracking/shipments/${encodeURIComponent(shipmentId)}/events`

  const body = {
    eventType: 'in_transit_milestone',
    isPlanned: true,
    plannedArrivalAt: stop.plannedArrivalAt || null,
    location: stop.location || null,
    notes: stop.notes || null,
    routeId: routeId || null,
    idempotencyKey: `route-planned-stop-${stop.stopId}`,
    metadata: {
      stopId: stop.stopId,
      stopType: stop.type,
      ...(stop.metadata || {}),
    },
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-service-token': config.trackingServiceToken,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(config.httpTimeoutMs),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`trackingService ${response.status}: ${text}`)
  }

  return response.json()
}

async function postPlannedStops(shipmentId, stops, options = {}) {
  const intermediate = (stops || []).filter((s) => INTERMEDIATE_STOP_TYPES.has(s.type))
  const results = await Promise.allSettled(
    intermediate.map((stop) => postPlannedStop(shipmentId, stop, options))
  )

  const failures = results
    .filter((r) => r.status === 'rejected')
    .map((r) => r.reason?.message || String(r.reason))

  if (failures.length > 0) {
    console.error('[trackingClient] Failed to post planned stops:', failures)
  }

  return {
    posted: results.filter((r) => r.status === 'fulfilled').length,
    failed: failures.length,
  }
}

module.exports = { postPlannedStops }
