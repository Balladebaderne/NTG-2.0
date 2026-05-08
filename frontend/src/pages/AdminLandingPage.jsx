import React, { useEffect, useMemo, useState } from 'react'
import { listCustomers } from '../clients/customersClient'
import { listDrivers, updateDriverAvailability } from '../clients/driversClient'
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
import { createTrackingEvent, getLatestTracking } from '../clients/trackingClient'
import { SignedInHeader } from '../components/SignedInHeader'
import { asArray, compactId, formatDateTime, formatStatus } from '../utils/format'

const SHIPMENT_STATUS_OPTIONS = ['all', 'booked', 'in_transit', 'received']
const TICKET_STATUS_OPTIONS = ['open', 'in_progress', 'escalated', 'resolved']
const TRACKING_MILESTONES = [
  { value: 'shipment_order_created', label: 'Shipment order created' },
  { value: 'transport_planned_carrier_assigned', label: 'Transport planned and carrier assigned' },
  { value: 'pickup_scheduled', label: 'Pickup scheduled' },
  { value: 'truck_arrived_pickup', label: 'Truck arrived at pickup' },
  { value: 'goods_loaded_pickup_confirmed', label: 'Goods loaded and pickup confirmed' },
  { value: 'shipment_in_transit', label: 'Shipment in transit' },
  { value: 'departed_origin_terminal', label: 'Departed origin terminal' },
  { value: 'in_transit_milestone', label: 'In transit milestone' },
  { value: 'delay_logged', label: 'Delay logged' },
  { value: 'exception_logged', label: 'Exception logged' },
  { value: 'arrived_destination_terminal', label: 'Arrived destination terminal' },
  { value: 'out_for_delivery', label: 'Out for delivery' },
  { value: 'truck_arrived_delivery', label: 'Truck arrived at delivery' },
  { value: 'goods_delivered', label: 'Goods delivered' },
  { value: 'pod_confirmed', label: 'Proof of delivery confirmed' },
  { value: 'shipment_completed_closed', label: 'Shipment completed and closed' },
]

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

const initialTicketForm = {
  customerId: '',
  description: '',
  shipmentId: '',
  subject: '',
}

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

function formatPercent(value) {
  return `${formatNumber(value)}%`
}

function statusClass(value) {
  return `status-pill status-${String(value || 'unknown').replaceAll('_', '-')}`
}

function countByStatus(items, status) {
  return items.filter((item) => item.status === status).length
}

function openTicketCount(tickets) {
  return tickets.filter((ticket) => ['open', 'in_progress', 'escalated'].includes(ticket.status)).length
}

function searchTextForShipment(shipment) {
  return [
    shipment._id,
    shipment.senderId,
    shipment.receiverCustomerId,
    shipment.driverId,
    shipment.routeId,
    shipment.status,
  ].filter(Boolean).join(' ').toLowerCase()
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
  const [trackingForm, setTrackingForm] = useState({
    eventType: 'shipment_order_created',
    notes: '',
    shipmentId: '',
  })
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
      shipments.slice(0, 8).map((shipment) => (
        settle(`Tracking ${shipment._id}`, getLatestTracking(shipment._id, { token }))
      ))
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
      setTrackingForm((current) => ({
        ...current,
        shipmentId: current.shipmentId || shipments[0]._id,
      }))
      setTicketForm((current) => ({
        ...current,
        customerId: current.customerId || shipments[0].receiverCustomerId || '',
        shipmentId: current.shipmentId || shipments[0]._id,
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
    const activeShipments = state.shipments.filter((shipment) => shipment.status !== 'received').length
    const routeCoverage = totalShipments
      ? Math.round((state.shipments.filter((shipment) => shipment.routeId).length / totalShipments) * 100)
      : 0
    const availableDrivers = state.drivers.filter((driver) => driver.available).length
    const unreadNotifications = state.notifications.filter((notification) => !notification.readAt).length
    const exceptionCount = state.delayed.length + state.discrepancies.length + state.missingEvents.length

    return [
      { detail: `${formatNumber(activeShipments)} active`, label: 'Shipments', value: totalShipments },
      { detail: `${formatNumber(state.delayed.length)} delayed`, label: 'Exceptions', value: exceptionCount },
      { detail: `${formatPercent(routeCoverage)} route linked`, label: 'Route coverage', value: routeCoverage },
      { detail: `${formatNumber(availableDrivers)} available`, label: 'Drivers', value: state.drivers.length },
      { detail: `${formatNumber(unreadNotifications)} unread`, label: 'Notifications', value: state.notifications.length },
      { detail: `${formatNumber(openTicketCount(state.tickets))} open`, label: 'Support tickets', value: state.tickets.length },
    ]
  }, [state])

  const filteredShipments = useMemo(() => {
    const query = filters.query.trim().toLowerCase()

    return state.shipments
      .filter((shipment) => filters.status === 'all' || shipment.status === filters.status)
      .filter((shipment) => !query || searchTextForShipment(shipment).includes(query))
      .slice(0, 10)
  }, [filters, state.shipments])

  const serviceRows = useMemo(() => {
    const failedLabels = state.errors.map((error) => error.split(':')[0])
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
      health: failedLabels.some((label) => label === row.label || label.startsWith(`${row.label} `))
        ? 'Degraded'
        : 'Online',
    }))
  }, [state])

  function shipmentLabel(shipmentId) {
    return compactId(shipmentId)
  }

  function customerLabel(customerId) {
    const customer = lookups.customerById.get(customerId)
    return customer?.company || customer?.name || compactId(customerId)
  }

  function senderLabel(senderId) {
    const sender = lookups.senderById.get(senderId)
    return sender?.company || sender?.name || compactId(senderId)
  }

  function driverLabel(driverId) {
    const driver = lookups.driverById.get(String(driverId))
    return driver?.name || compactId(driverId)
  }

  function handleTicketShipmentChange(shipmentId) {
    const shipment = state.shipments.find((item) => item._id === shipmentId)
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

  async function handleScanDelays() {
    await runAction(
      'scan-delays',
      () => scanDelayNotifications({ token }),
      (result) => `Delay scan complete: ${formatNumber(result.delayed)} delayed and ${formatNumber(result.created)} notifications created.`
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

  async function handleRecordMilestone(event) {
    event.preventDefault()

    if (!trackingForm.shipmentId) {
      setAction({ busy: '', message: 'Select a shipment before recording a milestone.', tone: 'warning' })
      return
    }

    const saved = await runAction(
      'tracking',
      () => createTrackingEvent(trackingForm.shipmentId, {
        eventType: trackingForm.eventType,
        idempotencyKey: `admin-${trackingForm.shipmentId}-${trackingForm.eventType}-${Date.now()}`,
        notes: trackingForm.notes || undefined,
        occurredAt: new Date().toISOString(),
      }, { token }),
      () => 'Tracking milestone recorded and shipment status sync requested.'
    )
    if (saved) setTrackingForm((current) => ({ ...current, notes: '' }))
  }

  async function handleCreateTicket(event) {
    event.preventDefault()

    if (!ticketForm.shipmentId || !ticketForm.customerId || !ticketForm.subject || !ticketForm.description) {
      setAction({ busy: '', message: 'Fill shipment, customer, subject, and description before creating a ticket.', tone: 'warning' })
      return
    }

    const saved = await runAction(
      'ticket-create',
      () => createTicket({
        ...ticketForm,
        agentId: profile?.id || profile?.email || 'admin-console',
      }, { token }),
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
      setSupportSearch((current) => ({ ...current, error: 'Enter a shipment id, destination, or reference.' }))
      return
    }

    setSupportSearch((current) => ({ ...current, error: '', loading: true, results: [] }))

    try {
      const result = supportSearch.mode === 'id'
        ? await searchTracking(query, { token })
        : await searchShipments({
          [supportSearch.mode]: query,
          token,
        })

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
    <main className="operations-shell admin-console-shell">
      <SignedInHeader active="admin" onNavigate={onNavigate} onSignOut={onSignOut} profile={profile} />

      <section className="admin-console" aria-labelledby="admin-title">
        <div className="admin-console-heading">
          <div>
            <p className="eyebrow">Admin console</p>
            <h1 id="admin-title">Control tower</h1>
            <p>
              Operational command surface for the NTG service platform: shipment lifecycle, route coverage, tracking
              milestones, delay notifications, driver capacity, and support escalation.
            </p>
          </div>
          <div className="admin-heading-actions">
            <button
              className="secondary-button compact"
              disabled={action.busy === 'scan-delays'}
              onClick={handleScanDelays}
              type="button"
            >
              {action.busy === 'scan-delays' ? 'Scanning...' : 'Scan delays'}
            </button>
            <button className="primary-button compact" disabled={state.loading} onClick={loadAdminLanding} type="button">
              {state.loading ? 'Refreshing...' : 'Refresh data'}
            </button>
            <span>{state.updatedAt ? `Updated ${formatDateTime(state.updatedAt)}` : 'Loading live data'}</span>
          </div>
        </div>

        {action.message ? (
          <p className={`notice ${action.tone}`} role="status">{action.message}</p>
        ) : null}

        {state.errors.length > 0 ? (
          <div className="notice warning" role="status">
            <strong>Some backend services did not answer.</strong>
            <ul>
              {state.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {state.loading ? (
          <div className="admin-stat-grid" aria-label="Loading admin metrics">
            {Array.from({ length: 6 }).map((_, index) => (
              <span className="skeleton-block" key={index} />
            ))}
          </div>
        ) : (
          <div className="admin-stat-grid">
            {metrics.map((metric) => (
              <article className="admin-stat-card" key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.label === 'Route coverage' ? formatPercent(metric.value) : formatNumber(metric.value)}</strong>
                <p>{metric.detail}</p>
              </article>
            ))}
          </div>
        )}

        <div className="admin-workspace">
          <section className="admin-panel admin-workboard" aria-labelledby="workboard-title">
            <div className="admin-panel-heading">
              <div>
                <span>Shipment operations</span>
                <h2 id="workboard-title">Live workboard</h2>
              </div>
              <div className="admin-filter-row">
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
            </div>

            {filteredShipments.length === 0 ? (
              <p className="empty-state compact-state">No shipments match the current filter.</p>
            ) : (
              <div className="data-table-wrap">
                <table className="data-table admin-data-table">
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
                          <td><span className={statusClass(shipment.status)}>{formatStatus(shipment.status)}</span></td>
                          <td>{customerLabel(shipment.receiverCustomerId)}</td>
                          <td>{senderLabel(shipment.senderId)}</td>
                          <td>{route ? formatStatus(route.status) : compactId(shipment.routeId)}</td>
                          <td>{tracking?.trackingStatusLabel || 'No event yet'}</td>
                          <td>{formatDateTime(shipment.estimatedArrivalAt)}</td>
                          <td>
                            <button className="link-button" type="button" onClick={() => onNavigate(`/shipments/${shipment._id}`)}>
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

          <aside className="admin-side-rail">
            <section className="admin-panel" aria-labelledby="exception-title">
              <div className="admin-panel-heading compact-heading">
                <div>
                  <span>Exception queue</span>
                  <h2 id="exception-title">Needs attention</h2>
                </div>
              </div>
              <ul className="admin-plain-list">
                <li>
                  <span>Delayed shipments</span>
                  <strong>{formatNumber(state.delayed.length)}</strong>
                </li>
                <li>
                  <span>Data discrepancies</span>
                  <strong>{formatNumber(state.discrepancies.length)}</strong>
                </li>
                <li>
                  <span>Missing goods records</span>
                  <strong>{formatNumber(state.missingEvents.length)}</strong>
                </li>
              </ul>
              {state.discrepancies.slice(0, 3).map((item) => (
                <div className="exception-row" key={item.shipment?._id}>
                  <strong>{compactId(item.shipment?._id)}</strong>
                  <p>{asArray(item.issues).join(', ')}</p>
                </div>
              ))}
            </section>

            <section className="admin-panel" aria-labelledby="notifications-title">
              <div className="admin-panel-heading compact-heading">
                <div>
                  <span>Notifications</span>
                  <h2 id="notifications-title">Latest alerts</h2>
                </div>
              </div>
              {state.notifications.length === 0 ? (
                <p className="empty-state compact-state">No notifications have been created.</p>
              ) : (
                <ul className="admin-notification-list">
                  {state.notifications.slice(0, 5).map((notification) => {
                    const notificationId = notification.id || notification.notificationId

                    return (
                      <li key={notificationId || `${notification.shipmentId}-${notification.createdAt}`}>
                        <div>
                          <span>{formatStatus(notification.type || notification.recipientRole)}</span>
                          <strong>{notification.title || 'Notification'}</strong>
                          <small>{compactId(notification.shipmentId)} / {formatDateTime(notification.createdAt)}</small>
                        </div>
                        {!notification.readAt && notificationId ? (
                          <button
                            className="link-button"
                            disabled={action.busy === `notification-${notificationId}`}
                            onClick={() => handleMarkNotificationRead(notification)}
                            type="button"
                          >
                            Read
                          </button>
                        ) : (
                          <span className="read-label">Read</span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          </aside>
        </div>

        <div className="admin-tool-grid">
          <section className="admin-panel" aria-labelledby="tracking-action-title">
            <div className="admin-panel-heading compact-heading">
              <div>
                <span>Tracking service</span>
                <h2 id="tracking-action-title">Record milestone</h2>
              </div>
            </div>
            <form className="admin-form" onSubmit={handleRecordMilestone}>
              <label className="field">
                <span>Shipment</span>
                <select
                  onChange={(event) => setTrackingForm((current) => ({ ...current, shipmentId: event.target.value }))}
                  value={trackingForm.shipmentId}
                >
                  {state.shipments.map((shipment) => (
                    <option key={shipment._id} value={shipment._id}>
                      {shipmentLabel(shipment._id)} / {formatStatus(shipment.status)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Milestone</span>
                <select
                  onChange={(event) => setTrackingForm((current) => ({ ...current, eventType: event.target.value }))}
                  value={trackingForm.eventType}
                >
                  {TRACKING_MILESTONES.map((milestone) => (
                    <option key={milestone.value} value={milestone.value}>{milestone.label}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Notes</span>
                <textarea
                  onChange={(event) => setTrackingForm((current) => ({ ...current, notes: event.target.value }))}
                  placeholder="Operational note for this event"
                  value={trackingForm.notes}
                />
              </label>
              <button className="primary-button fit-button" disabled={action.busy === 'tracking'} type="submit">
                {action.busy === 'tracking' ? 'Recording...' : 'Record milestone'}
              </button>
            </form>
          </section>

          <section className="admin-panel" aria-labelledby="ticket-action-title">
            <div className="admin-panel-heading compact-heading">
              <div>
                <span>Support service</span>
                <h2 id="ticket-action-title">Create escalation</h2>
              </div>
            </div>
            <form className="admin-form" onSubmit={handleCreateTicket}>
              <label className="field">
                <span>Shipment</span>
                <select onChange={(event) => handleTicketShipmentChange(event.target.value)} value={ticketForm.shipmentId}>
                  {state.shipments.map((shipment) => (
                    <option key={shipment._id} value={shipment._id}>
                      {shipmentLabel(shipment._id)} / {customerLabel(shipment.receiverCustomerId)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Customer id</span>
                <input
                  onChange={(event) => setTicketForm((current) => ({ ...current, customerId: event.target.value }))}
                  value={ticketForm.customerId}
                />
              </label>
              <label className="field">
                <span>Subject</span>
                <input
                  onChange={(event) => setTicketForm((current) => ({ ...current, subject: event.target.value }))}
                  placeholder="Delay, discrepancy, or customer escalation"
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
              <button className="primary-button fit-button" disabled={action.busy === 'ticket-create'} type="submit">
                {action.busy === 'ticket-create' ? 'Creating...' : 'Create ticket'}
              </button>
            </form>
          </section>

          <section className="admin-panel" aria-labelledby="driver-title">
            <div className="admin-panel-heading compact-heading">
              <div>
                <span>Driver service</span>
                <h2 id="driver-title">Capacity</h2>
              </div>
            </div>
            <ul className="admin-driver-list">
              {state.drivers.map((driver) => (
                <li key={driver.id}>
                  <div>
                    <strong>{driver.name}</strong>
                    <span>{driver.email}</span>
                  </div>
                  <button
                    className={`driver-toggle ${driver.available ? 'is-on' : ''}`}
                    disabled={action.busy === `driver-${driver.id}`}
                    onClick={() => handleToggleDriver(driver)}
                    type="button"
                  >
                    {driver.available ? 'Available' : 'Unavailable'}
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="admin-panel" aria-labelledby="ticket-list-title">
            <div className="admin-panel-heading compact-heading">
              <div>
                <span>Ticket queue</span>
                <h2 id="ticket-list-title">Status control</h2>
              </div>
            </div>
            {state.tickets.length === 0 ? (
              <p className="empty-state compact-state">No support tickets yet.</p>
            ) : (
              <ul className="admin-ticket-list">
                {state.tickets.slice(0, 5).map((ticket) => (
                  <li key={ticket.ticketId}>
                    <div>
                      <span>{formatStatus(ticket.status)}</span>
                      <strong>{ticket.subject}</strong>
                      <small>{compactId(ticket.shipmentId)} / {formatDateTime(ticket.createdAt)}</small>
                    </div>
                    <select
                      aria-label={`Update status for ${ticket.subject}`}
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

        <div className="admin-bottom-grid">
          <section className="admin-panel" aria-labelledby="support-search-title">
            <div className="admin-panel-heading">
              <div>
                <span>Support search</span>
                <h2 id="support-search-title">Find shipment context</h2>
              </div>
            </div>
            <form className="admin-search-form" onSubmit={handleSupportSearch}>
              <label className="field">
                <span>Mode</span>
                <select
                  onChange={(event) => setSupportSearch((current) => ({ ...current, mode: event.target.value }))}
                  value={supportSearch.mode}
                >
                  <option value="reference">Reference</option>
                  <option value="destination">Destination</option>
                  <option value="id">Shipment id</option>
                </select>
              </label>
              <label className="field">
                <span>Search value</span>
                <input
                  onChange={(event) => setSupportSearch((current) => ({ ...current, query: event.target.value }))}
                  placeholder="Shipment id, destination, or reference"
                  value={supportSearch.query}
                />
              </label>
              <button className="primary-button fit-button" disabled={supportSearch.loading} type="submit">
                {supportSearch.loading ? 'Searching...' : 'Search'}
              </button>
            </form>
            {supportSearch.error ? <p className="form-error" role="alert">{supportSearch.error}</p> : null}
            {supportSearch.results.length > 0 ? (
              <ul className="admin-search-results">
                {supportSearch.results.slice(0, 5).map((shipment) => (
                  <li key={shipment._id || shipment.shipmentId}>
                    <span>{compactId(shipment._id || shipment.shipmentId)}</span>
                    <strong>{formatStatus(shipment.status)}</strong>
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

          <section className="admin-panel" aria-labelledby="routes-title">
            <div className="admin-panel-heading">
              <div>
                <span>Route service</span>
                <h2 id="routes-title">Route plans</h2>
              </div>
              <span>{formatNumber(state.routes.length)} records</span>
            </div>
            <ul className="admin-route-list">
              {state.routes.slice(0, 6).map((route) => (
                <li key={route.routeId}>
                  <div>
                    <span>{compactId(route.routeId)}</span>
                    <strong>{route.origin?.address?.city || 'Origin'} to {route.destination?.address?.city || 'Destination'}</strong>
                    <small>{shipmentLabel(route.shipmentId)} / {driverLabel(route.assignedDriverId)}</small>
                  </div>
                  <span className={statusClass(route.status)}>{formatStatus(route.status)}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="admin-panel" aria-labelledby="services-title">
            <div className="admin-panel-heading">
              <div>
                <span>Platform map</span>
                <h2 id="services-title">Backend services</h2>
              </div>
            </div>
            <div className="admin-service-table">
              {serviceRows.map((service) => (
                <article key={service.label}>
                  <div>
                    <strong>{service.label}</strong>
                    <span>{service.owner}</span>
                  </div>
                  <p>{service.purpose}</p>
                  <span className={service.health === 'Online' ? 'health-ok' : 'health-bad'}>
                    {service.health} / {formatNumber(service.count)}
                  </span>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  )
}
