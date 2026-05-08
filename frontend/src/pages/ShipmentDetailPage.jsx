import React, { useEffect, useState } from 'react'
import { listNotifications } from '../clients/notificationsClient'
import { listRoutes } from '../clients/routesClient'
import { getShipment } from '../clients/shipmentsClient'
import { getTrackingStatus } from '../clients/trackingClient'
import { asArray, compactId, formatDateTime, formatStatus } from '../utils/format'

async function settle(label, task) {
  try {
    return { label, ok: true, value: await task }
  } catch (error) {
    return { label, ok: false, error }
  }
}

function AddressBlock({ address }) {
  if (!address) return <p className="empty-state compact-state">No address recorded.</p>

  return (
    <address className="address-block">
      <span>{address.street || 'Street not set'}</span>
      <span>{[address.postalCode, address.city].filter(Boolean).join(' ') || 'City not set'}</span>
      <span>{address.country || 'Country not set'}</span>
    </address>
  )
}

export function ShipmentDetailPage({ onNavigate, onSignOut, shipmentId, token }) {
  const [state, setState] = useState({
    errors: [],
    loading: true,
    notifications: [],
    routes: [],
    shipment: null,
    tracking: null,
  })

  async function loadShipmentDetail() {
    setState((current) => ({ ...current, errors: [], loading: true }))

    const shipmentResult = await settle('Shipment', getShipment(shipmentId, { token }))
    if (!shipmentResult.ok) {
      setState({
        errors: [`Shipment: ${shipmentResult.error.message}`],
        loading: false,
        notifications: [],
        routes: [],
        shipment: null,
        tracking: null,
      })
      return
    }

    const shipment = shipmentResult.value
    const [routesResult, trackingResult, notificationsResult] = await Promise.all([
      settle('Routes', listRoutes({ token, filters: { shipmentId } })),
      settle('Tracking', getTrackingStatus(shipmentId, { token })),
      settle('Notifications', listNotifications({
        token,
        filters: { receiverCustomerId: shipment.receiverCustomerId },
      })),
    ])

    setState({
      errors: [routesResult, trackingResult, notificationsResult]
        .filter((result) => !result.ok)
        .map((result) => `${result.label}: ${result.error.message}`),
      loading: false,
      notifications: asArray(notificationsResult.value),
      routes: asArray(routesResult.value),
      shipment,
      tracking: trackingResult.ok ? trackingResult.value : null,
    })
  }

  useEffect(() => {
    loadShipmentDetail()
  }, [shipmentId, token])

  const route = state.routes[0]
  const history = asArray(state.tracking?.history)

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

      <section className="page-section" aria-labelledby="shipment-title">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Shipment detail</p>
            <h1 id="shipment-title">{compactId(shipmentId)}</h1>
            <p className="dashboard-copy">
              Joined view from Shipment, Route, Tracking, and Notification services.
            </p>
          </div>
          <button className="primary-button fit-button" type="button" onClick={loadShipmentDetail} disabled={state.loading}>
            {state.loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {state.errors.length > 0 ? (
          <div className="notice warning" role="status">
            <strong>Some detail services did not answer.</strong>
            <ul>
              {state.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {state.loading ? (
          <div className="skeleton-grid" aria-label="Loading Shipment detail">
            {Array.from({ length: 4 }).map((_, index) => (
              <span className="skeleton-block tall" key={index} />
            ))}
          </div>
        ) : null}

        {!state.loading && !state.shipment ? (
          <p className="empty-state">Shipment was not found.</p>
        ) : null}

        {!state.loading && state.shipment && (
          <div className="detail-grid">
            <section className="content-panel" aria-labelledby="summary-heading">
              <div className="section-heading">
                <h2 id="summary-heading">Summary</h2>
                <span className="status-pill">{formatStatus(state.shipment.status)}</span>
              </div>
              <dl className="definition-grid">
                <div><dt>Sender</dt><dd>{compactId(state.shipment.senderId)}</dd></div>
                <div><dt>Receiver</dt><dd>{compactId(state.shipment.receiverCustomerId)}</dd></div>
                <div><dt>Driver</dt><dd>{compactId(state.shipment.driverId)}</dd></div>
                <div><dt>Route</dt><dd>{compactId(state.shipment.routeId)}</dd></div>
                <div><dt>Created</dt><dd>{formatDateTime(state.shipment.createdAt)}</dd></div>
                <div><dt>ETA</dt><dd>{formatDateTime(state.shipment.estimatedArrivalAt)}</dd></div>
              </dl>
            </section>

            <section className="content-panel" aria-labelledby="route-heading">
              <div className="section-heading">
                <h2 id="route-heading">Route</h2>
                <span>{route ? formatStatus(route.status) : 'No route'}</span>
              </div>
              {route ? (
                <div className="route-columns">
                  <div>
                    <h3>Origin</h3>
                    <AddressBlock address={route.origin?.address} />
                  </div>
                  <div>
                    <h3>Destination</h3>
                    <AddressBlock address={route.destination?.address} />
                  </div>
                  <dl className="definition-grid slim">
                    <div><dt>Distance</dt><dd>{route.distanceKm ? `${route.distanceKm} km` : 'Not set'}</dd></div>
                    <div><dt>ETA</dt><dd>{formatDateTime(route.estimatedArrivalAt)}</dd></div>
                  </dl>
                </div>
              ) : (
                <p className="empty-state compact-state">No Route Plan is linked yet.</p>
              )}
            </section>

            <section className="content-panel wide" aria-labelledby="tracking-detail-heading">
              <div className="section-heading">
                <h2 id="tracking-detail-heading">Tracking timeline</h2>
                <span>{history.length} events</span>
              </div>
              {history.length === 0 ? (
                <p className="empty-state compact-state">No Tracking events have been recorded.</p>
              ) : (
                <ol className="timeline">
                  {history.map((event) => (
                    <li key={event.trackingEventId}>
                      <div>
                        <strong>{event.eventLabel || formatStatus(event.eventType)}</strong>
                        <span>{formatDateTime(event.occurredAt)}</span>
                      </div>
                      <p>{event.notes || formatStatus(event.shipmentLifecycleStatus || event.eventType)}</p>
                      {event.location ? (
                        <small>{event.location.label || `${event.location.lat}, ${event.location.lng}`}</small>
                      ) : null}
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section className="content-panel" aria-labelledby="goods-heading">
              <div className="section-heading">
                <h2 id="goods-heading">Goods and items</h2>
                <span>{asArray(state.shipment.goods).length} goods groups</span>
              </div>
              {asArray(state.shipment.goods).length === 0 ? (
                <p className="empty-state compact-state">No goods registered.</p>
              ) : (
                <ul className="stack-list">
                  {state.shipment.goods.map((goods) => (
                    <li key={goods.goodsId}>
                      <span>{compactId(goods.goodsId)}</span>
                      <strong>{goods.totalWeightKG} kg / {goods.totalVolumeM3} m3</strong>
                      <small>{asArray(goods.items).length} items</small>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="content-panel" aria-labelledby="notifications-heading">
              <div className="section-heading">
                <h2 id="notifications-heading">Notifications</h2>
                <span>{state.notifications.length} for receiver</span>
              </div>
              {state.notifications.length === 0 ? (
                <p className="empty-state compact-state">No notifications for this ReceiverCustomer.</p>
              ) : (
                <ul className="stack-list">
                  {state.notifications.slice(0, 5).map((notification) => (
                    <li key={notification.notificationId || notification.id}>
                      <span>{formatStatus(notification.type || notification.recipientRole)}</span>
                      <strong>{notification.title || notification.message || 'Notification'}</strong>
                      <small>{formatDateTime(notification.createdAt)}</small>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </section>
    </main>
  )
}
