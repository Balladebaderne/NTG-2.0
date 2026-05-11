import React, { useEffect, useMemo, useState } from 'react'
import { getDriver, updateDriverAvailability } from '../clients/driversClient'
import { getDriverPoints } from '../clients/loyaltyClient'
import { listShipments } from '../clients/shipmentsClient'
import { createTrackingEvent, getLatestTracking } from '../clients/trackingClient'
import {
  AppShell,
  EmptyState,
  LoadingGrid,
  LoyaltyCard,
  Notice,
  ProgressBar,
  Timeline,
} from '../components/PortalLayout'
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

const QUICK_ACTIONS = [
  { eventType: 'goods_loaded_pickup_confirmed', label: 'Pickup confirmed', tone: 'blue', order: 50 },
  { eventType: 'departed_origin_terminal', label: 'Departed terminal', tone: 'blue', order: 70 },
  { eventType: 'in_transit_milestone', label: 'Border crossed', tone: 'blue', order: 80, repeatable: true },
  { eventType: 'arrived_destination_terminal', label: 'Arrived terminal', tone: 'blue', order: 90 },
  { eventType: 'goods_delivered', label: 'Delivered', tone: 'green', order: 120 },
  { eventType: 'delay_logged', label: 'Delay', tone: 'warning', sideEvent: true },
]

// Event order enforced by the tracking service.
const EVENT_ORDER = {
  shipment_order_created: 10,
  transport_planned_carrier_assigned: 20,
  pickup_scheduled: 30,
  truck_arrived_pickup: 40,
  goods_loaded_pickup_confirmed: 50,
  shipment_in_transit: 60,
  departed_origin_terminal: 70,
  in_transit_milestone: 80,
  arrived_destination_terminal: 90,
  out_for_delivery: 100,
  truck_arrived_delivery: 110,
  goods_delivered: 120,
}

// Required events that are created automatically when missing.
const REQUIRED_FLOW = [
  { eventType: 'shipment_order_created', order: 10 },
  { eventType: 'transport_planned_carrier_assigned', order: 20 },
  { eventType: 'pickup_scheduled', order: 30 },
  { eventType: 'truck_arrived_pickup', order: 40 },
  { eventType: 'goods_loaded_pickup_confirmed', order: 50 },
  { eventType: 'shipment_in_transit', order: 60 },
  { eventType: 'out_for_delivery', order: 100 },
  { eventType: 'truck_arrived_delivery', order: 110 },
]

const ACTION_FEEDBACK = {
  goods_loaded_pickup_confirmed: {
    detail: 'Pickup is confirmed and the shipment flow has been updated.',
    title: 'Pickup registered',
  },
  departed_origin_terminal: {
    detail: 'Route progress was updated.',
    points: 10,
    title: 'Terminal departure registered',
  },
  in_transit_milestone: {
    detail: 'Route progress was updated.',
    points: 10,
    title: 'Milestone registered',
  },
  arrived_destination_terminal: {
    detail: 'Route progress was updated.',
    points: 10,
    title: 'Terminal arrival registered',
  },
  goods_delivered: {
    detail: 'Delivery confirmed. The operations team has been notified.',
    points: 50,
    title: 'Shipment delivered',
  },
  delay_logged: {
    detail: 'Admin and support have been notified about the delay.',
    title: 'Delay reported',
    tone: 'warning',
  },
}

function feedbackForAction(eventType, fallbackLabel) {
  const config = ACTION_FEEDBACK[eventType] || {}
  return {
    detail: config.detail || 'The shipment event has been registered.',
    points: config.points || 0,
    title: config.title || fallbackLabel || 'Event registered',
    tone: config.tone || 'success',
  }
}

function useDriverData({ profile, token }) {
  const [state, setState] = useState({
    errors: [],
    loading: true,
    shipments: [],
    trackingSummaries: [],
  })

  async function loadDriverData({ silent = false } = {}) {
    const driverId = driverIdFor(profile)
    setState((current) => ({ ...current, errors: [], loading: silent ? current.loading : true }))

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

function DriverQuickActions({ initialShipmentId, onSaved, profile, shipments, token, trackingByShipmentId }) {
  const [selectedId, setSelectedId] = useState(initialShipmentId || shipments[0]?._id || '')
  const [busy, setBusy] = useState(null)
  const [result, setResult] = useState(null)
  const [showNote, setShowNote] = useState(false)
  const [note, setNote] = useState('')

  useEffect(() => {
    setSelectedId(initialShipmentId || shipments[0]?._id || '')
  }, [initialShipmentId, shipments])

  async function submitEvent(shipmentId, eventType, extraFields = {}) {
    await createTrackingEvent(shipmentId, {
      driverId: driverIdFor(profile),
      eventType,
      idempotencyKey: `auto-${shipmentId}-${eventType}`,
      occurredAt: new Date().toISOString(),
      ...extraFields,
    }, { token })
  }

  async function handleAction(eventType) {
    if (!selectedId || busy) return
    setBusy(eventType)
    setResult(null)

    try {
      const action = QUICK_ACTIONS.find((item) => item.eventType === eventType)
      const tracking = trackingByShipmentId?.get(selectedId)
      const latestEventType = tracking?.latestEvent?.eventType
      const currentOrder = EVENT_ORDER[latestEventType] || 0
      const targetOrder = EVENT_ORDER[eventType] || 0

      if (targetOrder > 0) {
        const prereqsNeeded = REQUIRED_FLOW.filter(
          (req) => req.order < targetOrder && req.order > currentOrder
        )
        for (const prereq of prereqsNeeded) {
          await submitEvent(selectedId, prereq.eventType)
        }
      }

      await createTrackingEvent(selectedId, {
        driverId: driverIdFor(profile),
        eventType,
        idempotencyKey: `driver-${driverIdFor(profile)}-${selectedId}-${eventType}-${Date.now()}`,
        notes: note || undefined,
        occurredAt: new Date().toISOString(),
      }, { token })

      setResult({
        eventType,
        feedback: feedbackForAction(eventType, action?.label),
        ok: true,
      })
      setNote('')
      setShowNote(false)
      onSaved?.({ silent: true })
    } catch (err) {
      setResult({ ok: false, message: err.message })
    } finally {
      setBusy(null)
    }
  }

  const tracking = trackingByShipmentId?.get(selectedId)
  const currentOrder = EVENT_ORDER[tracking?.latestEvent?.eventType] || 0
  const isCompleted = currentOrder >= 120

  const validActions = QUICK_ACTIONS.filter((action) => {
    if (action.sideEvent) return currentOrder > 0
    if (action.repeatable) return action.order >= currentOrder
    return action.order > currentOrder
  })

  return (
    <div className="driver-quick-actions">
      {shipments.length > 1 && (
        <label className="driver-shipment-select">
          <span>Shipment</span>
          <select value={selectedId} onChange={(e) => { setSelectedId(e.target.value); setResult(null) }}>
            {shipments.map((s) => (
              <option key={s._id} value={s._id}>
                {compactId(s._id)} – {formatStatus(s.status)}
              </option>
            ))}
          </select>
        </label>
      )}

      {isCompleted ? (
        <div className="driver-result driver-result-ok">Shipment is completed and delivered.</div>
      ) : (
        <div className="driver-action-grid">
          {validActions.map((action) => (
            <button
              key={action.eventType}
              className={`driver-action-btn driver-tone-${action.tone}`}
              disabled={!!busy || !selectedId}
              onClick={() => handleAction(action.eventType)}
              type="button"
            >
              <span className="driver-action-label">{action.label}</span>
              {busy === action.eventType && <span className="driver-action-busy">Saving</span>}
            </button>
          ))}
        </div>
      )}

      {result?.ok ? <DriverActionFeedback result={result} /> : null}

      <div className="driver-note-area">
        {!showNote && (
          <button className="driver-note-toggle" onClick={() => setShowNote(true)} type="button">
            + Add note (optional)
          </button>
        )}
        {showNote && (
          <>
            <textarea
              className="driver-note-input"
              placeholder="Write a short note..."
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <button className="driver-note-toggle" onClick={() => { setShowNote(false); setNote('') }} type="button">
              - Remove note
            </button>
          </>
        )}
      </div>

      {result && !result.ok && (
        <div className={`driver-result ${result.ok ? 'driver-result-ok' : 'driver-result-err'}`}>
          Could not register event: {result.message}
        </div>
      )}
    </div>
  )
}

function DriverActionFeedback({ result }) {
  const feedback = result.feedback || feedbackForAction(result.eventType)
  const hasPoints = feedback.points > 0

  return (
    <div
      aria-live="polite"
      className={`driver-action-feedback driver-feedback-${feedback.tone}`}
      role="status"
    >
      <div className="driver-feedback-main">
        <span className="driver-feedback-kicker">Registered</span>
        <strong>{feedback.title}</strong>
        <p>{feedback.detail}</p>
      </div>
      {hasPoints ? (
        <div className="driver-feedback-points">
          <span>+{feedback.points}</span>
          <small>loyalty points</small>
        </div>
      ) : null}
    </div>
  )
}

function DriverAvailabilityToggle({ profile, token }) {
  const [available, setAvailable] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isCurrent = true
    setError('')
    setLoading(true)

    getDriver(driverIdFor(profile), { token })
      .then((driver) => {
        if (!isCurrent) return
        setAvailable(driver.available)
      })
      .catch((err) => {
        if (!isCurrent) return
        setAvailable(null)
        setError(err.message)
      })
      .finally(() => {
        if (isCurrent) setLoading(false)
      })

    return () => {
      isCurrent = false
    }
  }, [profile?.id, token])

  async function handleToggle() {
    if (busy || available === null) return
    const next = !available
    setBusy(true)
    setError('')
    try {
      await updateDriverAvailability(driverIdFor(profile), next, { token })
      setAvailable(next)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <div className="driver-availability-loading" role="status">Loading availability status...</div>
  }

  if (available === null) {
    return <div className="driver-result driver-result-err" role="alert">Could not load availability status.</div>
  }

  return (
    <>
      <button
        aria-label={available ? 'You are available. Tap to set yourself unavailable.' : 'You are not available. Tap to set yourself available.'}
        aria-pressed={available}
        className={`driver-availability-toggle ${available ? 'is-available' : 'is-unavailable'}`}
        disabled={busy}
        onClick={handleToggle}
        type="button"
      >
        <span className="driver-availability-dot" />
        <span className="driver-availability-label">
          {available ? 'Available - tap to set yourself unavailable' : 'Not available - tap to set yourself available'}
        </span>
        <span className="driver-availability-state">{available ? 'Available' : 'Unavailable'}</span>
      </button>
      {error ? <div className="driver-result driver-result-err" role="alert">{error}</div> : null}
    </>
  )
}

function DriverAvailabilityPanel({ profile, token }) {
  return (
    <section className="driver-main-panel driver-availability-panel" aria-labelledby="driver-availability-heading">
      <div className="panel-heading">
        <div>
          <span>Availability status</span>
          <h2 id="driver-availability-heading">Are you available?</h2>
        </div>
      </div>
      <div className="driver-availability-body">
        <DriverAvailabilityToggle profile={profile} token={token} />
      </div>
    </section>
  )
}

export function DriverDashboardPage({ onNavigate, onSignOut, profile, token }) {
  const state = useDriverData({ profile, token })
  const trackingByShipmentId = useMemo(
    () => new Map(state.trackingSummaries.map((s) => [s.shipmentId, s])),
    [state.trackingSummaries]
  )

  return (
    <AppShell active="driver-dashboard" onNavigate={onNavigate} onSignOut={onSignOut} profile={profile} token={token}>
      <section className="workspace-hero">
        <div>
          <p className="eyebrow">Driver overview</p>
          <h1>Assigned shipments today</h1>
          <p>Review assigned shipments and set whether you are available for new driver capacity.</p>
        </div>
      </section>

      {state.errors.length > 0 && (
        <Notice tone="warning">
          <strong>An error occurred.</strong>
          <ul>{state.errors.map((e) => <li key={e}>{e}</li>)}</ul>
        </Notice>
      )}

      <DriverAvailabilityPanel profile={profile} token={token} />

      {state.loading ? <LoadingGrid count={2} /> : null}

      {!state.loading && state.shipments.length === 0 && (
        <EmptyState message="No shipments are assigned to your driver profile." />
      )}

      {!state.loading && state.shipments.length > 0 && (
        <section className="driver-main-panel">
          <div className="panel-heading">
            <div>
              <span>My shipments</span>
              <h2>Assigned routes</h2>
            </div>
          </div>
          <div className="driver-card-list">
            {state.shipments.map((shipment) => {
              const tracking = trackingByShipmentId.get(shipment._id)
              return (
                <button
                  key={shipment._id}
                  className="driver-shipment-row"
                  onClick={() => onNavigate(`/driver/shipments/${shipment._id}/update`)}
                  type="button"
                >
                  <div className="driver-shipment-row-left">
                    <strong>{compactId(shipment._id)}</strong>
                    <span>{tracking?.trackingStatusLabel || formatStatus(shipment.status)}</span>
                    <small>ETA: {formatDateTime(shipment.estimatedArrivalAt)}</small>
                  </div>
                  <span className={`status-badge status-${String(shipment.status || '').replaceAll('_', '-')}`}>
                    {formatStatus(shipment.status)}
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      )}
    </AppShell>
  )
}

export function DriverAssignedShipmentsPage({ onNavigate, onSignOut, profile, token }) {
  const state = useDriverData({ profile, token })

  return (
    <AppShell active="driver-assigned" onNavigate={onNavigate} onSignOut={onSignOut} profile={profile} token={token}>
      <section className="workspace-hero">
        <div>
          <p className="eyebrow">Assigned shipments</p>
          <h1>Route worklist</h1>
          <p>Only shipments assigned to your driver profile are shown here.</p>
        </div>
      </section>

      {state.loading ? <LoadingGrid count={4} /> : null}
      {!state.loading && state.shipments.length === 0 && (
        <EmptyState message="No shipments are assigned to your driver profile." />
      )}
      {!state.loading && state.shipments.length > 0 && (
        <section className="driver-main-panel">
          <div className="driver-card-list">
            {state.shipments.map((shipment) => (
              <button
                key={shipment._id}
                className="driver-shipment-row"
                onClick={() => onNavigate(`/driver/shipments/${shipment._id}/update`)}
                type="button"
              >
                <div className="driver-shipment-row-left">
                  <strong>{compactId(shipment._id)}</strong>
                  <span>{formatStatus(shipment.status)}</span>
                  <small>ETA: {formatDateTime(shipment.estimatedArrivalAt)}</small>
                </div>
                <svg aria-hidden="true" fill="none" height="20" viewBox="0 0 24 24" width="20">
                  <path d="M9 18l6-6-6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
              </button>
            ))}
          </div>
        </section>
      )}
    </AppShell>
  )
}

export function DriverShipmentUpdatePage({ onNavigate, onSignOut, profile, shipmentId, token }) {
  const state = useDriverData({ profile, token })
  const shipment = state.shipments.find((item) => item._id === shipmentId)
  const tracking = state.trackingSummaries.find((item) => item.shipmentId === shipmentId)
  const trackingByShipmentId = useMemo(
    () => new Map(state.trackingSummaries.map((s) => [s.shipmentId, s])),
    [state.trackingSummaries]
  )

  return (
    <AppShell active="driver-assigned" onNavigate={onNavigate} onSignOut={onSignOut} profile={profile} token={token}>
      <section className="workspace-hero">
        <div>
          <p className="eyebrow">Shipment update</p>
          <h1>{compactId(shipmentId)}</h1>
          <p>Register the next operational event for this assigned shipment.</p>
        </div>
      </section>

      {state.loading ? <LoadingGrid count={2} /> : null}
      {!state.loading && !shipment && (
        <EmptyState message="This shipment is not assigned to your driver profile." />
      )}
      {!state.loading && shipment && (
        <section className="driver-main-panel">
          <div className="panel-heading">
            <div>
              <span>Register event</span>
              <h2>What happened?</h2>
            </div>
          </div>
          <DriverQuickActions
            initialShipmentId={shipmentId}
            onSaved={state.loadDriverData}
            profile={profile}
            shipments={state.shipments}
            token={token}
            trackingByShipmentId={trackingByShipmentId}
          />
        </section>
      )}
    </AppShell>
  )
}

export function DriverEventsPage({ onNavigate, onSignOut, profile, token }) {
  const state = useDriverData({ profile, token })

  return (
    <AppShell active="driver-events" onNavigate={onNavigate} onSignOut={onSignOut} profile={profile} token={token}>
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

export function DriverLoyaltyPage({ onNavigate, onSignOut, profile, token }) {
  const [loyaltyState, setLoyaltyState] = useState({ loading: true, points: null, error: '' })

  useEffect(() => {
    const driverId = driverIdFor(profile)
    setLoyaltyState({ loading: true, points: null, error: '' })
    getDriverPoints(driverId, { token })
      .then((data) => setLoyaltyState({ loading: false, points: data, error: '' }))
      .catch((err) => setLoyaltyState({ loading: false, points: null, error: err.message }))
  }, [profile?.id, token])

  const totalPoints = loyaltyState.points?.totalPoints ?? loyaltyState.points?.points ?? 0
  const tier =
    totalPoints >= 10000 ? 'Platinum'
    : totalPoints >= 5000 ? 'Gold'
    : totalPoints >= 1000 ? 'Silver'
    : 'Bronze'
  const nextTierPoints =
    totalPoints >= 10000 ? 10000
    : totalPoints >= 5000 ? 10000
    : totalPoints >= 1000 ? 5000
    : 1000
  const nextTierLabel =
    tier === 'Bronze' ? 'Silver'
    : tier === 'Silver' ? 'Gold'
    : tier === 'Gold' ? 'Platinum'
    : 'Max tier'

  return (
    <AppShell active="driver-loyalty" onNavigate={onNavigate} onSignOut={onSignOut} profile={profile} token={token}>
      <section className="workspace-hero">
        <div>
          <p className="eyebrow">Driver rewards</p>
          <h1>My loyalty points</h1>
          <p>
            Points are earned automatically for each completed shipment event registered in the system.
            Reach new tiers to unlock priority assignment and rewards.
          </p>
        </div>
      </section>

      {loyaltyState.loading ? <LoadingGrid count={2} /> : null}
      {loyaltyState.error ? <Notice tone="warning">{loyaltyState.error}</Notice> : null}

      {!loyaltyState.loading ? (
        <>
          <div className="panel-grid equal">
            <LoyaltyCard driverName={profile?.name} points={totalPoints} tier={tier} />

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <span>Tier progress</span>
                  <h2>Points overview</h2>
                </div>
              </div>
              <div className="stacked-form">
                <ProgressBar
                  label={`${Number(totalPoints).toLocaleString()} / ${nextTierPoints.toLocaleString()} points to ${nextTierLabel}`}
                  max={nextTierPoints}
                  value={Math.min(totalPoints, nextTierPoints)}
                />
              </div>
              <ul className="split-list" style={{ marginTop: '20px' }}>
                <li>
                  <div>
                    <strong>Total points</strong>
                    <small>Lifetime accumulated</small>
                  </div>
                  <strong style={{ color: 'var(--color-primary-navy)', fontSize: '1.3rem' }}>
                    {Number(totalPoints).toLocaleString()}
                  </strong>
                </li>
                <li>
                  <div>
                    <strong>Current tier</strong>
                    <small>Your rewards level</small>
                  </div>
                  <span className="status-badge">{tier}</span>
                </li>
                <li>
                  <div>
                    <strong>Next tier at</strong>
                    <small>Points required</small>
                  </div>
                  <span>{nextTierPoints.toLocaleString()} pts</span>
                </li>
              </ul>
            </section>
          </div>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <span>Tier system</span>
                <h2>How the rewards work</h2>
              </div>
            </div>
            <ul className="split-list">
              <li>
                <div><strong>Bronze</strong><small>0 – 999 points</small></div>
                <span>Starting tier for all drivers</span>
              </li>
              <li>
                <div><strong>Silver</strong><small>1,000 – 4,999 points</small></div>
                <span>Priority assignment consideration</span>
              </li>
              <li>
                <div><strong>Gold</strong><small>5,000 – 9,999 points</small></div>
                <span>Bonus recognition and priority routes</span>
              </li>
              <li>
                <div><strong>Platinum</strong><small>10,000+ points</small></div>
                <span>Top performer — maximum rewards</span>
              </li>
            </ul>
          </section>
        </>
      ) : null}
    </AppShell>
  )
}
