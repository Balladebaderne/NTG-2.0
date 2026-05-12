import React, { useEffect, useMemo, useState } from 'react'
import { createUser } from '../clients/authClient'
import { createCustomer, deleteCustomer, listCustomers } from '../clients/customersClient'
import { createDriver, deleteDriver, listDrivers, updateDriverAvailability } from '../clients/driversClient'
import {
  listNotifications,
  markNotificationRead,
  scanDelayNotifications,
} from '../clients/notificationsClient'
import { listRoutes } from '../clients/routesClient'
import { listSenders } from '../clients/sendersClient'
import { listShipments } from '../clients/shipmentsClient'
import {
  createTicket,
  getDelayedShipments,
  getDiscrepancies,
  getMissingEvents,
  listTickets,
  searchShipments,
  searchTracking,
  updateTicket,
} from '../clients/supportClient'
import { getLatestTracking } from '../clients/trackingClient'
import {
  AppShell,
  EmptyState,
  LoadingGrid,
  Notice,
  StatCard,
  StatusBadge,
} from '../components/PortalLayout'
import { asArray, compactId, formatDateTime, formatStatus } from '../utils/format'

const SHIPMENT_STATUS_OPTIONS = ['all', 'booked', 'in_transit', 'received']
const TICKET_STATUS_OPTIONS = ['open', 'in_progress', 'escalated', 'resolved']

const SERVICE_ROWS = [
  { label: 'Shipments', owner: 'shipmentsService', purpose: 'Orders, goods, lifecycle status' },
  { label: 'Routes', owner: 'routeService', purpose: 'Route plans, stops, ETA sync' },
  { label: 'Tracking', owner: 'trackingService', purpose: 'Milestone flow and shipment sync' },
  { label: 'Notifications', owner: 'notificationService', purpose: 'Delay scans and inbox records' },
  { label: 'Support', owner: 'customerSupportService', purpose: 'Tickets, search, exception checks' },
  { label: 'Drivers', owner: 'driverService', purpose: 'Driver profile and availability' },
  { label: 'Senders', owner: 'senderService', purpose: 'Shipper and consignee master data' },
  { label: 'Customers', owner: 'customerService', purpose: 'Customer records and shipment views' },
]

const initialTicketForm = { customerId: '', description: '', shipmentId: '', subject: '' }
const initialDriverAccountForm = { email: '', name: '', password: '', phone: '' }
const initialCustomerAccountForm = { company: '', email: '', name: '', password: '', phone: '' }
const initialLogisticsAccountForm = { customerId: '', email: '', name: '', password: '' }

function formatNumber(value) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value || 0)
}

function formatPercent(value) {
  return `${formatNumber(value)}%`
}

function openTicketCount(tickets) {
  return tickets.filter((ticket) => ['open', 'in_progress', 'escalated'].includes(ticket.status)).length
}

function searchTextForShipment(shipment) {
  return [shipment._id, shipment.senderId, shipment.receiverCustomerId, shipment.driverId, shipment.routeId, shipment.status]
    .filter(Boolean).join(' ').toLowerCase()
}

async function settle(label, task) {
  try {
    return { label, ok: true, value: await task }
  } catch (error) {
    return { label, ok: false, error }
  }
}

export function AdminLandingPage({ onNavigate, onSignOut, profile, token }) {
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
  const [filters, setFilters] = useState({ query: '', status: 'all' })
  const [ticketForm, setTicketForm] = useState(initialTicketForm)
  const [driverAccountForm, setDriverAccountForm] = useState(initialDriverAccountForm)
  const [customerAccountForm, setCustomerAccountForm] = useState(initialCustomerAccountForm)
  const [logisticsAccountForm, setLogisticsAccountForm] = useState(initialLogisticsAccountForm)
const [supportSearch, setSupportSearch] = useState({
    error: '',
    loading: false,
    mode: 'reference',
    query: '',
    results: [],
  })
  const [action, setAction] = useState({ busy: '', message: '', tone: 'subtle' })

  async function loadAdminLanding() {
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
      settle('Missing goods', getMissingEvents({ token })),
    ])

    const valueFor = (label) => results.find((result) => result.label === label)
    const shipments = asArray(valueFor('Shipments')?.value)
    const trackingResults = await Promise.all(
      shipments.slice(0, 8).map((shipment) => settle(`Tracking ${shipment._id}`, getLatestTracking(shipment._id, { token })))
    )

    const customers = asArray(valueFor('Customers')?.value)
    const drivers = asArray(valueFor('Drivers')?.value)

    setState({
      customers,
      delayed: asArray(valueFor('Delayed')?.value?.shipments),
      discrepancies: asArray(valueFor('Discrepancies')?.value?.discrepancies),
      drivers,
      errors: [...results, ...trackingResults]
        .filter((result) => !result.ok)
        .map((result) => `${result.label}: ${result.error.message}`),
      loading: false,
      missingEvents: asArray(valueFor('Missing goods')?.value?.shipments),
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

    if (shipments.length > 0) {
      setTicketForm((current) => ({
        ...current,
        customerId: current.customerId || shipments[0].receiverCustomerId || '',
        shipmentId: current.shipmentId || shipments[0]._id,
      }))
    }

    if (customers.length > 0) {
      setLogisticsAccountForm((current) => ({
        ...current,
        customerId: current.customerId || customers[0].customerId,
      }))
    }
  }

  useEffect(() => {
    loadAdminLanding()
  }, [token])

  const lookups = useMemo(() => {
    const senderById = new Map(state.senders.map((sender) => [sender.senderId, sender]))
    const customerById = new Map(state.customers.map((customer) => [customer.customerId, customer]))
    const driverById = new Map(state.drivers.map((driver) => [String(driver.id), driver]))
    const routeByShipmentId = new Map(state.routes.map((route) => [route.shipmentId, route]))
    const trackingByShipmentId = new Map(state.trackingSummaries.map((summary) => [summary.shipmentId, summary]))
    return { customerById, driverById, routeByShipmentId, senderById, trackingByShipmentId }
  }, [state])

  const metrics = useMemo(() => {
    const totalShipments = state.shipments.length
    const activeShipments = state.shipments.filter((s) => s.status !== 'received').length
    const routeCoverage = totalShipments
      ? Math.round((state.shipments.filter((s) => s.routeId).length / totalShipments) * 100)
      : 0
    const availableDrivers = state.drivers.filter((d) => d.available).length
    const unreadNotifications = state.notifications.filter((n) => !n.readAt).length
    const exceptionCount = state.delayed.length + state.discrepancies.length + state.missingEvents.length
    return [
      { detail: `${formatNumber(activeShipments)} active`, icon: 'box', label: 'Shipments', value: totalShipments },
      { detail: `${formatNumber(state.delayed.length)} delayed`, icon: 'warning', label: 'Exceptions', tone: 'warning', value: exceptionCount },
      { detail: `${formatPercent(routeCoverage)} route linked`, icon: 'route', label: 'Route coverage', value: `${routeCoverage}%` },
      { detail: `${formatNumber(availableDrivers)} available`, icon: 'truck', label: 'Drivers', value: state.drivers.length },
      { detail: `${formatNumber(unreadNotifications)} unread`, icon: 'document', label: 'Notifications', value: state.notifications.length },
      { detail: `${formatNumber(openTicketCount(state.tickets))} open`, icon: 'user', label: 'Support tickets', value: state.tickets.length },
    ]
  }, [state])

  const filteredShipments = useMemo(() => {
    const query = filters.query.trim().toLowerCase()
    return state.shipments
      .filter((s) => filters.status === 'all' || s.status === filters.status)
      .filter((s) => !query || searchTextForShipment(s).includes(query))
      .slice(0, 10)
  }, [filters, state.shipments])

  const serviceRows = useMemo(() => {
    const failedLabels = state.errors.map((e) => e.split(':')[0])
    const counts = {
      Customers: state.customers.length,
      Drivers: state.drivers.length,
      Notifications: state.notifications.length,
      Routes: state.routes.length,
      Senders: state.senders.length,
      Shipments: state.shipments.length,
      Support: state.tickets.length,
      Tracking: state.trackingSummaries.length,
    }
    return SERVICE_ROWS.map((row) => ({
      ...row,
      count: counts[row.label] || 0,
      health: failedLabels.some((l) => l === row.label || l.startsWith(`${row.label} `)) ? 'Degraded' : 'Online',
    }))
  }, [state])

  function shipmentLabel(id) { return compactId(id) }
  function customerLabel(id) {
    const c = lookups.customerById.get(id)
    return c?.company || c?.name || compactId(id)
  }
  function senderLabel(id) {
    const s = lookups.senderById.get(id)
    return s?.company || s?.name || compactId(id)
  }
  function driverLabel(id) {
    const d = lookups.driverById.get(String(id))
    return d?.name || compactId(id)
  }

  function handleTicketShipmentChange(shipmentId) {
    const shipment = state.shipments.find((s) => s._id === shipmentId)
    setTicketForm((current) => ({
      ...current,
      customerId: shipment?.receiverCustomerId || current.customerId,
      shipmentId,
    }))
  }

  async function runAction(label, task, successMessage) {
    setAction({ busy: label, message: '', tone: 'subtle' })
    try {
      const result = await task()
      setAction({ busy: '', message: successMessage(result), tone: 'subtle' })
      await loadAdminLanding()
      return true
    } catch (error) {
      setAction({ busy: '', message: error.message, tone: 'warning' })
      return false
    }
  }

  function missingFields(form, fields) {
    return fields.some((field) => !String(form[field] || '').trim())
  }

  async function handleCreateDriverAccount(event) {
    event.preventDefault()
    if (missingFields(driverAccountForm, ['email', 'name', 'password', 'phone'])) {
      setAction({ busy: '', message: 'Fill driver name, email, phone, and password.', tone: 'warning' })
      return
    }

    const saved = await runAction(
      'driver-account-create',
      async () => {
        const driver = await createDriver({
          email: driverAccountForm.email,
          name: driverAccountForm.name,
          phone: driverAccountForm.phone,
        }, { token })

        try {
          return await createUser({
            email: driverAccountForm.email,
            id: String(driver.id),
            name: driverAccountForm.name,
            password: driverAccountForm.password,
            role: 'driver',
          }, { token })
        } catch (error) {
          try {
            await deleteDriver(driver.id, { token })
          } catch (rollbackError) {
            error.message = `${error.message} Driver profile rollback failed: ${rollbackError.message}`
          }
          throw error
        }
      },
      (result) => `${result.user.name} can now sign in as Driver.`
    )

    if (saved) setDriverAccountForm(initialDriverAccountForm)
  }

  async function handleCreateCustomerAccount(event) {
    event.preventDefault()
    if (missingFields(customerAccountForm, ['email', 'name', 'password'])) {
      setAction({ busy: '', message: 'Fill customer name, email, and password.', tone: 'warning' })
      return
    }

    const saved = await runAction(
      'customer-account-create',
      async () => {
        const customer = await createCustomer({
          company: customerAccountForm.company || null,
          email: customerAccountForm.email,
          name: customerAccountForm.name,
          phone: customerAccountForm.phone || null,
        }, { token })

        try {
          return await createUser({
            customerId: customer.customerId,
            email: customerAccountForm.email,
            id: customer.customerId,
            name: customerAccountForm.name,
            password: customerAccountForm.password,
            role: 'customer',
          }, { token })
        } catch (error) {
          try {
            await deleteCustomer(customer.customerId, { token })
          } catch (rollbackError) {
            error.message = `${error.message} Customer record rollback failed: ${rollbackError.message}`
          }
          throw error
        }
      },
      (result) => `${result.user.name} can now sign in as Customer.`
    )

    if (saved) setCustomerAccountForm(initialCustomerAccountForm)
  }

  async function handleCreateLogisticsAccount(event) {
    event.preventDefault()
    if (missingFields(logisticsAccountForm, ['customerId', 'email', 'name', 'password'])) {
      setAction({ busy: '', message: 'Select customer and fill logistics manager name, email, and password.', tone: 'warning' })
      return
    }

    const saved = await runAction(
      'logistics-account-create',
      () => createUser({
        customerId: logisticsAccountForm.customerId,
        email: logisticsAccountForm.email,
        name: logisticsAccountForm.name,
        password: logisticsAccountForm.password,
        role: 'logistics',
      }, { token }),
      (result) => `${result.user.name} can now sign in as Logistics Manager.`
    )

    if (saved) {
      setLogisticsAccountForm((current) => ({
        ...initialLogisticsAccountForm,
        customerId: current.customerId,
      }))
    }
  }

  async function handleScanDelays() {
    await runAction(
      'scan-delays',
      () => scanDelayNotifications({ token }),
      (r) => `Delay scan complete: ${formatNumber(r.delayed)} delayed and ${formatNumber(r.created)} notifications created.`
    )
  }

  async function handleMarkNotificationRead(notification) {
    const notificationId = notification.id || notification.notificationId
    if (!notificationId) return
    await runAction(
      `notification-${notificationId}`,
      () => markNotificationRead(notificationId, { token }),
      () => 'Notification marked as read.'
    )
  }

  async function handleToggleDriver(driver) {
    await runAction(
      `driver-${driver.id}`,
      () => updateDriverAvailability(driver.id, !driver.available, { token }),
      () => `${driver.name} is now ${driver.available ? 'unavailable' : 'available'}.`
    )
  }

  async function handleCreateTicket(event) {
    event.preventDefault()
    if (!ticketForm.shipmentId || !ticketForm.customerId || !ticketForm.subject || !ticketForm.description) {
      setAction({ busy: '', message: 'Fill shipment, customer, subject, and description.', tone: 'warning' })
      return
    }
    const saved = await runAction(
      'ticket-create',
      () => createTicket({ ...ticketForm, agentId: profile?.id || profile?.email || 'admin-console' }, { token }),
      () => 'Support ticket created.'
    )
    if (saved) setTicketForm((current) => ({ ...current, description: '', subject: '' }))
  }

  async function handleTicketStatus(ticket, status) {
    await runAction(
      `ticket-${ticket.ticketId}`,
      () => updateTicket(ticket.ticketId, { status }, { token }),
      () => `Ticket ${compactId(ticket.ticketId)} moved to ${formatStatus(status)}.`
    )
  }

  async function handleSupportSearch(event) {
    event.preventDefault()
    const query = supportSearch.query.trim()
    if (!query) {
      setSupportSearch((current) => ({ ...current, error: 'Enter a shipment ID, destination, or reference.' }))
      return
    }
    setSupportSearch((current) => ({ ...current, error: '', loading: true, results: [] }))
    try {
      const result = supportSearch.mode === 'id'
        ? await searchTracking(query, { token })
        : await searchShipments({ [supportSearch.mode]: query, token })
      setSupportSearch((current) => ({
        ...current,
        loading: false,
        results: Array.isArray(result) ? result : result ? [result] : [],
      }))
    } catch (error) {
      setSupportSearch((current) => ({ ...current, error: error.message, loading: false, results: [] }))
    }
  }

  return (
    <AppShell active="operator-console" onNavigate={onNavigate} onSignOut={onSignOut} profile={profile} token={token}>
      {/* Hero */}
      <section className="workspace-hero">
        <div>
          <p className="eyebrow">Admin console</p>
          <h1>Control tower</h1>
          <p>
            Operational command surface for the NTG service platform: shipment lifecycle, route coverage, tracking
            milestones, delay notifications, driver capacity, and support escalation.
          </p>
        </div>
        <div className="workspace-hero-actions">
          <button
            className="button-secondary"
            disabled={action.busy === 'scan-delays'}
            onClick={handleScanDelays}
            type="button"
          >
            {action.busy === 'scan-delays' ? 'Scanning delays' : 'Scan delays'}
          </button>
          <button className="button-secondary" disabled={state.loading} onClick={loadAdminLanding} type="button">
            {state.loading ? 'Refreshing' : 'Refresh data'}
          </button>
          <span>{state.updatedAt ? `Updated ${formatDateTime(state.updatedAt)}` : 'Loading live data'}</span>
        </div>
      </section>

      {/* Global notices */}
      {action.message ? <Notice tone={action.tone}>{action.message}</Notice> : null}
      {state.errors.length > 0 ? (
        <Notice tone="warning">
          <strong>Some backend services did not answer.</strong>
          <ul>{state.errors.map((error) => <li key={error}>{error}</li>)}</ul>
        </Notice>
      ) : null}

      {/* Metrics grid */}
      {state.loading ? <LoadingGrid count={6} /> : (
        <div className="stat-grid-6">
          {metrics.map((metric) => (
            <StatCard
              key={metric.label}
              detail={metric.detail}
              icon={metric.icon}
              label={metric.label}
              tone={metric.tone || 'default'}
              value={metric.value}
            />
          ))}
        </div>
      )}

      {!state.loading && profile?.role === 'admin' ? (
        <div className="panel-grid three">
          <section className="form-panel">
            <div className="panel-heading">
              <div>
                <span>Identity service</span>
                <h2>Create driver login</h2>
              </div>
            </div>
            <form className="stacked-form" onSubmit={handleCreateDriverAccount}>
              <label className="field">
                <span>Name</span>
                <input
                  onChange={(event) => setDriverAccountForm((current) => ({ ...current, name: event.target.value }))}
                  required
                  value={driverAccountForm.name}
                />
              </label>
              <label className="field">
                <span>Email</span>
                <input
                  onChange={(event) => setDriverAccountForm((current) => ({ ...current, email: event.target.value }))}
                  required
                  type="email"
                  value={driverAccountForm.email}
                />
              </label>
              <label className="field">
                <span>Phone</span>
                <input
                  onChange={(event) => setDriverAccountForm((current) => ({ ...current, phone: event.target.value }))}
                  required
                  type="tel"
                  value={driverAccountForm.phone}
                />
              </label>
              <label className="field">
                <span>Password</span>
                <input
                  onChange={(event) => setDriverAccountForm((current) => ({ ...current, password: event.target.value }))}
                  required
                  type="password"
                  value={driverAccountForm.password}
                />
              </label>
              <button className="button-primary" disabled={action.busy === 'driver-account-create'} type="submit">
                {action.busy === 'driver-account-create' ? 'Creating' : 'Create driver'}
              </button>
            </form>
          </section>

          <section className="form-panel">
            <div className="panel-heading">
              <div>
                <span>Customer service</span>
                <h2>Create customer login</h2>
              </div>
            </div>
            <form className="stacked-form" onSubmit={handleCreateCustomerAccount}>
              <label className="field">
                <span>Name</span>
                <input
                  onChange={(event) => setCustomerAccountForm((current) => ({ ...current, name: event.target.value }))}
                  required
                  value={customerAccountForm.name}
                />
              </label>
              <label className="field">
                <span>Company</span>
                <input
                  onChange={(event) => setCustomerAccountForm((current) => ({ ...current, company: event.target.value }))}
                  value={customerAccountForm.company}
                />
              </label>
              <label className="field">
                <span>Email</span>
                <input
                  onChange={(event) => setCustomerAccountForm((current) => ({ ...current, email: event.target.value }))}
                  required
                  type="email"
                  value={customerAccountForm.email}
                />
              </label>
              <label className="field">
                <span>Phone</span>
                <input
                  onChange={(event) => setCustomerAccountForm((current) => ({ ...current, phone: event.target.value }))}
                  type="tel"
                  value={customerAccountForm.phone}
                />
              </label>
              <label className="field">
                <span>Password</span>
                <input
                  onChange={(event) => setCustomerAccountForm((current) => ({ ...current, password: event.target.value }))}
                  required
                  type="password"
                  value={customerAccountForm.password}
                />
              </label>
              <button className="button-primary" disabled={action.busy === 'customer-account-create'} type="submit">
                {action.busy === 'customer-account-create' ? 'Creating' : 'Create customer'}
              </button>
            </form>
          </section>

          <section className="form-panel">
            <div className="panel-heading">
              <div>
                <span>Customer account</span>
                <h2>Create logistics manager</h2>
              </div>
            </div>
            <form className="stacked-form" onSubmit={handleCreateLogisticsAccount}>
              <label className="field">
                <span>Customer</span>
                <select
                  disabled={state.customers.length === 0}
                  onChange={(event) => setLogisticsAccountForm((current) => ({ ...current, customerId: event.target.value }))}
                  required
                  value={logisticsAccountForm.customerId}
                >
                  <option value="">Select customer</option>
                  {state.customers.map((customer) => (
                    <option key={customer.customerId} value={customer.customerId}>
                      {customer.company || customer.name || customer.customerId}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Name</span>
                <input
                  onChange={(event) => setLogisticsAccountForm((current) => ({ ...current, name: event.target.value }))}
                  required
                  value={logisticsAccountForm.name}
                />
              </label>
              <label className="field">
                <span>Email</span>
                <input
                  onChange={(event) => setLogisticsAccountForm((current) => ({ ...current, email: event.target.value }))}
                  required
                  type="email"
                  value={logisticsAccountForm.email}
                />
              </label>
              <label className="field">
                <span>Password</span>
                <input
                  onChange={(event) => setLogisticsAccountForm((current) => ({ ...current, password: event.target.value }))}
                  required
                  type="password"
                  value={logisticsAccountForm.password}
                />
              </label>
              <button
                className="button-primary"
                disabled={action.busy === 'logistics-account-create' || state.customers.length === 0}
                type="submit"
              >
                {action.busy === 'logistics-account-create' ? 'Creating' : 'Create manager'}
              </button>
            </form>
          </section>
        </div>
      ) : null}

      {/* Live workboard + side rail */}
      {!state.loading && (
        <div className="panel-grid">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <span>Shipment operations</span>
                <h2>Live workboard</h2>
              </div>
            </div>
            <div className="form-grid two" style={{ marginBottom: '18px' }}>
              <label className="field">
                <span>Status</span>
                <select
                  onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
                  value={filters.status}
                >
                  {SHIPMENT_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>{formatStatus(status)}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Filter</span>
                <input
                  onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
                  placeholder="Shipment, sender, customer, driver"
                  value={filters.query}
                />
              </label>
            </div>
            {filteredShipments.length === 0 ? (
              <EmptyState compact message="No shipments match the current filter." />
            ) : (
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th scope="col">Shipment</th>
                      <th scope="col">Status</th>
                      <th scope="col">Customer</th>
                      <th scope="col">Sender</th>
                      <th scope="col">Route</th>
                      <th scope="col">Tracking</th>
                      <th scope="col">ETA</th>
                      <th scope="col">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredShipments.map((shipment) => {
                      const route = lookups.routeByShipmentId.get(shipment._id)
                      const tracking = lookups.trackingByShipmentId.get(shipment._id)
                      return (
                        <tr key={shipment._id}>
                          <td>{shipmentLabel(shipment._id)}</td>
                          <td><StatusBadge status={shipment.status} /></td>
                          <td>{customerLabel(shipment.receiverCustomerId)}</td>
                          <td>{senderLabel(shipment.senderId)}</td>
                          <td>{route ? formatStatus(route.status) : compactId(shipment.routeId)}</td>
                          <td>{tracking?.trackingStatusLabel || 'No event yet'}</td>
                          <td>{formatDateTime(shipment.estimatedArrivalAt)}</td>
                          <td>
                            <button className="link-button" onClick={() => onNavigate(`/shipments/${shipment._id}`)} type="button">
                              Open
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div className="panel-aside-stack">
            {/* Exception queue */}
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <span>Exception queue</span>
                  <h2>Needs attention</h2>
                </div>
              </div>
              <ul className="split-list">
                <li>
                  <div><strong>Delayed shipments</strong><small>ETA threshold exceeded</small></div>
                  <StatusBadge status={state.delayed.length ? 'delayed' : 'online'} />
                </li>
                <li>
                  <div><strong>Data discrepancies</strong><small>Missing goods or route records</small></div>
                  <span>{formatNumber(state.discrepancies.length)}</span>
                </li>
                <li>
                  <div><strong>Missing events</strong><small>Incomplete operational records</small></div>
                  <span>{formatNumber(state.missingEvents.length)}</span>
                </li>
              </ul>
              {state.discrepancies.slice(0, 3).map((item) => (
                <div className="exception-row" key={item.shipment?._id}>
                  <strong>{compactId(item.shipment?._id)}</strong>
                  <p>{asArray(item.issues).join(', ')}</p>
                </div>
              ))}
            </section>

            {/* Latest alerts */}
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <span>Notifications</span>
                  <h2>Latest alerts</h2>
                </div>
              </div>
              {state.notifications.length === 0 ? (
                <EmptyState compact message="No notifications have been created." />
              ) : (
                <ul className="split-list">
                  {state.notifications.slice(0, 5).map((notification) => {
                    const notificationId = notification.id || notification.notificationId
                    return (
                      <li key={notificationId || `${notification.shipmentId}-${notification.createdAt}`}>
                        <div>
                          <strong>{notification.title || 'Notification'}</strong>
                          <small>{compactId(notification.shipmentId)} / {formatDateTime(notification.createdAt)}</small>
                        </div>
                        {!notification.readAt && notificationId ? (
                          <button
                            className="button-neutral compact"
                            disabled={action.busy === `notification-${notificationId}`}
                            onClick={() => handleMarkNotificationRead(notification)}
                            type="button"
                          >
                            Mark read
                          </button>
                        ) : (
                          <span className="read-badge">Read</span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}

      {/* Operational tools: grid */}
      {!state.loading && (
        <div className="panel-grid equal">
          {/* Create support escalation */}
          <section className="form-panel">
            <div className="panel-heading">
              <div>
                <span>Support service</span>
                <h2>Create escalation</h2>
              </div>
            </div>
            <form className="stacked-form" onSubmit={handleCreateTicket}>
              <label className="field">
                <span>Shipment</span>
                <select onChange={(event) => handleTicketShipmentChange(event.target.value)} value={ticketForm.shipmentId}>
                  {state.shipments.map((s) => (
                    <option key={s._id} value={s._id}>
                      {shipmentLabel(s._id)} / {customerLabel(s.receiverCustomerId)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Customer ID</span>
                <input
                  onChange={(event) => setTicketForm((current) => ({ ...current, customerId: event.target.value }))}
                  value={ticketForm.customerId}
                />
              </label>
              <label className="field">
                <span>Subject</span>
                <input
                  onChange={(event) => setTicketForm((current) => ({ ...current, subject: event.target.value }))}
                  placeholder="Delay, discrepancy, or escalation subject"
                  value={ticketForm.subject}
                />
              </label>
              <label className="field">
                <span>Description</span>
                <textarea
                  onChange={(event) => setTicketForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder="What should support resolve?"
                  value={ticketForm.description}
                />
              </label>
              <button className="button-primary" disabled={action.busy === 'ticket-create'} type="submit">
                {action.busy === 'ticket-create' ? 'Creating' : 'Create ticket'}
              </button>
            </form>
          </section>

          {/* Driver capacity */}
          <section className="panel">
            <div className="panel-heading">
              <div>
                <span>Driver service</span>
                <h2>Capacity</h2>
              </div>
            </div>
            {state.drivers.length === 0 ? (
              <EmptyState compact message="No driver records available." />
            ) : (
              <ul className="split-list">
                {state.drivers.map((driver) => (
                  <li key={driver.id}>
                    <div>
                      <strong>{driver.name}</strong>
                      <small>{driver.email}</small>
                    </div>
                    <button
                      className={driver.available ? 'driver-available-pill' : 'driver-unavailable-pill'}
                      disabled={action.busy === `driver-${driver.id}`}
                      onClick={() => handleToggleDriver(driver)}
                      type="button"
                    >
                      {driver.available ? 'Available' : 'Unavailable'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Ticket queue */}
          <section className="panel">
            <div className="panel-heading">
              <div>
                <span>Ticket queue</span>
                <h2>Status control</h2>
              </div>
            </div>
            {state.tickets.length === 0 ? (
              <EmptyState compact message="No support tickets yet." />
            ) : (
              <ul className="split-list">
                {state.tickets.slice(0, 5).map((ticket) => (
                  <li key={ticket.ticketId}>
                    <div>
                      <strong>{ticket.subject}</strong>
                      <small>{compactId(ticket.shipmentId)} / {formatDateTime(ticket.createdAt)}</small>
                    </div>
                    <select
                      aria-label={`Update status for ${ticket.subject}`}
                      className="ticket-status-select"
                      onChange={(event) => handleTicketStatus(ticket, event.target.value)}
                      value={ticket.status}
                    >
                      {TICKET_STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>{formatStatus(status)}</option>
                      ))}
                    </select>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {/* Bottom intel grid */}
      {!state.loading && (
        <div className="panel-grid three">
          {/* Support search */}
          <section className="form-panel">
            <div className="panel-heading">
              <div>
                <span>Support search</span>
                <h2>Find shipment context</h2>
              </div>
            </div>
            <form className="stacked-form" onSubmit={handleSupportSearch}>
              <label className="field">
                <span>Mode</span>
                <select
                  onChange={(event) => setSupportSearch((current) => ({ ...current, mode: event.target.value }))}
                  value={supportSearch.mode}
                >
                  <option value="reference">Reference</option>
                  <option value="destination">Destination</option>
                  <option value="id">Shipment ID</option>
                </select>
              </label>
              <label className="field">
                <span>Search value</span>
                <input
                  onChange={(event) => setSupportSearch((current) => ({ ...current, query: event.target.value }))}
                  placeholder="ID, destination, or reference"
                  value={supportSearch.query}
                />
              </label>
              <button className="button-primary" disabled={supportSearch.loading} type="submit">
                {supportSearch.loading ? 'Searching' : 'Search'}
              </button>
            </form>
            {supportSearch.error ? <Notice tone="warning">{supportSearch.error}</Notice> : null}
            {supportSearch.results.length > 0 ? (
              <ul className="split-list" style={{ marginTop: '14px' }}>
                {supportSearch.results.slice(0, 5).map((shipment) => (
                  <li key={shipment._id || shipment.shipmentId}>
                    <div>
                      <strong>{compactId(shipment._id || shipment.shipmentId)}</strong>
                      <small>{formatStatus(shipment.status)}</small>
                    </div>
                    <button
                      className="link-button"
                      onClick={() => onNavigate(`/shipments/${shipment._id || shipment.shipmentId}`)}
                      type="button"
                    >
                      Open
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          {/* Route plans */}
          <section className="panel">
            <div className="panel-heading">
              <div>
                <span>Route service</span>
                <h2>Route plans</h2>
              </div>
              <span>{formatNumber(state.routes.length)} records</span>
            </div>
            {state.routes.length === 0 ? (
              <EmptyState compact message="No route plans available." />
            ) : (
              <ul className="split-list">
                {state.routes.slice(0, 6).map((route) => (
                  <li key={route.routeId}>
                    <div>
                      <strong>{route.origin?.address?.city || 'Origin'} → {route.destination?.address?.city || 'Destination'}</strong>
                      <small>{shipmentLabel(route.shipmentId)} / {driverLabel(route.assignedDriverId)}</small>
                    </div>
                    <StatusBadge status={route.status} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Backend service health */}
          <section className="panel">
            <div className="panel-heading">
              <div>
                <span>Platform map</span>
                <h2>Backend services</h2>
              </div>
            </div>
            <div className="service-health-grid">
              {serviceRows.map((service) => (
                <article className="service-health-row" key={service.label}>
                  <div>
                    <strong>{service.label}</strong>
                    <span className="service-owner">{service.owner}</span>
                  </div>
                  <p className="service-purpose">{service.purpose}</p>
                  <span className={`status-badge ${service.health === 'Online' ? 'status-online' : 'status-delayed'}`}>
                    {service.health}
                  </span>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}
    </AppShell>
  )
}
