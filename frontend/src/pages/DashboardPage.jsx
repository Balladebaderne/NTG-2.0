import React, { useEffect, useMemo, useState } from 'react'
import { listCustomers } from '../clients/customersClient'
import { listDrivers } from '../clients/driversClient'
import { listNotifications } from '../clients/notificationsClient'
import { listRoutes } from '../clients/routesClient'
import { listSenders } from '../clients/sendersClient'
import { listShipments } from '../clients/shipmentsClient'
import { listTickets } from '../clients/supportClient'
import { getLatestTracking } from '../clients/trackingClient'
import { asArray, compactId, formatDateTime, formatStatus } from '../utils/format'

function countDelayed(shipments) {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
  return shipments.filter((shipment) => {
    const createdAt = new Date(shipment.createdAt).getTime()
    return shipment.status === 'in_transit' && Number.isFinite(createdAt) && createdAt < cutoff
  }).length
}

async function settle(label, task) {
  try {
    return { label, ok: true, value: await task }
  } catch (error) {
    return { label, ok: false, error }
  }
}

export function DashboardPage({ onNavigate, onSignOut, token }) {
  const [state, setState] = useState({
    loading: true,
    errors: [],
    shipments: [],
    routes: [],
    drivers: [],
    notifications: [],
    senders: [],
    customers: [],
    tickets: [],
    trackingSummaries: [],
  })

  async function loadDashboard() {
    setState((current) => ({ ...current, loading: true, errors: [] }))

    const results = await Promise.all([
      settle('Shipments', listShipments({ token })),
      settle('Routes', listRoutes({ token })),
      settle('Drivers', listDrivers({ token })),
      settle('Notifications', listNotifications({ token })),
      settle('Senders', listSenders({ token })),
      settle('Customers', listCustomers({ token })),
      settle('Tickets', listTickets({ token })),
    ])

    const valueFor = (label) => results.find((result) => result.label === label)
    const shipments = asArray(valueFor('Shipments')?.value)
    const trackingResults = await Promise.all(
      shipments.slice(0, 5).map((shipment) => (
        settle(`Tracking ${shipment._id}`, getLatestTracking(shipment._id, { token }))
      ))
    )

    setState({
      loading: false,
      errors: [...results, ...trackingResults]
        .filter((result) => !result.ok)
        .map((result) => `${result.label}: ${result.error.message}`),
      shipments,
      routes: asArray(valueFor('Routes')?.value),
      drivers: asArray(valueFor('Drivers')?.value),
      notifications: asArray(valueFor('Notifications')?.value),
      senders: asArray(valueFor('Senders')?.value),
      customers: asArray(valueFor('Customers')?.value),
      tickets: asArray(valueFor('Tickets')?.value),
      trackingSummaries: trackingResults
        .filter((result) => result.ok && result.value)
        .map((result) => result.value),
    })
  }

  useEffect(() => {
    loadDashboard()
  }, [token])

  const stats = useMemo(() => {
    const activeShipments = state.shipments.filter((shipment) => shipment.status !== 'received').length
    const availableDrivers = state.drivers.filter((driver) => driver.available).length
    const unreadNotifications = state.notifications.filter((notification) => !notification.readAt).length

    return [
      { label: 'Shipments', value: state.shipments.length, detail: `${activeShipments} active` },
      { label: 'Delayed', value: countDelayed(state.shipments), detail: 'in transit over 7 days' },
      { label: 'Drivers', value: state.drivers.length, detail: `${availableDrivers} available` },
      { label: 'Notifications', value: state.notifications.length, detail: `${unreadNotifications} unread` },
      { label: 'Routes', value: state.routes.length, detail: 'planned or active' },
      { label: 'Tickets', value: state.tickets.length, detail: 'support records' },
    ]
  }, [state])

  return (
    <main className="operations-shell">
      <header className="top-bar">
        <button className="brand-button" type="button" onClick={() => onNavigate('/dashboard')}>
          NTG
        </button>
        <nav aria-label="Primary navigation" className="primary-nav">
          <button type="button" onClick={() => onNavigate('/dashboard')}>Dashboard</button>
          <button type="button" onClick={() => onNavigate('/support')}>Support</button>
          <button type="button" onClick={() => onNavigate('/chat')}>Chat</button>
        </nav>
        <button className="secondary-button compact" type="button" onClick={onSignOut}>
          Sign out
        </button>
      </header>

      <section className="page-section" aria-labelledby="dashboard-title">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Operations overview</p>
            <h1 id="dashboard-title">Shipment command center</h1>
            <p className="dashboard-copy">
              Live demo surface for Shipments, Routes, Tracking, Drivers, Customers, Senders, Notifications, and Support.
            </p>
          </div>
          <button className="primary-button fit-button" type="button" onClick={loadDashboard} disabled={state.loading}>
            {state.loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {state.errors.length > 0 ? (
          <div className="notice warning" role="status">
            <strong>Some services did not answer.</strong>
            <ul>
              {state.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {state.loading ? (
          <div className="skeleton-grid" aria-label="Loading dashboard data">
            {Array.from({ length: 6 }).map((_, index) => (
              <span className="skeleton-block" key={index} />
            ))}
          </div>
        ) : (
          <>
            <div className="metric-grid">
              {stats.map((stat) => (
                <article className="metric-card" key={stat.label}>
                  <span>{stat.label}</span>
                  <strong>{stat.value}</strong>
                  <p>{stat.detail}</p>
                </article>
              ))}
            </div>

            <div className="dashboard-grid">
              <section className="content-panel wide" aria-labelledby="shipments-heading">
                <div className="section-heading">
                  <h2 id="shipments-heading">Shipments</h2>
                  <span>{state.shipments.length} records</span>
                </div>

                {state.shipments.length === 0 ? (
                  <p className="empty-state">No Shipments are available yet.</p>
                ) : (
                  <div className="data-table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th scope="col">Shipment</th>
                          <th scope="col">Status</th>
                          <th scope="col">Sender</th>
                          <th scope="col">Receiver</th>
                          <th scope="col">Driver</th>
                          <th scope="col">ETA</th>
                        </tr>
                      </thead>
                      <tbody>
                        {state.shipments.slice(0, 8).map((shipment) => (
                          <tr key={shipment._id}>
                            <td>
                              <button
                                className="link-button"
                                type="button"
                                onClick={() => onNavigate(`/shipments/${shipment._id}`)}
                              >
                                {compactId(shipment._id)}
                              </button>
                            </td>
                            <td><span className="status-pill">{formatStatus(shipment.status)}</span></td>
                            <td>{compactId(shipment.senderId)}</td>
                            <td>{compactId(shipment.receiverCustomerId)}</td>
                            <td>{compactId(shipment.driverId)}</td>
                            <td>{formatDateTime(shipment.estimatedArrivalAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section className="content-panel" aria-labelledby="tracking-heading">
                <div className="section-heading">
                  <h2 id="tracking-heading">Tracking</h2>
                  <span>latest events</span>
                </div>
                {state.trackingSummaries.length === 0 ? (
                  <p className="empty-state">No Tracking events have been recorded for the visible Shipments.</p>
                ) : (
                  <ul className="stack-list">
                    {state.trackingSummaries.map((summary) => (
                      <li key={summary.shipmentId}>
                        <span>{compactId(summary.shipmentId)}</span>
                        <strong>{summary.trackingStatusLabel || 'No milestone yet'}</strong>
                        <small>{formatDateTime(summary.lastUpdatedAt)}</small>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="content-panel" aria-labelledby="masterdata-heading">
                <div className="section-heading">
                  <h2 id="masterdata-heading">Master data</h2>
                  <span>linked services</span>
                </div>
                <dl className="definition-grid">
                  <div><dt>Senders</dt><dd>{state.senders.length}</dd></div>
                  <div><dt>Customers</dt><dd>{state.customers.length}</dd></div>
                  <div><dt>Routes</dt><dd>{state.routes.length}</dd></div>
                  <div><dt>Support tickets</dt><dd>{state.tickets.length}</dd></div>
                </dl>
              </section>
            </div>
          </>
        )}
      </section>
    </main>
  )
}
