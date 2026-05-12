import React, { useEffect, useState } from 'react'
import { listNotifications } from '../clients/notificationsClient'
import { listRoutes } from '../clients/routesClient'
import { deleteShipment, getShipment } from '../clients/shipmentsClient'
import { getTrackingStatus } from '../clients/trackingClient'
import { RouteMap } from '../components/RouteMap'
import {
  AppShell,
  EmptyState,
  LoadingGrid,
  Notice,
  SectionHeader,
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

function AddressBlock({ address }) {
  if (!address) return <EmptyState compact message="No address recorded." title="Address missing" />

  return (
    <ul className="split-list">
      <li>
        <address>
          <strong>{address.street || 'Street not set'}</strong>
          <small>{[address.postalCode, address.city, address.country].filter(Boolean).join(', ') || 'City not set'}</small>
        </address>
      </li>
    </ul>
  )
}

const DELETE_ROLES = new Set(['admin', 'support'])

export function ShipmentDetailPage({
  active = 'customer-shipments',
  onNavigate,
  onSignOut,
  profile,
  shipmentId,
  token,
}) {
  const [state, setState] = useState({
    errors: [],
    loading: true,
    notifications: [],
    routes: [],
    shipment: null,
    tracking: null,
  })
  const [deleteState, setDeleteState] = useState({ busy: false, confirming: false, error: null })

  const canDelete = DELETE_ROLES.has(String(profile?.role || '').toLowerCase())

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
      settle('Routes', listRoutes({ filters: { shipmentId }, token })),
      settle('Tracking', getTrackingStatus(shipmentId, { token })),
      settle('Notifications', listNotifications({
        filters: { receiverCustomerId: shipment.receiverCustomerId },
        token,
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

  async function handleDelete() {
    if (!deleteState.confirming) {
      setDeleteState({ busy: false, confirming: true, error: null })
      return
    }
    setDeleteState({ busy: true, confirming: true, error: null })
    try {
      await deleteShipment(shipmentId, { token })
      onNavigate('/operator/shipments')
    } catch (error) {
      setDeleteState({ busy: false, confirming: false, error: error.message })
    }
  }

  const route = state.routes[0]
  const history = asArray(state.tracking?.history)

  return (
    <AppShell active={active} onNavigate={onNavigate} onSignOut={onSignOut} profile={profile} token={token}>
      <section className="workspace-hero">
        <div>
          <p className="eyebrow">Shipment detail</p>
          <h1>{compactId(shipmentId)}</h1>
          <p>Full shipment view with lifecycle status, route information, goods, notifications, and event history.</p>
        </div>
        <div className="workspace-hero-actions">
          {canDelete && deleteState.confirming ? (
            <>
              <button className="button-secondary" disabled={deleteState.busy} onClick={() => setDeleteState({ busy: false, confirming: false, error: null })} type="button">
                Cancel
              </button>
              <button className="button-danger" disabled={deleteState.busy} onClick={handleDelete} type="button">
                {deleteState.busy ? 'Deleting' : 'Confirm delete'}
              </button>
            </>
          ) : null}
          {canDelete && !deleteState.confirming ? (
            <button className="button-danger" disabled={state.loading || !state.shipment} onClick={handleDelete} type="button">
              Delete shipment
            </button>
          ) : null}
          <button className="button-primary" disabled={state.loading} onClick={loadShipmentDetail} type="button">
            {state.loading ? 'Refreshing' : 'Refresh'}
          </button>
        </div>
      </section>

      {deleteState.error ? <Notice tone="warning">{deleteState.error}</Notice> : null}
      {deleteState.confirming && !deleteState.busy ? (
        <Notice tone="warning">Er du sikker? Denne handling kan ikke fortrydes.</Notice>
      ) : null}
      {state.errors.length > 0 ? (
        <Notice tone="warning">
          <strong>Some shipment services did not answer.</strong>
          <ul>{state.errors.map((error) => <li key={error}>{error}</li>)}</ul>
        </Notice>
      ) : null}

      {state.loading ? <LoadingGrid count={4} /> : null}
      {!state.loading && !state.shipment ? <EmptyState message="Shipment was not found." /> : null}

      {!state.loading && state.shipment ? (
        <>
          <section className="panel">
            <div className="panel-heading">
              <div>
                <span>Overview</span>
                <h2>Shipment summary</h2>
              </div>
              <StatusBadge status={state.shipment.status} />
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

          <section className="panel">
            <div className="panel-heading">
              <div>
                <span>Route</span>
                <h2>Transport plan</h2>
              </div>
              <span>{route ? formatStatus(route.status) : 'No route'}</span>
            </div>
            {route ? (
              <>
                <div className="panel-grid equal">
                  <div>
                    <h3>Origin</h3>
                    <AddressBlock address={route.origin?.address} />
                  </div>
                  <div>
                    <h3>Destination</h3>
                    <AddressBlock address={route.destination?.address} />
                  </div>
                </div>
                <RouteMap route={route} />
                <ul className="split-list" style={{ marginTop: '1rem' }}>
                  {asArray(route.stops).map((stop) => (
                    <li key={stop.stopId}>
                      <div>
                        <strong>{formatStatus(stop.type)}</strong>
                        <small>{[stop.address?.city, stop.address?.country].filter(Boolean).join(', ')}</small>
                      </div>
                      {stop.actualArrivalAt
                        ? <span style={{ color: '#16a34a' }}>✓ {formatDateTime(stop.actualArrivalAt)}</span>
                        : <span style={{ color: '#9ca3af' }}>Planned {formatDateTime(stop.plannedArrivalAt) || '—'}</span>}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <EmptyState compact message="No route plan is linked yet." title="No route" />
            )}
          </section>

          <section className="panel">
            <SectionHeader eyebrow={`${history.length} events`} title="Tracking timeline" />
            <Timeline events={history} />
          </section>

          <div className="panel-grid equal">
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <span>Goods</span>
                  <h2>Goods and items</h2>
                </div>
                <span>{asArray(state.shipment.goods).length} groups</span>
              </div>
              {asArray(state.shipment.goods).length === 0 ? (
                <EmptyState compact message="No goods have been registered for this shipment." />
              ) : (
                <ul className="split-list">
                  {state.shipment.goods.map((goods) => (
                    <li key={goods.goodsId}>
                      <div>
                        <strong>{compactId(goods.goodsId)}</strong>
                        <small>{goods.totalWeightKG} kg / {goods.totalVolumeM3} m3 / {asArray(goods.items).length} items</small>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <span>Notifications</span>
                  <h2>Receiver alerts</h2>
                </div>
                <span>{state.notifications.length} records</span>
              </div>
              {state.notifications.length === 0 ? (
                <EmptyState compact message="No receiver notifications are linked." />
              ) : (
                <ul className="split-list">
                  {state.notifications.slice(0, 6).map((notification) => (
                    <li key={notification.notificationId || notification.id}>
                      <div>
                        <strong>{notification.title || notification.message || 'Notification'}</strong>
                        <small>{formatStatus(notification.type || notification.recipientRole)} / {formatDateTime(notification.createdAt)}</small>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      ) : null}
    </AppShell>
  )
}
