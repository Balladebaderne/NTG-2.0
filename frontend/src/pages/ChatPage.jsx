import React, { useEffect, useState } from 'react'
import { getConversation, listConversations, sendChatMessage } from '../clients/chatClient'
import {
  AppShell,
  EmptyState,
  Notice,
  normalizeRole,
} from '../components/PortalLayout'
import { asArray, compactId, formatDateTime } from '../utils/format'

function activeFor(profile) {
  const role = normalizeRole(profile?.role)
  if (role === 'customer') return 'customer-chat'
  return 'operator-chat'
}

export function ChatPage({ onNavigate, onSignOut, profile, token }) {
  const [conversations, setConversations] = useState([])
  const [conversation, setConversation] = useState(null)
  const [customerId, setCustomerId] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [message, setMessage] = useState('')

  async function loadConversations() {
    setError('')
    setIsLoading(true)
    try {
      const data = await listConversations({ token, customerId })
      setConversations(asArray(data))
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadConversations()
  }, [token])

  async function openConversation(conversationId) {
    setError('')
    try {
      setConversation(await getConversation(conversationId, { token }))
    } catch (loadError) {
      setError(loadError.message)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!message.trim()) {
      setError('Enter a message before sending.')
      return
    }

    setIsSending(true)
    try {
      const reply = await sendChatMessage({
        conversationId: conversation?.conversationId,
        customerId: customerId || conversation?.customerId,
        message,
        token,
      })
      setMessage('')
      setConversation((current) => ({
        conversationId: reply.conversationId,
        customerId: current?.customerId || customerId,
        messages: [
          ...asArray(current?.messages),
          { role: 'user', content: message },
          { role: 'assistant', content: reply.response },
        ],
      }))
      await loadConversations()
    } catch (sendError) {
      setError(sendError.message)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <AppShell active={activeFor(profile)} onNavigate={onNavigate} onSignOut={onSignOut} profile={profile}>
      <section className="workspace-hero">
        <div>
          <p className="eyebrow">AI assistant</p>
          <h1>Shipment chat</h1>
          <p>
            Ask shipment-related questions using natural language. The assistant has access to live shipment and tracking data.
          </p>
        </div>
        <div className="workspace-hero-actions">
          <button className="button-secondary" disabled={isLoading} onClick={loadConversations} type="button">
            {isLoading ? 'Refreshing' : 'Refresh'}
          </button>
        </div>
      </section>

      {error ? <Notice tone="warning">{error}</Notice> : null}

      <div className="chat-layout">
        <aside className="panel" aria-labelledby="conversation-list-heading">
          <div className="panel-heading">
            <div>
              <span>{conversations.length} saved</span>
              <h2 id="conversation-list-heading">Conversations</h2>
            </div>
          </div>

          <div className="stacked-form">
            <label className="field">
              <span>Customer filter</span>
              <input
                onChange={(event) => setCustomerId(event.target.value)}
                placeholder="Optional customer ID"
                value={customerId}
              />
            </label>
            <button className="button-neutral compact" onClick={loadConversations} type="button">
              Apply filter
            </button>
          </div>

          {isLoading ? <EmptyState compact message="Loading conversations..." /> : null}
          {!isLoading && conversations.length === 0 ? (
            <EmptyState compact message="No conversations yet. Start one by sending a message." />
          ) : null}

          {conversations.length > 0 ? (
            <ul className="split-list" style={{ marginTop: '14px' }}>
              {conversations.map((item) => (
                <li key={item.conversationId}>
                  <div>
                    <strong>{item.customerId || 'No customer context'}</strong>
                    <small>{compactId(item.conversationId)} / {formatDateTime(item.updatedAt || item.createdAt)}</small>
                  </div>
                  <button className="link-button" onClick={() => openConversation(item.conversationId)} type="button">
                    Open
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </aside>

        <section className="panel" aria-labelledby="chat-panel-heading">
          <div className="panel-heading">
            <div>
              <span>{conversation ? compactId(conversation.conversationId) : 'New conversation'}</span>
              <h2 id="chat-panel-heading">Messages</h2>
            </div>
          </div>

          <div className="message-list" aria-live="polite">
            {asArray(conversation?.messages).length === 0 ? (
              <EmptyState
                compact
                message="Start a conversation by typing a question below. Try: 'Where is shipment X?' or 'Are there any delays today?'"
              />
            ) : (
              conversation.messages.map((item, index) => (
                <article className={`message-bubble ${item.role}`} key={`${item.role}-${index}`}>
                  <span>{item.role === 'assistant' ? 'NTG AI' : 'You'}</span>
                  <p>{item.content}</p>
                </article>
              ))
            )}
          </div>

          <form className="chat-form" onSubmit={handleSubmit} style={{ marginTop: '14px' }}>
            <label className="field">
              <span>Message</span>
              <textarea
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Ask about delays, shipment status, ETA, or location..."
                value={message}
              />
            </label>
            <button className="button-primary" disabled={isSending} type="submit">
              {isSending ? 'Sending' : 'Send message'}
            </button>
          </form>
        </section>
      </div>
    </AppShell>
  )
}
