import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { listNotifications, markNotificationRead } from '../clients/notificationsClient'
import { asArray } from '../utils/format'
import { canUseNotificationInbox } from '../utils/notificationPolicy'
import { NotificationInboxItem } from './NotificationInboxItem'

const POLL_INTERVAL_MS = 45000
const RECENT_NOTIFICATION_LIMIT = 5

function notificationId(notification) {
  return notification?.id || notification?.notificationId
}

function notificationTimestamp(notification) {
  return notification?.sentAt || notification?.createdAt || ''
}

function sortNewestFirst(notifications) {
  return [...notifications].sort((left, right) => {
    const leftTime = new Date(notificationTimestamp(left)).getTime()
    const rightTime = new Date(notificationTimestamp(right)).getTime()
    return (Number.isFinite(rightTime) ? rightTime : 0) - (Number.isFinite(leftTime) ? leftTime : 0)
  })
}

export function NotificationInbox({ icon, profile, token }) {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [markingId, setMarkingId] = useState('')
  const buttonRef = useRef(null)
  const panelRef = useRef(null)
  const inboxRef = useRef(null)
  const canShowInbox = canUseNotificationInbox(profile)

  const loadNotifications = useCallback(async ({ silent = false } = {}) => {
    if (!canShowInbox) return
    if (!silent) setLoading(true)
    setError('')

    try {
      const result = await listNotifications({ profile, token })
      setNotifications(sortNewestFirst(asArray(result)))
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [canShowInbox, profile?.role, token])

  useEffect(() => {
    if (!canShowInbox) return undefined

    let active = true

    async function loadInitialNotifications() {
      setLoading(true)
      setError('')
      try {
        const result = await listNotifications({ profile, token })
        if (active) setNotifications(sortNewestFirst(asArray(result)))
      } catch (loadError) {
        if (active) setError(loadError.message)
      } finally {
        if (active) setLoading(false)
      }
    }

    loadInitialNotifications()
    const intervalId = window.setInterval(() => {
      if (active) loadNotifications({ silent: true })
    }, POLL_INTERVAL_MS)

    return () => {
      active = false
      window.clearInterval(intervalId)
    }
  }, [canShowInbox, loadNotifications, profile, token])

  useEffect(() => {
    if (!isOpen) return undefined

    loadNotifications()
    window.requestAnimationFrame(() => panelRef.current?.focus())

    function handlePointerDown(event) {
      if (!inboxRef.current?.contains(event.target)) {
        setIsOpen(false)
        buttonRef.current?.focus()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [isOpen, loadNotifications])

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.readAt).length,
    [notifications]
  )
  const recentNotifications = useMemo(
    () => notifications.slice(0, RECENT_NOTIFICATION_LIMIT),
    [notifications]
  )
  const panelId = 'notification-inbox-panel'
  const buttonLabel = unreadCount > 0
    ? `Notifications, ${unreadCount} unread`
    : 'Notifications'

  async function handleMarkRead(notification) {
    const id = notificationId(notification)
    if (!id) return

    setMarkingId(id)
    setError('')
    try {
      const updated = await markNotificationRead(id, { token })
      setNotifications((current) => sortNewestFirst(current.map((item) => {
        const currentId = notificationId(item)
        if (currentId !== id) return item
        return updated || { ...item, readAt: new Date().toISOString() }
      })))
    } catch (markError) {
      setError(markError.message)
    } finally {
      setMarkingId('')
    }
  }

  function closeInbox() {
    setIsOpen(false)
    buttonRef.current?.focus()
  }

  function handlePanelKeyDown(event) {
    if (event.key === 'Escape') {
      event.stopPropagation()
      closeInbox()
    }
  }

  if (!canShowInbox) return null

  return (
    <div className="notification-inbox" ref={inboxRef}>
      <button
        aria-controls={isOpen ? panelId : undefined}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={buttonLabel}
        className="notification-trigger"
        onClick={() => setIsOpen((current) => !current)}
        ref={buttonRef}
        type="button"
      >
        {icon}
        {unreadCount > 0 ? (
          <span className="notification-count-badge" aria-hidden="true">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
        <span className="sr-only">
          {unreadCount > 0 ? `${unreadCount} unread notifications` : 'No unread notifications'}
        </span>
      </button>

      {isOpen ? (
        <section
          aria-label="Notifications"
          className="notification-popover"
          id={panelId}
          onKeyDown={handlePanelKeyDown}
          ref={panelRef}
          role="dialog"
          tabIndex="-1"
        >
          <div className="notification-popover-header">
            <div>
              <span>Inbox</span>
              <strong>Notifications</strong>
            </div>
            <button className="button-neutral compact" onClick={closeInbox} type="button">
              Close
            </button>
          </div>

          <div className="notification-popover-body">
            {loading ? <p className="notification-state-message">Loading notifications</p> : null}
            {error ? (
              <div className="notification-error" role="alert">
                <p>{error}</p>
                <button className="button-neutral compact" onClick={() => loadNotifications()} type="button">
                  Retry
                </button>
              </div>
            ) : null}
            {!loading && !error && recentNotifications.length === 0 ? (
              <p className="notification-state-message">No notifications to show.</p>
            ) : null}
            {!error && recentNotifications.length > 0 ? (
              <ul className="notification-list">
                {recentNotifications.map((notification) => {
                  const id = notificationId(notification)
                  return (
                    <NotificationInboxItem
                      isMarking={markingId === id}
                      key={id || `${notification.shipmentId}-${notification.createdAt}`}
                      notification={notification}
                      onMarkRead={handleMarkRead}
                    />
                  )
                })}
              </ul>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  )
}
