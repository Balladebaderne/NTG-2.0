import React, { useEffect, useMemo, useState } from 'react'
import { listShipments } from '../clients/shipmentsClient'
import { createLocationUpdate, createTrackingEvent, getLatestTracking } from '../clients/trackingClient'
import {
  AppShell,
  EmptyState,
  LoadingGrid,
  Notice,
  ShipmentCard,
  ShipmentTable,
  StatCard,
  Timeline,
} from '../components/PortalLayout'
import { trackingMilestones } from '../data/ntgContent'
import { asArray, compactId, formatDateTime, formatStatus } from '../utils/format'

async function settle(label, task) {
  try {
    return { label, ok: true, value: await task }
  } catch (error) {
    return { label, ok: false, error }
  }
}

function driverIdFor(profile) {
  return profile?.id || 'usr_driver'
}

function defaultEventForm(shipmentId = '') {
  return {
    eventType: 'goods_loaded_pickup_confirmed',
    location: '',
    notes: '',
    occurredAt: new Date().toISOString().slice(0, 16),
    shipmentId,
  }
}

function parseCoordinateLocation(value) {
  const match = String(value || '').trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/)
  if (!match) return null

  return {
    label: value.trim(),
    lat: Number(match[1]),
    lng: Number(match[2]),
  }
}

function notesWithLocation(notes, location) {
  if (!location) return notes || undefined
  return [notes, `Location: ${location}`].filter(Boolean).join('\n')
}

function useDriverData({ profile, token }) {
  const [state, setState] = useState({
    errors: [],
    loading: true,
    shipments: [],
    trackingSummaries: [],
  })

  async function loadDriverData() {
    const driverId = driverIdFor(profile)
    setState((current) => ({ ...current, errors: [], loading: true }))

    const shipmentResult = await settle('Assigned shipments', listShipments({ filters: { driverId }, token }))
    const shipments = asArray(shipmentResult.value)
    const trackingResults = await Promise.all(
      shipments.slice(0, 8).map((shipment) => settle(`Tracking ${shipment._id}`, getLatestTracking(shipment._id, { token })))
    )

    setState({
      errors: [shipmentResult, ...trackingResults]
        .filter((result) => !result.ok)
        .map((result) => `${result.label}: ${result.error.message}`),
      loading: false,
      shipments,
      trackingSummaries: trackingResults
        .filter((result) => result.ok && result.value)
        .map((result) => result.value),
    })
  }

  useEffect(() => {
    loadDriverData()
  }, [profile?.id, token])

  return { ...state, loadDriverData }
}

function DriverEventForm({ initialShipmentId = '', onSaved, profile, shipments, token }) {
  const [form, setForm] = useState(defaultEventForm(initialShipmentId || shipments[0]?._id || ''))
  const [message, setMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setForm((current) => ({
      ...current,
      shipmentId: initialShipmentId || current.shipmentId || shipments[0]?._id || '',
    }))
  }, [initialShipmentId, shipments])

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage('')

    if (!form.shipmentId || !form.eventType || !form.occurredAt) {
      setMessage('Shipment, event type, and timestamp are required.')
      return
    }

    setIsSaving(true)
    const occurredAt = new Date(form.occurredAt).toISOString()
    const location = parseCoordinateLocation(form.location)
    if (form.eventType === 'location_updated' && !location) {
      setMessage('Location update requires coordinates formatted as lat, lng.')
      setIsSaving(false)
      return
    }

    const idempotencyKey = `driver-${driverIdFor(profile)}-${form.shipmentId}-${form.eventType}-${Date.now()}`

    try {
      if (form.eventType === 'location_updated') {
        await createLocationUpdate(form.shipmentId, {
          driverId: driverIdFor(profile),
          idempotencyKey,
          location,
          notes: notesWithLocation(form.notes, form.location),
          occurredAt,
        }, { token })
      } else {
        await createTrackingEvent(form.shipmentId, {
          driverId: driverIdFor(profile),
          eventType: form.eventType,
          idempotencyKey,
          ...(location ? { location } : {}),
          notes: notesWithLocation(form.notes, form.location),
          occurredAt,
        }, { token })
      }

      setMessage('Tracking update submitted.')
      setForm((current) => ({ ...current, location: '', notes: '' }))
      onSaved?.()
    } catch (error) {
      setMessage(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form className="stacked-form" onSubmit={handleSubmit}>
      <label className="field">
        <span>Shipment</span>
        <select onChange={(event) => setForm((current) => ({ ...current, shipmentId: event.target.value }))} value={form.shipmentId}>
          <option value="">Select assigned shipment</option>
          {shipments.map((shipment) => (
            <option key={shipment._id} value={shipment._id}>{compactId(shipment._id)} / {formatStatus(shipment.status)}</option>
          ))}
        </select>
      </label>

      <div className="form-grid two">
        <label className="field">
          <span>Event type</span>
          <select onChange={(event) => setForm((current) => ({ ...current, eventType: event.target.value }))} value={form.eventType}>
            {trackingMilestones.map((milestone) => (
              <option key={milestone.value} value={milestone.value}>{milestone.label}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Timestamp</span>
          <input onChange={(event) => setForm((current) => ({ ...current, occurredAt: event.target.value }))} type="datetime-local" value={form.occurredAt} />
        </label>
      </div>

      <label className="field">
        <span>Location</span>
        <input onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} placeholder="Terminal name or lat, lng for GPS update" value={form.location} />
      </label>
      <label className="field">
        <span>Notes</span>
        <textarea onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Short operational note" value={form.notes} />
      </label>
      {message ? <Notice tone={message.includes('submitted') ? 'subtle' : 'warning'}>{message}</Notice> : null}
      <button className="button-primary" disabled={isSaving || shipments.length === 0} type="submit">
        {isSaving ? 'Submitting update' : 'Submit update'}
      </button>
    </form>
  )
}

export function DriverDashboardPage({ onNavigate, onSignOut, profile, token }) {
  const state = useDriverData({ profile, token })
  const trackingByShipmentId = useMemo(
    () => new Map(state.trackingSummaries.map((summary) => [summary.shipmentId, summary])),
    [state.trackingSummaries]
  )
  const completed = state.shipments.filter((shipment) => shipment.status === 'received').length
  const delayed = state.shipments.filter((shipment) => {
    const eta = new Date(shipment.estimatedArrivalAt).getTime()
    return shipment.status === 'in_transit' && Number.isFinite(eta) && eta < Date.now()
  }).length

  return (
    <AppShell active="driver-dashboard" onNavigate={onNavigate} onSignOut={onSignOut} profile={profile}>
      <section className="workspace-hero">
        <div>
          <p className="eyebrow">Driver overview</p>
          <h1>Assigned shipments today</h1>
          <p>Submit pickup, terminal, border, delay, location, and delivery events for shipments assigned to you.</p>
        </div>
      </section>

      {state.errors.length > 0 ? (
        <Notice tone="warning">
          <strong>Some driver services did not answer.</strong>
          <ul>{state.errors.map((error) => <li key={error}>{error}</li>)}</ul>
        </Notice>
      ) : null}

      {state.loading ? <LoadingGrid count={4} /> : (
        <>
          <div className="stat-grid">
            <StatCard detail="Assigned to your driver profile" icon="truck" label="Assigned" value={state.shipments.length} />
            <StatCard detail="Shipment status received" icon="check" label="Completed" value={completed} />
            <StatCard detail="Still waiting for next event" icon="clock" label="Pending updates" value={Math.max(state.shipments.length - completed, 0)} />
            <StatCard detail="ETA has passed" icon="warning" label="Exceptions" tone="warning" value={delayed} />
          </div>

          <div className="panel-grid">
            <section className="form-panel">
              <div className="panel-heading">
                <div>
                  <span>Quick event</span>
                  <h2>Submit tracking update</h2>
                </div>
              </div>
              <DriverEventForm onSaved={state.loadDriverData} profile={profile} shipments={state.shipments} token={token} />
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <span>Assigned route</span>
                  <h2>Next shipments</h2>
                </div>
              </div>
              <div className="shipment-grid">
                {state.shipments.slice(0, 2).map((shipment) => (
                  <ShipmentCard
                    key={shipment._id}
                    onOpen={() => onNavigate(`/driver/shipments/${shipment._id}/update`)}
                    shipment={shipment}
                    tracking={trackingByShipmentId.get(shipment._id)}
                  />
                ))}
              </div>
              {state.shipments.length === 0 ? <EmptyState compact message="No shipments are assigned to this driver profile." /> : null}
            </section>
          </div>
        </>
      )}
    </AppShell>
  )
}

export function DriverAssignedShipmentsPage({ onNavigate, onSignOut, profile, token }) {
  const state = useDriverData({ profile, token })

  return (
    <AppShell active="driver-assigned" onNavigate={onNavigate} onSignOut={onSignOut} profile={profile}>
      <section className="workspace-hero">
        <div>
          <p className="eyebrow">Assigned shipments</p>
          <h1>Route worklist</h1>
          <p>Only shipments assigned to your driver profile are shown here.</p>
        </div>
      </section>

      {state.loading ? <LoadingGrid count={4} /> : null}
      {!state.loading && state.shipments.length > 0 ? (
        <ShipmentTable onOpen={(shipment) => onNavigate(`/driver/shipments/${shipment._id}/update`)} shipments={state.shipments} />
      ) : null}
      {!state.loading && state.shipments.length === 0 ? <EmptyState message="No assigned shipments are available." /> : null}
    </AppShell>
  )
}

export function DriverShipmentUpdatePage({ onNavigate, onSignOut, profile, shipmentId, token }) {
  const state = useDriverData({ profile, token })
  const shipment = state.shipments.find((item) => item._id === shipmentId)
  const tracking = state.trackingSummaries.find((item) => item.shipmentId === shipmentId)

  return (
    <AppShell active="driver-assigned" onNavigate={onNavigate} onSignOut={onSignOut} profile={profile}>
      <section className="workspace-hero">
        <div>
          <p className="eyebrow">Shipment update</p>
          <h1>{compactId(shipmentId)}</h1>
          <p>Register the next operational event for this assigned shipment.</p>
        </div>
      </section>

      {state.loading ? <LoadingGrid count={2} /> : null}
      {!state.loading && !shipment ? <EmptyState message="This shipment is not assigned to the current driver profile." /> : null}
      {!state.loading && shipment ? (
        <div className="panel-grid">
          <section className="form-panel">
            <div className="panel-heading">
              <div>
                <span>Event submission</span>
                <h2>Submit update</h2>
              </div>
            </div>
            <DriverEventForm initialShipmentId={shipmentId} onSaved={state.loadDriverData} profile={profile} shipments={state.shipments} token={token} />
          </section>
          <section className="panel">
            <div className="panel-heading">
              <div>
                <span>Latest event</span>
                <h2>Shipment context</h2>
              </div>
            </div>
            <ShipmentCard shipment={shipment} tracking={tracking} />
          </section>
        </div>
      ) : null}
    </AppShell>
  )
}

export function DriverEventsPage({ onNavigate, onSignOut, profile, token }) {
  const state = useDriverData({ profile, token })

  return (
    <AppShell active="driver-events" onNavigate={onNavigate} onSignOut={onSignOut} profile={profile}>
      <section className="workspace-hero">
        <div>
          <p className="eyebrow">Route events</p>
          <h1>Latest driver event flow</h1>
          <p>Recent tracking milestones from the shipments assigned to this driver profile.</p>
        </div>
      </section>

      {state.loading ? <LoadingGrid count={4} /> : null}
      {!state.loading ? (
        <div className="panel-grid equal">
          {state.trackingSummaries.map((summary) => (
            <section className="panel" key={summary.shipmentId}>
              <div className="panel-heading">
                <div>
                  <span>{compactId(summary.shipmentId)}</span>
                  <h2>{summary.trackingStatusLabel || 'Tracking events'}</h2>
                </div>
                <span>{formatDateTime(summary.lastUpdatedAt)}</span>
              </div>
              <Timeline events={asArray(summary.history).slice(-4)} />
            </section>
          ))}
        </div>
      ) : null}
      {!state.loading && state.trackingSummaries.length === 0 ? <EmptyState message="No route events are available for assigned shipments." /> : null}
    </AppShell>
  )
}
