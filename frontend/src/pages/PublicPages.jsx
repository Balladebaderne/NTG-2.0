import React, { useState } from 'react'
import {
  CorporateFooter,
  EmptyState,
  Notice,
  PageHero,
  PublicHeader,
  SectionHeader,
  ServiceCard,
  ShipmentCard,
  SupportCard,
  Timeline,
  TrackingSearch,
} from '../components/PortalLayout'
import { serviceCards, supportCards, publicTimeline } from '../data/ntgContent'
import { getShipment } from '../clients/shipmentsClient'
import { getTrackingStatus } from '../clients/trackingClient'
import { asArray } from '../utils/format'

function DashboardPreview() {
  return (
    <div className="preview-panel">
      <div className="preview-row">
        <div>
          <span>Shipment</span>
          <strong>NTG-4821</strong>
        </div>
        <span className="status-badge status-in-transit">In transit</span>
      </div>
      <div className="preview-row">
        <div>
          <span>Route</span>
          <strong>Copenhagen to Hamburg</strong>
        </div>
        <span>ETA 14:30</span>
      </div>
      <Timeline events={publicTimeline.slice(0, 2)} />
    </div>
  )
}

export function PublicHomePage({ onNavigate }) {
  return (
    <main className="public-page">
      <PublicHeader active="home" onNavigate={onNavigate} />
      <PageHero
        actions={(
          <>
            <button className="button-primary" onClick={() => onNavigate('/contact')} type="button">Get a quote</button>
            <button className="button-secondary" onClick={() => onNavigate('/track')} type="button">Track shipment</button>
          </>
        )}
        eyebrow="NTG logistics portal"
        title="Transport visibility for every shipment"
        visual={<DashboardPreview />}
      >
        <p>
          Track, manage, and update shipments across customer, driver, and operations workflows with a clean
          corporate interface built for transport teams.
        </p>
      </PageHero>

      <section className="section-band soft">
        <div className="container">
          <SectionHeader eyebrow="Shipment lookup" title="Follow a shipment by tracking ID" />
          <TrackingSearch isLoading={false} onSubmit={(trackingId) => trackingId && onNavigate(`/track?id=${encodeURIComponent(trackingId)}`)} />
        </div>
      </section>

      <section className="section-band white">
        <div className="container">
          <SectionHeader eyebrow="Services" title="Freight services connected to operational visibility" />
          <div className="service-grid">
            {serviceCards.slice(0, 8).map((service) => (
              <ServiceCard key={service.title} {...service} />
            ))}
          </div>
        </div>
      </section>

      <section className="section-band soft">
        <div className="container">
          <SectionHeader eyebrow="How can we help" title="Support for shipment questions and exceptions" />
          <div className="support-grid">
            {supportCards.map((card) => (
              <SupportCard key={card.title} {...card} />
            ))}
          </div>
        </div>
      </section>

      <CorporateFooter onNavigate={onNavigate} />
    </main>
  )
}

export function PublicServicesPage({ onNavigate }) {
  return (
    <main className="public-page">
      <PublicHeader active="services" onNavigate={onNavigate} />
      <section className="section-band white">
        <div className="container">
          <SectionHeader eyebrow="NTG services" title="Structured freight services" />
          <div className="service-grid">
            {serviceCards.map((service) => (
              <ServiceCard key={service.title} {...service} />
            ))}
          </div>
        </div>
      </section>
      <CorporateFooter onNavigate={onNavigate} />
    </main>
  )
}

export function PublicTrackPage({ initialQuery = '', onNavigate }) {
  const [state, setState] = useState({
    error: '',
    loading: false,
    shipment: null,
    tracking: null,
  })

  async function handleSearch(trackingId) {
    setState({ error: '', loading: true, shipment: null, tracking: null })

    if (!trackingId) {
      setState({ error: 'Tracking number is required.', loading: false, shipment: null, tracking: null })
      return
    }

    try {
      const [shipment, tracking] = await Promise.all([
        getShipment(trackingId),
        getTrackingStatus(trackingId),
      ])
      setState({ error: '', loading: false, shipment, tracking })
    } catch (error) {
      setState({ error: error.message, loading: false, shipment: null, tracking: null })
    }
  }

  React.useEffect(() => {
    if (initialQuery) handleSearch(initialQuery)
  }, [initialQuery])

  const history = asArray(state.tracking?.history)

  return (
    <main className="public-page">
      <PublicHeader active="track" onNavigate={onNavigate} />
      <section className="section-band white">
        <div className="container">
          <SectionHeader eyebrow="Tracking" title="Track shipment status and ETA" />
          <TrackingSearch isLoading={state.loading} onSubmit={handleSearch} />
          {state.error ? <Notice tone="warning">{state.error}</Notice> : null}
          {state.shipment ? (
            <div className="panel-grid">
              <ShipmentCard shipment={state.shipment} tracking={state.tracking} />
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <span>Event log</span>
                    <h2>Tracking timeline</h2>
                  </div>
                </div>
                <Timeline events={history} />
              </section>
            </div>
          ) : (
            <EmptyState message="Tracking results will appear here after a shipment lookup." compact />
          )}
        </div>
      </section>
      <CorporateFooter onNavigate={onNavigate} />
    </main>
  )
}

export function PublicContactPage({ onNavigate }) {
  return (
    <main className="public-page">
      <PublicHeader active="contact" onNavigate={onNavigate} />
      <section className="section-band white">
        <div className="container">
          <SectionHeader eyebrow="Contact NTG" title="Shipment and operations support" />
          <div className="support-grid">
            <SupportCard detail="Customer service for shipment status, ETA, and document questions." icon="document" title="Customer service" />
            <SupportCard detail="Operational exception handling for delays and route updates." icon="warning" title="Exception desk" />
            <SupportCard detail="Driver and route coordination for active transport events." icon="truck" title="Operations" />
          </div>
        </div>
      </section>
      <CorporateFooter onNavigate={onNavigate} />
    </main>
  )
}
