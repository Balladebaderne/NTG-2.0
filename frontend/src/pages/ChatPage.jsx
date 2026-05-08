import React, { useEffect, useState } from 'react'
import { getConversation, listConversations, sendChatMessage } from '../clients/chatClient'
import { asArray, compactId, formatDateTime } from '../utils/format'

export function ChatPage({ onNavigate, onSignOut, token }) {
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

      <section className="page-section" aria-labelledby="chat-title">
        <div className="page-heading">
          <div>
            <p className="eyebrow">AI assistant</p>
            <h1 id="chat-title">Shipment chat</h1>
            <p className="dashboard-copy">
              Ask Shipment-related questions using the chat service and its Shipment context bridge.
            </p>
          </div>
          <button className="primary-button fit-button" type="button" onClick={loadConversations} disabled={isLoading}>
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {error ? <p className="form-error" role="alert">{error}</p> : null}

        <div className="chat-layout">
          <aside className="content-panel" aria-labelledby="conversation-list-heading">
            <div className="section-heading">
              <h2 id="conversation-list-heading">Conversations</h2>
              <span>{conversations.length} saved</span>
            </div>
            <label className="field">
              <span>Customer filter</span>
              <input value={customerId} onChange={(event) => setCustomerId(event.target.value)} placeholder="Optional customerId" />
            </label>
            <button className="secondary-button fit-button" type="button" onClick={loadConversations}>
              Apply filter
            </button>
            {isLoading ? <p className="empty-state compact-state">Loading conversations...</p> : null}
            {!isLoading && conversations.length === 0 ? (
              <p className="empty-state compact-state">No conversations yet.</p>
            ) : null}
            <ul className="stack-list">
              {conversations.map((item) => (
                <li key={item.conversationId}>
                  <span>{compactId(item.conversationId)}</span>
                  <strong>{item.customerId || 'No customer context'}</strong>
                  <small>{formatDateTime(item.updatedAt || item.createdAt)}</small>
                  <button className="link-button" type="button" onClick={() => openConversation(item.conversationId)}>
                    Open
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          <section className="content-panel wide" aria-labelledby="chat-panel-heading">
            <div className="section-heading">
              <h2 id="chat-panel-heading">Messages</h2>
              <span>{conversation ? compactId(conversation.conversationId) : 'new conversation'}</span>
            </div>

            <div className="message-list" aria-live="polite">
              {asArray(conversation?.messages).length === 0 ? (
                <p className="empty-state compact-state">Start a conversation to see messages here.</p>
              ) : (
                conversation.messages.map((item, index) => (
                  <article className={`message-bubble ${item.role}`} key={`${item.role}-${index}`}>
                    <span>{item.role === 'assistant' ? 'Assistant' : 'You'}</span>
                    <p>{item.content}</p>
                  </article>
                ))
              )}
            </div>

            <form className="chat-form" onSubmit={handleSubmit}>
              <label className="field">
                <span>Message</span>
                <textarea
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Ask about delays, status, ETA, or location."
                  value={message}
                />
              </label>
              <button className="primary-button fit-button" type="submit" disabled={isSending}>
                {isSending ? 'Sending...' : 'Send'}
              </button>
            </form>
          </section>
        </div>
      </section>
    </main>
  )
}
