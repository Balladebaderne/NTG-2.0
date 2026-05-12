import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import React, { useEffect, useRef } from 'react'

import { decodePolyline, splitPolylineAtProgress } from '../utils/polyline'

// Fix Leaflet's default marker icon paths broken by bundlers
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const STOP_TYPE_LABELS = {
  pickup: 'Pickup',
  origin_terminal: 'Origin terminal',
  hub: 'Hub',
  border_crossing: 'Border crossing',
  destination_terminal: 'Destination terminal',
  delivery: 'Delivery',
  other: 'Stop',
}

function stopIcon(confirmed) {
  return L.circleMarker
    ? null
    : L.icon({
      iconUrl: confirmed
        ? 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png'
        : 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    })
}

function formatTimestamp(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString()
}

export function RouteMap({ route, height = '420px' }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return
    if (mapRef.current) {
      mapRef.current.remove()
      mapRef.current = null
    }

    const map = L.map(containerRef.current)
    mapRef.current = map

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map)

    const stops = route.stops || []
    const geometry = route.routeGeometry

    if (geometry && geometry.encodedPolyline) {
      const allPoints = decodePolyline(geometry.encodedPolyline)
      const { completedPoints, remainingPoints } = splitPolylineAtProgress(allPoints, stops)

      if (remainingPoints.length > 1) {
        L.polyline(remainingPoints, { color: '#9ca3af', weight: 4, opacity: 0.8 }).addTo(map)
      }

      if (completedPoints.length > 1) {
        L.polyline(completedPoints, { color: '#2563eb', weight: 5, opacity: 1 }).addTo(map)
      }

      if (allPoints.length > 0) {
        map.fitBounds(L.latLngBounds(allPoints), { padding: [32, 32] })
      }
    } else if (stops.length >= 2) {
      // No geometry — just connect stops with a straight line
      const coords = stops.filter((s) => s.location).map((s) => [s.location.lat, s.location.lng])
      if (coords.length > 1) {
        L.polyline(coords, { color: '#9ca3af', weight: 3, dashArray: '6 4' }).addTo(map)
        map.fitBounds(L.latLngBounds(coords), { padding: [32, 32] })
      }
    }

    // Draw stop markers
    for (const stop of stops) {
      if (!stop.location) continue

      const confirmed = Boolean(stop.actualArrivalAt)
      const label = STOP_TYPE_LABELS[stop.type] || 'Stop'

      const marker = L.circleMarker([stop.location.lat, stop.location.lng], {
        radius: 9,
        fillColor: confirmed ? '#16a34a' : '#ffffff',
        color: confirmed ? '#15803d' : '#6b7280',
        weight: 2,
        opacity: 1,
        fillOpacity: 1,
      }).addTo(map)

      marker.bindPopup(
        `<strong>${label}</strong><br>` +
        `${stop.address?.city || ''}, ${stop.address?.country || ''}<br>` +
        `<small>Planned: ${formatTimestamp(stop.plannedArrivalAt)}</small><br>` +
        (confirmed ? `<small style="color:#16a34a">✓ Confirmed: ${formatTimestamp(stop.actualArrivalAt)}</small>` : '<small>Not yet confirmed</small>')
      )
    }

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [route])

  return (
    <div
      ref={containerRef}
      style={{ height, width: '100%', borderRadius: '8px', overflow: 'hidden' }}
    />
  )
}
