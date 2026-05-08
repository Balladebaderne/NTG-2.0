import React, { useEffect, useState } from 'react'
import {
  createTicket,
  getDelayedShipments,
  getDiscrepancies,
  listTickets,
  searchShipments,
  searchTracking,
} from '../clients/supportClient'
import { asArray, compactId, formatDateTime, formatStatus } from '../utils/format'

async function settle(label, task) {
  try {
    return { label, ok: true, value: await task }
  } catch (error) {
    return { label, ok: false, error }
  }
}

export function SupportPage({ onNavigate, onSignOut, token }) {
  const [state, setState] = useState({
    delayed: [],
    discrepancies: [],
    errors: [],
    loading: true,
    tickets: [],
  })
  const [query, setQuery] = useState('')
  const [searchMode, setSearchMode] = useState('tracking')
  const [searchResult, setSearchResult] = useState(null)
  const [searchError, setSearchError] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [ticketForm, setTicketForm] = useState({
    agentId: 'support-demo',
    customerId: '',
    description: '',
    shipmentId: '',
    subject: '',
  })
  const [ticketMessage, setTicketMessage] = useState('')

  async function loadSupport() {
    setState((current) => ({ ...current, errors: [], loading: true }))
    const [ticketsResult, delayedResult, discrepancyResult] = await Promise.all([
      settle('Tickets', listTickets({ token })),
      settle('Delayed Shipments', getDelayedShipments({ token })),
      settle('Discrepancies', getDiscrepancies({ token })),
    ])

    setState({
      delayed: asArray(delayedResult.value?.shipments),
      discrepancies: asArray(discrepancyResult.value?.discrepancies),
      errors: [ticketsResult, delayedResult, discrepancyResult]
        .filter((result) => !result.ok)
        .map((result) => `${result.label}: ${result.error.message}`),
      loading: false,
      tickets: asArray(ticketsResult.value),
    })
  }

  useEffect(() => {
    loadSupport()
  }, [token])

  async function handleSearch(event) {
    event.preventDefault()
    setSearchError('')
    setSearchResult(null)

    if (!query.trim()) {
      setSearchError('Enter a Shipment id, destination, or reference.')
      return
    }

    setIsSearching(true)
    try {
      const result = searchMode === 'tracking'
        ? await searchTracking(query.trim(), { token })
        : await searchShipments({ destination: query.trim(), reference: query.trim(), token })
      setSearchResult(result)
    } catch (error) {
      setSearchError(error.message)
    } finally {
      setIsSearching(false)
    }
  }

  async function handleCreateTicket(event) {
    event.preventDefault()
    setTicketMessage('')

    if (!ticketForm.shipmentId || !ticketForm.customerId || !ticketForm.agentId || !ticketForm.subject || !ticketForm.description) {
      setTicketMessage('Fill every ticket field before creating it.')
      return
    }

    try {
      await createTicket(ticketForm, { token })
      setTicketMessage('Ticket created.')
      setTicketForm((current) => ({
        ...current,
        description: '',
        subject: '',
      }))
      await loadSupport()
    } catch (error) {
      setTicketMessage(error.message)
    }
  }

  const searchResults = Array.isArray(searchResult) ? searchResult : searchResult ? [searchResult] : []

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

      <section className="page-section" aria-labelledby="support-title">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Customer support</p>
            <h1 id="support-title">Search and ticket workspace</h1>
            <p className="dashboard-copy">
              Support owns fuzzy search, exception checks, and customer-facing tickets.
            </p>
          </div>
          <button className="primary-button fit-button" type="button" onClick={loadSupport} disabled={state.loading}>
            {state.loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {state.errors.length > 0 ? (
          <div className="notice warning" role="status">
            <strong>Some support checks did not answer.</strong>
            <ul>
              {state.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="dashboard-grid">
          <section className="content-panel wide" aria-labelledby="support-search-heading">
            <div className="section-heading">
              <h2 id="support-search-heading">Shipment search</h2>
              <span>{searchMode === 'tracking' ? 'exact lookup' : 'fuzzy support search'}</span>
            </div>
            <form className="inline-form" onSubmit={handleSearch}>
              <label className="field">
                <span>Search value</span>
                <input
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Shipment id, destination, or reference"
                  value={query}
                />
              </label>
              <label className="field">
                <span>Mode</span>
                <select onChange={(event) => setSearchMode(event.target.value)} value={searchMode}>
                  <option value="tracking">Shipment id</option>
                  <option value="fuzzy">Destination or reference</option>
                </select>
              </label>
              <button className="primary-button fit-button" type="submit" disabled={isSearching}>
                {isSearching ? 'Searching...' : 'Search'}
              </button>
            </form>

            {searchError ? <p className="form-error" role="alert">{searchError}</p> : null}
            {searchResults.length === 0 && !searchError ? (
              <p className="empty-state compact-state">Search results will appear here.</p>
            ) : null}
            {searchResults.length > 0 ? (
              <ul className="stack-list roomy">
                {searchResults.map((shipment) => (
                  <li key={shipment._id || shipment.shipmentId}>
                    <span>{compactId(shipment._id || shipment.shipmentId)}</span>
                    <strong>{formatStatus(shipment.status)}</strong>
                    <small>{formatDateTime(shipment.estimatedArrivalAt || shipment.createdAt)}</small>
                    <button
                      className="link-button"
                      type="button"
                      onClick={() => onNavigate(`/shipments/${shipment._id || shipment.shipmentId}`)}
                    >
                      Open
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <section className="content-panel" aria-labelledby="create-ticket-heading">
            <div className="section-heading">
              <h2 id="create-ticket-heading">Create ticket</h2>
              <span>support owned</span>
            </div>
            <form className="stacked-form" onSubmit={handleCreateTicket}>
              <label className="field">
                <span>Shipment id</span>
                <input value={ticketForm.shipmentId} onChange={(event) => setTicketForm({ ...ticketForm, shipmentId: event.target.value })} />
              </label>
              <label className="field">
                <span>Customer id</span>
                <input value={ticketForm.customerId} onChange={(event) => setTicketForm({ ...ticketForm, customerId: event.target.value })} />
              </label>
              <label className="field">
                <span>Agent id</span>
                <input value={ticketForm.agentId} onChange={(event) => setTicketForm({ ...ticketForm, agentId: event.target.value })} />
              </label>
              <label className="field">
                <span>Subject</span>
                <input value={ticketForm.subject} onChange={(event) => setTicketForm({ ...ticketForm, subject: event.target.value })} />
              </label>
              <label className="field">
                <span>Description</span>
                <textarea value={ticketForm.description} onChange={(event) => setTicketForm({ ...ticketForm, description: event.target.value })} />
              </label>
              {ticketMessage ? <p className="notice subtle" role="status">{ticketMessage}</p> : null}
              <button className="primary-button fit-button" type="submit">Create ticket</button>
            </form>
          </section>

          <section className="content-panel" aria-labelledby="ticket-list-heading">
            <div className="section-heading">
              <h2 id="ticket-list-heading">Tickets</h2>
              <span>{state.tickets.length} records</span>
            </div>
            {state.tickets.length === 0 ? (
              <p className="empty-state compact-state">No support tickets yet.</p>
            ) : (
              <ul className="stack-list">
                {state.tickets.slice(0, 8).map((ticket) => (
                  <li key={ticket.ticketId}>
                    <span>{formatStatus(ticket.status)}</span>
                    <strong>{ticket.subject}</strong>
                    <small>{compactId(ticket.shipmentId)} / {formatDateTime(ticket.createdAt)}</small>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="content-panel" aria-labelledby="exceptions-heading">
            <div className="section-heading">
              <h2 id="exceptions-heading">Exception checks</h2>
              <span>demo heuristics</span>
            </div>
            <dl className="definition-grid">
              <div><dt>Delayed</dt><dd>{state.delayed.length}</dd></div>
              <div><dt>Discrepancies</dt><dd>{state.discrepancies.length}</dd></div>
            </dl>
          </section>
        </div>
      </section>
    </main>
  )
}
