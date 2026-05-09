/**
 * Decodes a Google Maps encoded polyline into an array of [lat, lng] pairs.
 * https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 */
export function decodePolyline(encoded) {
  const points = []
  let index = 0
  let lat = 0
  let lng = 0

  while (index < encoded.length) {
    let shift = 0
    let result = 0
    let byte

    do {
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)

    const dLat = result & 1 ? ~(result >> 1) : result >> 1
    lat += dLat

    shift = 0
    result = 0

    do {
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)

    const dLng = result & 1 ? ~(result >> 1) : result >> 1
    lng += dLng

    points.push([lat * 1e-5, lng * 1e-5])
  }

  return points
}

/**
 * Returns the index of the point in `polylinePoints` closest to [lat, lng].
 */
function closestPointIndex(polylinePoints, lat, lng) {
  let minDist = Infinity
  let bestIndex = 0

  for (let i = 0; i < polylinePoints.length; i++) {
    const dLat = polylinePoints[i][0] - lat
    const dLng = polylinePoints[i][1] - lng
    const dist = dLat * dLat + dLng * dLng
    if (dist < minDist) {
      minDist = dist
      bestIndex = i
    }
  }

  return bestIndex
}

/**
 * Given a decoded polyline and a list of stops (with location + actualArrivalAt),
 * returns { completedPoints, remainingPoints, progressIndex }.
 *
 * The split happens at the polyline point closest to the last confirmed stop.
 */
export function splitPolylineAtProgress(polylinePoints, stops) {
  if (!polylinePoints || polylinePoints.length === 0) {
    return { completedPoints: [], remainingPoints: [], progressIndex: 0 }
  }

  const confirmedStops = stops
    .filter((s) => s.actualArrivalAt && s.location)
    .sort((a, b) => a.sequence - b.sequence)

  if (confirmedStops.length === 0) {
    return { completedPoints: [], remainingPoints: polylinePoints, progressIndex: 0 }
  }

  const lastConfirmed = confirmedStops[confirmedStops.length - 1]
  const progressIndex = closestPointIndex(
    polylinePoints,
    lastConfirmed.location.lat,
    lastConfirmed.location.lng
  )

  return {
    completedPoints: polylinePoints.slice(0, progressIndex + 1),
    remainingPoints: polylinePoints.slice(progressIndex),
    progressIndex,
  }
}
