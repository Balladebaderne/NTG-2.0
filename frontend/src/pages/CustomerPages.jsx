import React, { useEffect, useMemo, useState } from 'react'
import { createTicket } from '../clients/supportClient'
import { listNotifications } from '../clients/notificationsClient'
import { listShipments } from '../clients/shipmentsClient'
import { getLatestTracking } from '../clients/trackingClient'
import {
  AppShell,
  EmptyState,
  LoadingGrid,
  Notice,
  SectionHeader,
  ShipmentCard,
  ShipmentTable,
  StatCard,
  TrackingSearch,
} from '../components/PortalLayout'
import { asArray, compactId, formatDateTime, formatStatus } from '../utils/format'

async function settle(label, task) {
  try {
    return { label, ok: true, value: await task }
  } catch (error) {
    return { label, ok: false, error }
  }
}

function customerIdFor(profile) {
  return profile?.role === 'customer' ? profile.id : 'customer-1'
}

function countDelayed(shipments) {
  return shipments.filter((shipment) => {
    if (shipment.status !== 'in_transit') return false
    const eta = new Date(shipment.estimatedArrivalAt).getTime()
    return Number.isFinite(eta) && eta < Date.now()
  }).length
}

function useCustomerData({ profile, token }) {
  const [state, setState] = useState({
    errors: [],
    loading: true,
    notifications: [],
    shipments: [],
    trackingSummaries: [],
  })

  async function loadCustomerData() {
    const receiverCustomerId = customerIdFor(profile)
    setState((current) => ({ ...current, errors: [], loading: true }))

    const [shipmentResult, notificationResult] = await Promise.all([
      settle('Shipments', listShipments({ filters: { receiverCustomerId }, token })),
      settle('Notifications', listNotifications({ filters: { receiverCustomerId }, token })),
    ])

    const shipments = asArray(shipmentResult.value)
    const trackingResults = await Promise.all(
      shipments.slice(0, 6).map((shipment) => settle(`Tracking ${shipment._id}`, getLatestTracking(shipment._id, { token })))
    )

    setState({
      errors: [shipmentResult, notificationResult, ...trackingResults]
        .filter((result) => !result.ok)
        .map((result) => `${result.label}: ${result.error.message}`),
      loading: false,
      notifications: asArray(notificationResult.value),
      shipments,
      trackingSummaries: trackingResults
        .filter((result) => result.ok && result.value)
        .map((result) => result.value),
    })
  }

  useEffect(() => {
    loadCustomerData()
  }, [profile?.id, token])

  return { ...state, loadCustomerData }
}

export function CustomerDashboardPage({ onNavigate, onSignOut, profile, token }) {
  const state = useCustomerData({ profile, token })
  const trackingByShipmentId = useMemo(
    () => new Map(state.trackingSummaries.map((summary) => [summary.shipmentId, summary])),
    [state.trackingSummaries]
  )
  const stats = useMemo(() => [
    { detail: 'Visible in customer portal', icon: 'box', label: 'Active shipments', value: state.shipments.filter((shipment) => shipment.status !== 'received').length },
    { detail: 'Reached consignee', icon: 'check', label: 'Delivered', value: state.shipments.filter((shipment) => shipment.status === 'received').length },
    { detail: 'ETA has passed', icon: 'warning', label: 'Delayed', tone: 'warning', value: countDelayed(state.shipments) },
    { detail: `${state.notifications.filter((notification) => !notification.readAt).length} unread`, icon: 'document', label: 'Notifications', value: state.notifications.length },
  ], [state.shipments, state.notifications])

  return (
    <AppShell active="customer-dashboard" onNavigate={onNavigate} onSignOut={onSignOut} profile={profile}>
      <section className="workspace-hero">
        <div>
          <p className="eyebrow">Customer shipment overview</p>
          <h1>Track your active shipments</h1>
          <p>
            Customer-safe status, ETA, latest event, and support actions for the shipments connected to your company.
          </p>
        </div>
        <div className="workspace-hero-actions">
          <button className="button-primary" onClick={() => onNavigate('/customer/shipments')} type="button">View shipments</button>
          <button className="button-secondary" onClick={() => onNavigate('/customer/support')} type="button">Contact NTG</button>
        </div>
      </section>

      {state.errors.length > 0 ? (
        <Notice tone="warning">
          <strong>Some customer services did not answer.</strong>
          <ul>{state.errors.map((error) => <li key={error}>{error}</li>)}</ul>
        </Notice>
      ) : null}

      {state.loading ? <LoadingGrid count={4} /> : (
        <>
          <div className="stat-grid">
            {stats.map((stat) => <StatCard key={stat.label} {...stat} />)}
          </div>

          <TrackingSearch
            isLoading={false}
            onSubmit={(trackingId) => trackingId && onNavigate(`/customer/shipments/${encodeURIComponent(trackingId)}`)}
          />

          <div className="shipment-grid">
            {state.shipments.slice(0, 6).map((shipment) => (
              <ShipmentCard
                key={shipment._id}
                onOpen={() => onNavigate(`/customer/shipments/${shipment._id}`)}
                shipment={shipment}
                tracking={trackingByShipmentId.get(shipment._id)}
              />
            ))}
          </div>
          {state.shipments.length === 0 ? <EmptyState message="No customer shipments are available yet." /> : null}
        </>
      )}
    </AppShell>
  )
}

export function CustomerShipmentsPage({ onNavigate, onSignOut, profile, token }) {
  const state = useCustomerData({ profile, token })
  const [filters, setFilters] = useState({ query: '', status: 'all' })
  const visibleShipments = useMemo(() => {
    const query = filters.query.trim().toLowerCase()
    return state.shipments
      .filter((shipment) => filters.status === 'all' || shipment.status === filters.status)
      .filter((shipment) => {
        if (!query) return true
        return JSON.stringify(shipment).toLowerCase().includes(query)
      })
  }, [filters, state.shipments])

  return (
    <AppShell active="customer-shipments" onNavigate={onNavigate} onSignOut={onSignOut} profile={profile}>
      <section className="workspace-hero">
        <div>
          <p className="eyebrow">My shipments</p>
          <h1>Customer shipment list</h1>
          <p>Search by tracking number, reference, destination, status, driver, or latest shipment fields.</p>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <span>Filters</span>
            <h2>Shipment search</h2>
          </div>
        </div>
        <div className="form-grid two">
          <label className="field">
            <span>Status</span>
            <select onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} value={filters.status}>
              {['all', 'booked', 'in_transit', 'received'].map((status) => (
                <option key={status} value={status}>{formatStatus(status)}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Search</span>
            <input onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))} placeholder="Tracking ID, destination, driver" value={filters.query} />
          </label>
        </div>
      </section>

      {state.loading ? <LoadingGrid count={4} /> : null}
      {!state.loading && visibleShipments.length > 0 ? (
        <ShipmentTable onOpen={(shipment) => onNavigate(`/customer/shipments/${shipment._id}`)} shipments={visibleShipments} />
      ) : null}
      {!state.loading && visibleShipments.length === 0 ? <EmptyState message="No shipments match the current filter." /> : null}
    </AppShell>
  )
}

export function CustomerSupportPage({ onNavigate, onSignOut, profile, token }) {
  const state = useCustomerData({ profile, token })
  const [form, setForm] = useState({ description: '', shipmentId: '', subject: '' })
  const [message, setMessage] = useState('')
  const customerId = customerIdFor(profile)

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage('')
    if (!form.shipmentId || !form.subject || !form.description) {
      setMessage('Select a shipment and fill subject and description before sending.')
      return
    }

    try {
      await createTicket({
        agentId: profile?.id || 'customer-portal',
        customerId,
        description: form.description,
        shipmentId: form.shipmentId,
        subject: form.subject,
      }, { token })
      setMessage('Support request sent to NTG.')
      setForm((current) => ({ ...current, description: '', subject: '' }))
    } catch (error) {
      setMessage(error.message)
    }
  }

  return (
    <AppShell active="customer-support" onNavigate={onNavigate} onSignOut={onSignOut} profile={profile}>
      <section className="workspace-hero">
        <div>
          <p className="eyebrow">Contact NTG</p>
          <h1>Shipment support</h1>
          <p>Open a support request tied to a shipment so NTG can review status, ETA, and exception context.</p>
        </div>
      </section>

      <div className="panel-grid">
        <section className="form-panel">
          <div className="panel-heading">
            <div>
              <span>Customer support</span>
              <h2>Create support request</h2>
            </div>
          </div>
          <form className="stacked-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Shipment</span>
              <select onChange={(event) => setForm((current) => ({ ...current, shipmentId: event.target.value }))} value={form.shipmentId}>
                <option value="">Select shipment</option>
                {state.shipments.map((shipment) => (
                  <option key={shipment._id} value={shipment._id}>{compactId(shipment._id)} / {formatDateTime(shipment.estimatedArrivalAt)}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Subject</span>
              <input onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))} placeholder="Delay, document, or delivery question" value={form.subject} />
            </label>
            <label className="field">
              <span>Description</span>
              <textarea onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Write the operational question for NTG support" value={form.description} />
            </label>
            {message ? <Notice tone={message.includes('sent') ? 'subtle' : 'warning'}>{message}</Notice> : null}
            <button className="button-primary" type="submit">Contact NTG</button>
          </form>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <span>Shipment context</span>
              <h2>Latest shipments</h2>
            </div>
          </div>
          <ul className="split-list">
            {state.shipments.slice(0, 5).map((shipment) => (
              <li key={shipment._id}>
                <div>
                  <strong>{compactId(shipment._id)}</strong>
                  <small>{formatStatus(shipment.status)} / ETA {formatDateTime(shipment.estimatedArrivalAt)}</small>
                </div>
                <button className="link-button" onClick={() => onNavigate(`/customer/shipments/${shipment._id}`)} type="button">Open</button>
              </li>
            ))}
          </ul>
          {state.shipments.length === 0 ? <EmptyState message="No shipments are available for support context." compact /> : null}
        </section>
      </div>
    </AppShell>
  )
}
