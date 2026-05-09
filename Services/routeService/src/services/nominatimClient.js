// Free geocoding via Nominatim (OpenStreetMap).
// No API key required. One request per second limit — acceptable for a POC.
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'

function buildQuery(address = {}) {
  return [address.city, address.country].filter(Boolean).join(', ')
}

async function geocodeAddress(address, fetchImpl = global.fetch) {
  const q = buildQuery(address)
  if (!q) return null

  const url = `${NOMINATIM_URL}?q=${encodeURIComponent(q)}&format=json&limit=1`

  const response = await fetchImpl(url, {
    headers: {
      'User-Agent': 'NTG-RouteService/1.0 (freight-logistics-poc)',
      'Accept-Language': 'en',
    },
  })

  if (!response.ok) {
    throw new Error(`Nominatim geocoding failed with status ${response.status}`)
  }

  const results = await response.json()
  if (!Array.isArray(results) || results.length === 0) return null

  return {
    lat: Number(results[0].lat),
    lng: Number(results[0].lon),
    label: results[0].display_name || null,
  }
}

module.exports = { geocodeAddress }
