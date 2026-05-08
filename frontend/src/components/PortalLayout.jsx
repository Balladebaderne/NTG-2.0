import React, { useState } from 'react'
import { asArray, compactId, formatDateTime, formatStatus } from '../utils/format'

const iconPaths = {
  box: (
    <>
      <path d="M4 7.5 12 3l8 4.5-8 4.5L4 7.5Z" />
      <path d="M4 7.5v9L12 21l8-4.5v-9" />
      <path d="M12 12v9" />
    </>
  ),
  chat: (
    <>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </>
  ),
  check: (
    <>
      <path d="M20 6 9 17l-5-5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </>
  ),
  document: (
    <>
      <path d="M7 3h7l4 4v14H7V3Z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6" />
      <path d="M9 17h6" />
    </>
  ),
  map: (
    <>
      <path d="M9 18 3 21V6l6-3 6 3 6-3v15l-6 3-6-3Z" />
      <path d="M9 3v15" />
      <path d="M15 6v15" />
    </>
  ),
  plane: (
    <>
      <path d="M21 4 3 11l7 3 3 7 8-17Z" />
      <path d="m10 14 4-4" />
    </>
  ),
  route: (
    <>
      <circle cx="6" cy="6" r="2" />
      <circle cx="18" cy="18" r="2" />
      <path d="M8 6h4a3 3 0 0 1 0 6h-1a3 3 0 0 0 0 6h5" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </>
  ),
  ship: (
    <>
      <path d="M4 15h16l-2 4H6l-2-4Z" />
      <path d="M7 15V9h10v6" />
      <path d="M10 9V5h4v4" />
    </>
  ),
  star: (
    <>
      <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </>
  ),
  truck: (
    <>
      <path d="M3 6h11v10H3V6Z" />
      <path d="M14 10h4l3 3v3h-7v-6Z" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  warning: (
    <>
      <path d="M12 3 2.5 20h19L12 3Z" />
      <path d="M12 9v5" />
      <path d="M12 17h.01" />
    </>
  ),
  warehouse: (
    <>
      <path d="M3 10 12 4l9 6v10H3V10Z" />
      <path d="M7 20v-7h10v7" />
      <path d="M9 16h6" />
    </>
  ),
}

const roleNav = {
  customer: [
    { id: 'customer-dashboard', label: 'Dashboard', path: '/customer/dashboard' },
    { id: 'customer-shipments', label: 'Shipments', path: '/customer/shipments' },
    { id: 'customer-support', label: 'Contact NTG', path: '/customer/support' },
    { id: 'customer-chat', label: 'AI Assistant', path: '/chat' },
  ],
  driver: [
    { id: 'driver-dashboard', label: 'My shipments', path: '/driver/dashboard' },
    { id: 'driver-assigned', label: 'Assigned route', path: '/driver/assigned-shipments' },
    { id: 'driver-events', label: 'Route events', path: '/driver/events' },
    { id: 'driver-loyalty', label: 'My rewards', path: '/driver/loyalty' },
  ],
  operator: [
    { id: 'operator-dashboard', label: 'Dashboard', path: '/operator/dashboard' },
    { id: 'operator-shipments', label: 'Shipments', path: '/operator/shipments' },
    { id: 'operator-create', label: 'New shipment', path: '/operator/shipments/create' },
    { id: 'operator-drivers', label: 'Drivers', path: '/operator/drivers' },
    { id: 'operator-customers', label: 'Customers', path: '/operator/customers' },
    { id: 'operator-events', label: 'Events', path: '/operator/events' },
    { id: 'operator-console', label: 'Console', path: '/admin/console' },
    { id: 'operator-chat', label: 'AI Chat', path: '/chat' },
  ],
}

export function normalizeRole(role) {
  if (role === 'driver') return 'driver'
  if (role === 'admin' || role === 'logistics' || role === 'support') return 'operator'
  return 'customer'
}

export function roleHomePath(profile) {
  const role = normalizeRole(profile?.role)
  if (role === 'driver') return '/driver/dashboard'
  if (role === 'operator') return '/operator/dashboard'
  return '/customer/dashboard'
}

export function Icon({ name = 'box' }) {
  return (
    <svg aria-hidden="true" className="icon" fill="none" viewBox="0 0 24 24">
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">
        {iconPaths[name] || iconPaths.box}
      </g>
    </svg>
  )
}

export function BrandMark({ onClick, inverted = false }) {
  const logo = inverted
    ? 'https://country.ntg.com/wp-content/uploads/ntg-logo-negativ.png'
    : 'https://country.ntg.com/wp-content/uploads/ntg-logo.png'

  const content = (
    <img
      alt="NTG Nordic Transport Group"
      className="brand-logo"
      src={logo}
    />
  )

  if (!onClick) return <div className="brand-lockup">{content}</div>

  return (
    <button className="brand-lockup brand-lockup-button" onClick={onClick} type="button">
      {content}
    </button>
  )
}

export function PublicHeader({ active = 'home', onNavigate }) {
  const items = [
    { id: 'home', label: 'Home', path: '/' },
    { id: 'services', label: 'Services', path: '/services' },
    { id: 'track', label: 'Tracking', path: '/track' },
    { id: 'contact', label: 'Contact', path: '/contact' },
  ]

  return (
    <header className="site-header">
      <BrandMark onClick={() => onNavigate('/')} />
      <nav aria-label="Public navigation" className="site-nav">
        {items.map((item) => (
          <button
            aria-current={active === item.id ? 'page' : undefined}
            className={active === item.id ? 'is-active' : undefined}
            key={item.id}
            onClick={() => onNavigate(item.path)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </nav>
      <button className="button-primary compact" onClick={() => onNavigate('/login')} type="button">
        Sign in
      </button>
    </header>
  )
}

export function SignedInHeader({ active, onNavigate, onSignOut, profile }) {
  const role = normalizeRole(profile?.role)
  const items = roleNav[role]

  return (
    <header className="site-header signed-in-header">
      <BrandMark inverted onClick={() => onNavigate(roleHomePath(profile))} />
      <nav aria-label="Role navigation" className="site-nav">
        {items.map((item) => (
          <button
            aria-current={active === item.id ? 'page' : undefined}
            className={active === item.id ? 'is-active' : undefined}
            key={item.id}
            onClick={() => onNavigate(item.path)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </nav>
      <div className="profile-actions">
        <div className="profile-chip">
          <span>{profile?.roleLabel || formatStatus(role)}</span>
          <strong>{profile?.name || 'NTG user'}</strong>
        </div>
        <button className="button-secondary compact" onClick={onSignOut} type="button">
          Sign out
        </button>
      </div>
    </header>
  )
}

export function RoleNavigation({ active, onNavigate, profile }) {
  const role = normalizeRole(profile?.role)
  return (
    <aside className="role-sidebar" aria-label={`${formatStatus(role)} navigation`}>
      <div>
        <span>Workspace</span>
        <strong>{formatStatus(role)}</strong>
      </div>
      <nav>
        {roleNav[role].map((item) => (
          <button
            aria-current={active === item.id ? 'page' : undefined}
            className={active === item.id ? 'is-active' : undefined}
            key={item.id}
            onClick={() => onNavigate(item.path)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  )
}

export function AppShell({ active, children, onNavigate, onSignOut, profile }) {
  return (
    <main className="portal-shell">
      <SignedInHeader active={active} onNavigate={onNavigate} onSignOut={onSignOut} profile={profile} />
      <div className="workspace-main-only">
        <section className="workspace-main">{children}</section>
      </div>
    </main>
  )
}

export function CorporateFooter({ onNavigate }) {
  const linkGroups = [
    { label: 'Services', links: ['Road freight', 'Ocean freight', 'Air freight', 'Express', 'Warehouse logistics'] },
    { label: 'Company', links: ['About NTG', 'Organisation', 'Careers', 'Press'] },
    { label: 'Contact', links: ['Contact us', 'NTG offices', 'Support', 'Customer service'] },
  ]

  return (
    <footer className="corporate-footer">
      <div className="container footer-grid">
        <div>
          <BrandMark inverted />
          <p>
            Corporate transport visibility for customers, drivers, and operations teams across the NTG network.
          </p>
          <address>
            Hammerholmen 47<br />
            DK-2650 Hvidovre<br />
            Denmark
          </address>
        </div>
        {linkGroups.map((group) => (
          <div key={group.label}>
            <h2>{group.label}</h2>
            <ul>
              {group.links.map((link) => (
                <li key={link}>
                  <button onClick={() => onNavigate('/contact')} type="button">{link}</button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </footer>
  )
}

export function PageHero({ actions, children, eyebrow, title, visual }) {
  return (
    <section className="page-hero">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {children ? <div className="hero-copy">{children}</div> : null}
        {actions ? <div className="hero-actions">{actions}</div> : null}
      </div>
      {visual ? <div className="hero-visual">{visual}</div> : null}
    </section>
  )
}

export function SectionHeader({ action, eyebrow, title }) {
  return (
    <div className="section-header">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  )
}

export function StatusBadge({ status }) {
  const value = String(status || 'not_set').replaceAll('_', '-').toLowerCase()
  return <span className={`status-badge status-${value}`}>{formatStatus(status)}</span>
}

export function StatCard({ detail, icon = 'box', label, tone = 'default', value }) {
  return (
    <article className={`stat-card tone-${tone}`}>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <p>{detail}</p>
      </div>
      <Icon name={icon} />
    </article>
  )
}

export function ServiceCard({ description, image, title }) {
  return (
    <article className="service-card">
      <img alt={`${title} logistics service`} loading="lazy" src={image} />
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
        <span>Read more</span>
      </div>
    </article>
  )
}

export function SupportCard({ detail, icon = 'document', title }) {
  return (
    <article className="support-card">
      <Icon name={icon} />
      <h3>{title}</h3>
      <p>{detail}</p>
    </article>
  )
}

export function ShipmentCard({ onOpen, shipment, tracking }) {
  return (
    <article className="shipment-card">
      <div className="shipment-card-top">
        <span>Tracking ID: {compactId(shipment._id || shipment.shipmentId)}</span>
        <StatusBadge status={shipment.status || tracking?.status} />
      </div>
      <h3>{compactId(shipment.senderId)} to {compactId(shipment.receiverCustomerId)}</h3>
      <dl>
        <div><dt>ETA</dt><dd>{formatDateTime(shipment.estimatedArrivalAt)}</dd></div>
        <div><dt>Driver</dt><dd>{compactId(shipment.driverId)}</dd></div>
        <div><dt>Latest event</dt><dd>{tracking?.trackingStatusLabel || 'No event yet'}</dd></div>
      </dl>
      {onOpen ? (
        <button className="button-secondary compact" onClick={() => onOpen(shipment)} type="button">
          View shipment
        </button>
      ) : null}
    </article>
  )
}

export function ShipmentTable({ driversById, onOpen, shipments }) {
  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">Shipment</th>
            <th scope="col">Status</th>
            <th scope="col">Customer</th>
            <th scope="col">Sender</th>
            <th scope="col">Driver</th>
            <th scope="col">ETA</th>
            <th scope="col">Action</th>
          </tr>
        </thead>
        <tbody>
          {shipments.map((shipment) => (
            <tr key={shipment._id || shipment.shipmentId}>
              <td>{compactId(shipment._id || shipment.shipmentId)}</td>
              <td><StatusBadge status={shipment.status} /></td>
              <td>{compactId(shipment.receiverCustomerId)}</td>
              <td>{compactId(shipment.senderId)}</td>
              <td>{driversById?.get?.(String(shipment.driverId))?.name || compactId(shipment.driverId)}</td>
              <td>{formatDateTime(shipment.estimatedArrivalAt)}</td>
              <td>
                <button className="link-button" onClick={() => onOpen(shipment)} type="button">
                  Open
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Timeline({ events = [] }) {
  const rows = asArray(events)

  if (rows.length === 0) {
    return <EmptyState message="No tracking events have been recorded yet." compact />
  }

  return (
    <ol className="timeline">
      {rows.map((event, index) => (
        <li className={String(event.eventType || '').includes('delay') || String(event.eventType || '').includes('exception') ? 'is-warning' : ''} key={event.trackingEventId || event.eventId || index}>
          <div className="timeline-marker" aria-hidden="true" />
          <div>
            <strong>{event.eventLabel || formatStatus(event.eventType)}</strong>
            <span>{formatDateTime(event.occurredAt || event.createdAt)}</span>
            <p>{event.location?.label || event.locationName || 'Location not registered'}</p>
            {event.notes ? <small>{event.notes}</small> : null}
          </div>
        </li>
      ))}
    </ol>
  )
}

export function TrackingSearch({ isLoading, onSubmit }) {
  const [trackingId, setTrackingId] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    onSubmit(trackingId.trim())
  }

  return (
    <form className="tracking-search" onSubmit={handleSubmit}>
      <label>
        <span>Tracking number</span>
        <input
          onChange={(event) => setTrackingId(event.target.value)}
          placeholder="NTG shipment ID"
          value={trackingId}
        />
      </label>
      <button className="button-primary" disabled={isLoading} type="submit">
        {isLoading ? 'Searching' : 'Track shipment'}
      </button>
    </form>
  )
}

export function Notice({ children, tone = 'subtle' }) {
  return <div className={`notice ${tone}`} role="status">{children}</div>
}

export function EmptyState({ compact = false, message, title = 'No records' }) {
  return (
    <div className={`empty-state ${compact ? 'compact' : ''}`}>
      <strong>{title}</strong>
      <p>{message}</p>
    </div>
  )
}

export function LoadingGrid({ count = 4 }) {
  return (
    <div className="loading-grid" aria-label="Loading">
      {Array.from({ length: count }).map((_, index) => (
        <span className="skeleton-block" key={index} />
      ))}
    </div>
  )
}

export function ProgressBar({ label, max = 100, tone = 'default', value = 0 }) {
  const pct = Math.min(100, Math.round((value / Math.max(max, 1)) * 100))
  return (
    <div className="progress-wrap">
      {label ? <span className="progress-label">{label}</span> : null}
      <div className="progress-bar-track">
        <div className={`progress-bar-fill tone-${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function LoyaltyCard({ driverName, points = 0, tier = 'Bronze' }) {
  const tierClass = `tier-${tier.toLowerCase()}`
  return (
    <div className="loyalty-card">
      <div className="loyalty-card-body">
        <span className="loyalty-card-eyebrow">Driver rewards</span>
        <p className="loyalty-card-points">{Number(points).toLocaleString()}</p>
        <p className="loyalty-card-sub">Total accumulated points{driverName ? ` · ${driverName}` : ''}</p>
      </div>
      <div>
        <span className={`loyalty-tier-badge ${tierClass}`}>{tier} tier</span>
      </div>
    </div>
  )
}
