import React from 'react'
import { compactId, formatDateTime, formatStatus } from '../utils/format'

function notificationId(notification) {
  return notification?.id || notification?.notificationId
}

function notificationTime(notification) {
  return notification?.sentAt || notification?.createdAt
}

function shipmentReference(notification) {
  return notification?.shipmentId || notification?.metadata?.shipmentId
}

export function NotificationInboxItem({ isMarking = false, notification, onMarkRead }) {
  const id = notificationId(notification)
  const isUnread = !notification?.readAt
  const sentAt = notificationTime(notification)
  const shipmentId = shipmentReference(notification)
  const isShipmentDelay = notification?.type === 'shipment_delayed'
  const title = notification?.title || formatStatus(notification?.type || 'Notification')
  const message = notification?.message || 'No message was provided for this notification.'

  return (
    <li className={`notification-item ${isUnread ? 'is-unread' : 'is-read'}`}>
      <div className="notification-item-top">
        <div>
          <strong>{title}</strong>
          <span className="notification-read-state">{isUnread ? 'Unread' : 'Read'}</span>
        </div>
        <time dateTime={sentAt || undefined}>{formatDateTime(sentAt)}</time>
      </div>
      <p>{message}</p>
      <div className="notification-item-footer">
        <span className="notification-object-label">
          {isShipmentDelay ? 'Shipment' : formatStatus(notification?.type || 'Notification')}
          {shipmentId ? ` ${compactId(shipmentId)}` : ''}
        </span>
        {isUnread && id ? (
          <button
            className="button-neutral compact notification-mark-read"
            disabled={isMarking}
            onClick={() => onMarkRead(notification)}
            type="button"
          >
            {isMarking ? 'Marking' : 'Mark read'}
          </button>
        ) : (
          <span className="read-badge">Read</span>
        )}
      </div>
    </li>
  )
}
