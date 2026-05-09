import React, { useEffect, useMemo, useState } from 'react'
import { listCustomers } from '../clients/customersClient'
import { listDrivers, updateDriverAvailability } from '../clients/driversClient'
import { listNotifications, scanDelayNotifications } from '../clients/notificationsClient'
import { createRoute, listRoutes } from '../clients/routesClient'
import { listSenders } from '../clients/sendersClient'
import { createShipment, deleteShipment, listShipments, updateShipment } from '../clients/shipmentsClient'
import { getDelayedShipments, getDiscrepancies, getMissingEvents, listTickets } from '../clients/supportClient'
import { getLatestTracking } from '../clients/trackingClient'
import {
  AppShell,
  EmptyState,
  LoadingGrid,
  Notice,
  ShipmentTable,
  StatCard,
  StatusBadge,
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

function formatNumber(value) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value || 0)
}

function initialCreateForm(profile) {
  return {
    description: 'General cargo',
    driverId: '',
    plannedPickupAt: '',
    receiverCustomerId: 'customer-1',
    senderId: 'sender-1',
    totalVolumeM3: '2.5',
    totalWeightKG: '100',
    createdByCustomerServiceId: profile?.id || 'operator-console',
    originStreet: '',
    originCity: '',
    originPostalCode: '',
    originCountry: '',
    destinationStreet: '',
    destinationCity: '',
    destinationPostalCode: '',
    destinationCountry: '',
  }
}

function useOperatorData({ token }) {
  const [state, setState] = useState({
    customers: [],
    delayed: [],
    discrepancies: [],
    drivers: [],
    errors: [],
    loading: true,
    missingEvents: [],
    notifications: [],
    routes: [],
    senders: [],
    shipments: [],
    tickets: [],
    trackingSummaries: [],
    updatedAt: null,
  })

  async function loadOperatorData() {
    setState((current) => ({ ...current, errors: [], loading: true }))

    const results = await Promise.all([
      settle('Shipments', listShipments({ token })),
      settle('Routes', listRoutes({ token })),
      settle('Drivers', listDrivers({ token })),
      settle('Notifications', listNotifications({ token })),
      settle('Senders', listSenders({ token })),
      settle('Customers', listCustomers({ token })),
      settle('Tickets', listTickets({ token })),
      settle('Delayed', getDelayedShipments({ token })),
      settle('Discrepancies', getDiscrepancies({ token })),
      settle('Missing events', getMissingEvents({ token })),
    ])

    const valueFor = (label) => results.find((result) => result.label === label)
    const shipments = asArray(valueFor('Shipments')?.value)
    const trackingResults = await Promise.all(
      shipments.slice(0, 10).map((shipment) => settle(`Tracking ${shipment._id}`, getLatestTracking(shipment._id, { token })))
    )

    setState({
      customers: asArray(valueFor('Customers')?.value),
      delayed: asArray(valueFor('Delayed')?.value?.shipments),
      discrepancies: asArray(valueFor('Discrepancies')?.value?.discrepancies),
      drivers: asArray(valueFor('Drivers')?.value),
      errors: [...results, ...trackingResults]
        .filter((result) => !result.ok)
        .map((result) => `${result.label}: ${result.error.message}`),
      loading: false,
      missingEvents: asArray(valueFor('Missing events')?.value?.shipments),
      notifications: asArray(valueFor('Notifications')?.value),
      routes: asArray(valueFor('Routes')?.value),
      senders: asArray(valueFor('Senders')?.value),
      shipments,
      tickets: asArray(valueFor('Tickets')?.value),
      trackingSummaries: trackingResults
        .filter((result) => result.ok && result.value)
        .map((result) => result.value),
      updatedAt: new Date().toISOString(),
    })
  }

  useEffect(() => {
    loadOperatorData()
  }, [token])

  return { ...state, loadOperatorData }
}

function useLookups(state) {
  return useMemo(() => ({
    customersById: new Map(state.customers.map((customer) => [customer.customerId, customer])),
    driversById: new Map(state.drivers.map((driver) => [String(driver.id), driver])),
    routesByShipmentId: new Map(state.routes.map((route) => [route.shipmentId, route])),
    sendersById: new Map(state.senders.map((sender) => [sender.senderId, sender])),
  }), [state.customers, state.drivers, state.routes, state.senders])
}

function OperatorMetrics({ state }) {
  const activeShipments = state.shipments.filter((shipment) => shipment.status !== 'received').length
  const availableDrivers = state.drivers.filter((driver) => driver.available).length
  const exceptions = state.delayed.length + state.discrepancies.length + state.missingEvents.length
  const unreadNotifications = state.notifications.filter((notification) => !notification.readAt).length

  return (
    <div className="stat-grid">
      <StatCard detail={`${formatNumber(activeShipments)} active`} icon="box" label="Shipments" value={state.shipments.length} />
      <StatCard detail={`${formatNumber(state.delayed.length)} delayed`} icon="warning" label="Exceptions" tone="warning" value={exceptions} />
      <StatCard detail={`${formatNumber(availableDrivers)} available`} icon="truck" label="Drivers" value={state.drivers.length} />
      <StatCard detail={`${formatNumber(unreadNotifications)} unread`} icon="document" label="Notifications" value={state.notifications.length} />
    </div>
  )
}

function OperatorHero({ children, onRefresh, state, title }) {
  return (
    <section className="workspace-hero">
      <div>
        <p className="eyebrow">NTG operator / admin</p>
        <h1>{title}</h1>
        <p>{children}</p>
      </div>
      <div className="workspace-hero-actions">
        <button className="button-secondary" disabled={state.loading} onClick={onRefresh} type="button">
          {state.loading ? 'Refreshing' : 'Refresh data'}
        </button>
        <span>{state.updatedAt ? `Updated ${formatDateTime(state.updatedAt)}` : 'Loading live data'}</span>
      </div>
    </section>
  )
}

function AssignmentPanel({ onAssigned, state, token }) {
  const [form, setForm] = useState({ driverId: '', shipmentId: '' })
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setForm((current) => ({
      driverId: current.driverId || state.drivers[0]?.id || '',
      shipmentId: current.shipmentId || state.shipments[0]?._id || '',
    }))
  }, [state.drivers, state.shipments])

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage('')
    if (!form.shipmentId || !form.driverId) {
      setMessage('Select both shipment and driver before assigning.')
      return
    }

    setBusy(true)
    try {
      await updateShipment(form.shipmentId, { driverId: form.driverId }, { token })
      setMessage('Driver assigned to shipment.')
      onAssigned?.()
    } catch (error) {
      setMessage(error.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="stacked-form" onSubmit={handleSubmit}>
      <label className="field">
        <span>Shipment</span>
        <select onChange={(event) => setForm((current) => ({ ...current, shipmentId: event.target.value }))} value={form.shipmentId}>
          {state.shipments.map((shipment) => (
            <option key={shipment._id} value={shipment._id}>{compactId(shipment._id)} / {formatStatus(shipment.status)}</option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Driver</span>
        <select onChange={(event) => setForm((current) => ({ ...current, driverId: event.target.value }))} value={form.driverId}>
          {state.drivers.map((driver) => (
            <option key={driver.id} value={driver.id}>{driver.name} / {driver.available ? 'Available' : 'Unavailable'}</option>
          ))}
        </select>
      </label>
      {message ? <Notice tone={message.includes('assigned') ? 'subtle' : 'warning'}>{message}</Notice> : null}
      <button className="button-primary" disabled={busy || state.shipments.length === 0 || state.drivers.length === 0} type="submit">
        {busy ? 'Assigning' : 'Assign driver'}
      </button>
    </form>
  )
}

function CreateShipmentForm({ onCreated, profile, state, token }) {
  const [form, setForm] = useState(initialCreateForm(profile))
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage('')

    if (!form.senderId || !form.receiverCustomerId || !form.createdByCustomerServiceId) {
      setMessage('Customer, sender, and creator are required before shipment creation.')
      return
    }

    if (!form.originCity || !form.originCountry) {
      setMessage('Origin city and country are required.')
      return
    }

    if (!form.destinationCity || !form.destinationCountry) {
      setMessage('Destination city and country are required.')
      return
    }

    setBusy(true)
    const totalWeightKG = Number(form.totalWeightKG)
    const totalVolumeM3 = Number(form.totalVolumeM3)
    const goods = Number.isFinite(totalWeightKG) && Number.isFinite(totalVolumeM3)
      ? [{
        totalVolumeM3,
        totalWeightKG,
        items: form.description
          ? [{ description: form.description, volumeM3: totalVolumeM3, weightKg: totalWeightKG }]
          : [],
      }]
      : []

    const originAddress = {
      street: form.originStreet || null,
      city: form.originCity,
      postalCode: form.originPostalCode || null,
      country: form.originCountry,
    }
    const destinationAddress = {
      street: form.destinationStreet || null,
      city: form.destinationCity,
      postalCode: form.destinationPostalCode || null,
      country: form.destinationCountry,
    }

    let shipment
    try {
      shipment = await createShipment({
        createdByCustomerServiceId: form.createdByCustomerServiceId,
        driverId: form.driverId || null,
        goods,
        originAddress,
        destinationAddress,
        receiverCustomerId: form.receiverCustomerId,
        senderId: form.senderId,
        status: 'booked',
      }, { token })
    } catch (error) {
      setMessage(error.message)
      setBusy(false)
      return
    }

    try {
      await createRoute({
        shipmentId: shipment._id,
        origin: { address: originAddress },
        destination: { address: destinationAddress },
        plannedPickupAt: form.plannedPickupAt ? new Date(form.plannedPickupAt).toISOString() : null,
      }, { token })
      setMessage(`Shipment ${compactId(shipment._id)} created with route.`)
      onCreated?.()
    } catch (error) {
      // Route creation failed — roll back shipment to preserve atomicity
      try { await deleteShipment(shipment._id, { token }) } catch (_) { /* best effort */ }
      setMessage(`Route creation failed: ${error.message}. Shipment was not saved.`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="stacked-form" onSubmit={handleSubmit}>
      <div className="form-grid two">
        <label className="field">
          <span>Customer</span>
          <select onChange={(event) => updateField('receiverCustomerId', event.target.value)} value={form.receiverCustomerId}>
            <option value="customer-1">customer-1</option>
            {state.customers.map((customer) => (
              <option key={customer.customerId} value={customer.customerId}>
                {customer.company || customer.name || customer.customerId}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Sender</span>
          <select onChange={(event) => updateField('senderId', event.target.value)} value={form.senderId}>
            <option value="sender-1">sender-1</option>
            {state.senders.map((sender) => (
              <option key={sender.senderId} value={sender.senderId}>
                {sender.company || sender.name || sender.senderId}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset>
        <legend>Origin (pickup)</legend>
        <div className="form-grid two">
          <label className="field">
            <span>Street</span>
            <input onChange={(event) => updateField('originStreet', event.target.value)} placeholder="Optional" value={form.originStreet} />
          </label>
          <label className="field">
            <span>Postal code</span>
            <input onChange={(event) => updateField('originPostalCode', event.target.value)} placeholder="Optional" value={form.originPostalCode} />
          </label>
        </div>
        <div className="form-grid two">
          <label className="field">
            <span>City *</span>
            <input onChange={(event) => updateField('originCity', event.target.value)} required value={form.originCity} />
          </label>
          <label className="field">
            <span>Country *</span>
            <input onChange={(event) => updateField('originCountry', event.target.value)} required value={form.originCountry} />
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>Destination (delivery)</legend>
        <div className="form-grid two">
          <label className="field">
            <span>Street</span>
            <input onChange={(event) => updateField('destinationStreet', event.target.value)} placeholder="Optional" value={form.destinationStreet} />
          </label>
          <label className="field">
            <span>Postal code</span>
            <input onChange={(event) => updateField('destinationPostalCode', event.target.value)} placeholder="Optional" value={form.destinationPostalCode} />
          </label>
        </div>
        <div className="form-grid two">
          <label className="field">
            <span>City *</span>
            <input onChange={(event) => updateField('destinationCity', event.target.value)} required value={form.destinationCity} />
          </label>
          <label className="field">
            <span>Country *</span>
            <input onChange={(event) => updateField('destinationCountry', event.target.value)} required value={form.destinationCountry} />
          </label>
        </div>
      </fieldset>

      <div className="form-grid two">
        <label className="field">
          <span>Driver assignment</span>
          <select onChange={(event) => updateField('driverId', event.target.value)} value={form.driverId}>
            <option value="">Assign later</option>
            {state.drivers.map((driver) => (
              <option key={driver.id} value={driver.id}>{driver.name}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Planned pickup</span>
          <input onChange={(event) => updateField('plannedPickupAt', event.target.value)} type="datetime-local" value={form.plannedPickupAt} />
        </label>
      </div>

      <div className="form-grid three">
        <label className="field">
          <span>Cargo description</span>
          <input onChange={(event) => updateField('description', event.target.value)} value={form.description} />
        </label>
        <label className="field">
          <span>Total weight kg</span>
          <input onChange={(event) => updateField('totalWeightKG', event.target.value)} inputMode="decimal" value={form.totalWeightKG} />
        </label>
        <label className="field">
          <span>Total volume m3</span>
          <input onChange={(event) => updateField('totalVolumeM3', event.target.value)} inputMode="decimal" value={form.totalVolumeM3} />
        </label>
      </div>

      <label className="field">
        <span>Created by customer service ID</span>
        <input onChange={(event) => updateField('createdByCustomerServiceId', event.target.value)} value={form.createdByCustomerServiceId} />
      </label>

      {message ? <Notice tone={message.includes('created') ? 'subtle' : 'warning'}>{message}</Notice> : null}
      <button className="button-primary" disabled={busy} type="submit">
        {busy ? 'Creating shipment' : 'Create shipment'}
      </button>
    </form>
  )
}

export function OperatorDashboardPage({ onNavigate, onSignOut, profile, token }) {
  const state = useOperatorData({ token })
  const lookups = useLookups(state)
  const recentEvents = state.trackingSummaries.flatMap((summary) => asArray(summary.history).slice(-2).map((event) => ({
    ...event,
    shipmentId: summary.shipmentId,
  }))).slice(0, 6)

  return (
    <AppShell active="operator-dashboard" onNavigate={onNavigate} onSignOut={onSignOut} profile={profile}>
      <OperatorHero onRefresh={state.loadOperatorData} state={state} title="Control tower">
        Operational overview for shipments, events, driver capacity, exceptions, customer records, and support escalation.
      </OperatorHero>

      {state.errors.length > 0 ? (
        <Notice tone="warning">
          <strong>Some backend services did not answer.</strong>
          <ul>{state.errors.map((error) => <li key={error}>{error}</li>)}</ul>
        </Notice>
      ) : null}

      {state.loading ? <LoadingGrid count={4} /> : (
        <>
          <OperatorMetrics state={state} />

          <div className="panel-grid">
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <span>Shipment operations</span>
                  <h2>Live workboard</h2>
                </div>
                <button className="button-primary compact" onClick={() => onNavigate('/operator/shipments/create')} type="button">Create shipment</button>
              </div>
              {state.shipments.length > 0 ? (
                <ShipmentTable driversById={lookups.driversById} onOpen={(shipment) => onNavigate(`/operator/shipments/${shipment._id}`)} shipments={state.shipments.slice(0, 8)} />
              ) : <EmptyState compact message="No shipments are available." />}
            </section>

            <aside className="panel">
              <div className="panel-heading">
                <div>
                  <span>Driver assignment</span>
                  <h2>Assign driver</h2>
                </div>
              </div>
              <AssignmentPanel onAssigned={state.loadOperatorData} state={state} token={token} />
            </aside>
          </div>

          <div className="panel-grid equal">
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <span>Event stream</span>
                  <h2>Latest milestones</h2>
                </div>
              </div>
              <Timeline events={recentEvents} />
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <span>Exceptions</span>
                  <h2>Delay and data checks</h2>
                </div>
              </div>
              <ul className="split-list">
                <li><div><strong>Delayed shipments</strong><small>ETA or in-transit threshold</small></div><StatusBadge status={state.delayed.length ? 'delayed' : 'online'} /></li>
                <li><div><strong>Data discrepancies</strong><small>Missing goods or route records</small></div><span>{formatNumber(state.discrepancies.length)}</span></li>
                <li><div><strong>Missing events</strong><small>Shipments with incomplete operational records</small></div><span>{formatNumber(state.missingEvents.length)}</span></li>
              </ul>
            </section>
          </div>
        </>
      )}
    </AppShell>
  )
}

export function OperatorShipmentsPage({ onNavigate, onSignOut, profile, token }) {
  const state = useOperatorData({ token })
  const lookups = useLookups(state)
  const [filters, setFilters] = useState({ query: '', status: 'all' })
  const filtered = useMemo(() => {
    const query = filters.query.trim().toLowerCase()
    return state.shipments
      .filter((shipment) => filters.status === 'all' || shipment.status === filters.status)
      .filter((shipment) => !query || JSON.stringify(shipment).toLowerCase().includes(query))
  }, [filters, state.shipments])

  return (
    <AppShell active="operator-shipments" onNavigate={onNavigate} onSignOut={onSignOut} profile={profile}>
      <OperatorHero onRefresh={state.loadOperatorData} state={state} title="Shipment management">
        Manage shipment status, route linkage, driver assignment, ETA, customer context, and operational actions.
      </OperatorHero>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <span>Filters</span>
            <h2>Shipment table</h2>
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
            <input onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))} placeholder="Shipment, customer, sender, driver" value={filters.query} />
          </label>
        </div>
      </section>

      {state.loading ? <LoadingGrid count={4} /> : null}
      {!state.loading && filtered.length > 0 ? (
        <ShipmentTable driversById={lookups.driversById} onOpen={(shipment) => onNavigate(`/operator/shipments/${shipment._id}`)} shipments={filtered} />
      ) : null}
      {!state.loading && filtered.length === 0 ? <EmptyState message="No shipments match the current filter." /> : null}
    </AppShell>
  )
}

export function OperatorCreateShipmentPage({ onNavigate, onSignOut, profile, token }) {
  const state = useOperatorData({ token })

  return (
    <AppShell active="operator-create" onNavigate={onNavigate} onSignOut={onSignOut} profile={profile}>
      <OperatorHero onRefresh={state.loadOperatorData} state={state} title="Create shipment">
        Register a shipment order with customer, sender, cargo, ETA, and optional driver assignment.
      </OperatorHero>

      <section className="form-panel">
        <div className="panel-heading">
          <div>
            <span>Shipment order</span>
            <h2>New shipment</h2>
          </div>
        </div>
        <CreateShipmentForm onCreated={() => {
          state.loadOperatorData()
          onNavigate('/operator/shipments')
        }} profile={profile} state={state} token={token} />
      </section>
    </AppShell>
  )
}

export function OperatorDriversPage({ onNavigate, onSignOut, profile, token }) {
  const state = useOperatorData({ token })
  const [message, setMessage] = useState('')

  async function toggleDriver(driver) {
    setMessage('')
    try {
      await updateDriverAvailability(driver.id, !driver.available, { token })
      setMessage(`${driver.name} is now ${driver.available ? 'unavailable' : 'available'}.`)
      state.loadOperatorData()
    } catch (error) {
      setMessage(error.message)
    }
  }

  return (
    <AppShell active="operator-drivers" onNavigate={onNavigate} onSignOut={onSignOut} profile={profile}>
      <OperatorHero onRefresh={state.loadOperatorData} state={state} title="Driver capacity">
        Monitor available drivers and capacity signals used when assigning shipments.
      </OperatorHero>
      {message ? <Notice tone={message.includes('now') ? 'subtle' : 'warning'}>{message}</Notice> : null}
      {state.loading ? <LoadingGrid count={4} /> : (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span>{state.drivers.length} records</span>
              <h2>Drivers</h2>
            </div>
          </div>
          <ul className="split-list">
            {state.drivers.map((driver) => (
              <li key={driver.id}>
                <div>
                  <strong>{driver.name}</strong>
                  <small>{driver.email} / {driver.phone}</small>
                </div>
                <button className="button-secondary compact" onClick={() => toggleDriver(driver)} type="button">
                  {driver.available ? 'Available' : 'Unavailable'}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </AppShell>
  )
}

export function OperatorCustomersPage({ onNavigate, onSignOut, profile, token }) {
  const state = useOperatorData({ token })

  return (
    <AppShell active="operator-customers" onNavigate={onNavigate} onSignOut={onSignOut} profile={profile}>
      <OperatorHero onRefresh={state.loadOperatorData} state={state} title="Customers and senders">
        Reference view for customer and sender master data connected to shipment records.
      </OperatorHero>
      {state.loading ? <LoadingGrid count={4} /> : (
        <div className="panel-grid equal">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <span>{state.customers.length} records</span>
                <h2>Customers</h2>
              </div>
            </div>
            <ul className="split-list">
              {state.customers.map((customer) => (
                <li key={customer.customerId}>
                  <div>
                    <strong>{customer.company || customer.name || compactId(customer.customerId)}</strong>
                    <small>{customer.email || customer.customerId}</small>
                  </div>
                </li>
              ))}
            </ul>
            {state.customers.length === 0 ? <EmptyState compact message="No customer records are available." /> : null}
          </section>
          <section className="panel">
            <div className="panel-heading">
              <div>
                <span>{state.senders.length} records</span>
                <h2>Senders</h2>
              </div>
            </div>
            <ul className="split-list">
              {state.senders.map((sender) => (
                <li key={sender.senderId}>
                  <div>
                    <strong>{sender.company || sender.name || compactId(sender.senderId)}</strong>
                    <small>{sender.email || sender.senderId}</small>
                  </div>
                </li>
              ))}
            </ul>
            {state.senders.length === 0 ? <EmptyState compact message="No sender records are available." /> : null}
          </section>
        </div>
      )}
    </AppShell>
  )
}

export function OperatorEventsPage({ onNavigate, onSignOut, profile, token }) {
  const state = useOperatorData({ token })
  const [message, setMessage] = useState('')
  const events = state.trackingSummaries.flatMap((summary) => asArray(summary.history).map((event) => ({
    ...event,
    shipmentId: summary.shipmentId,
  })))

  async function handleScan() {
    setMessage('')
    try {
      const result = await scanDelayNotifications({ token })
      setMessage(`Delay scan complete: ${formatNumber(result.delayed)} delayed and ${formatNumber(result.created)} notifications created.`)
      state.loadOperatorData()
    } catch (error) {
      setMessage(error.message)
    }
  }

  return (
    <AppShell active="operator-events" onNavigate={onNavigate} onSignOut={onSignOut} profile={profile}>
      <OperatorHero onRefresh={state.loadOperatorData} state={state} title="Event monitoring">
        View tracking history, delay signals, notification scans, and route event health across active shipments.
      </OperatorHero>
      <div className="workspace-hero-actions">
        <button className="button-primary" onClick={handleScan} type="button">Scan delays</button>
      </div>
      {message ? <Notice tone={message.includes('complete') ? 'subtle' : 'warning'}>{message}</Notice> : null}
      {state.loading ? <LoadingGrid count={4} /> : (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span>{events.length} records</span>
              <h2>Tracking events</h2>
            </div>
          </div>
          <Timeline events={events} />
          {events.length === 0 ? <EmptyState compact message="No tracking events are available." /> : null}
        </section>
      )}
    </AppShell>
  )
}
