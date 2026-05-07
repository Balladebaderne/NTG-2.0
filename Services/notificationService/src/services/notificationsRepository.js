const pool = require('../db')

const SELECT_FIELDS = `
  id,
  receiver_customer_id AS "receiverCustomerId",
  recipient_role AS "recipientRole",
  shipment_id AS "shipmentId",
  type,
  title,
  message,
  channel,
  read_at AS "readAt",
  sent_at AS "sentAt",
  metadata,
  created_at AS "createdAt"
`

async function listNotifications({ receiverCustomerId, recipientRole, unreadOnly } = {}) {
  const conditions = []
  const params = []

  if (receiverCustomerId) {
    params.push(receiverCustomerId)
    conditions.push(`receiver_customer_id = $${params.length}`)
  }

  if (recipientRole) {
    params.push(recipientRole)
    conditions.push(`recipient_role = $${params.length}`)
  }

  if (unreadOnly) {
    conditions.push('read_at IS NULL')
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const { rows } = await pool.query(
    `SELECT ${SELECT_FIELDS}
     FROM notifications
     ${where}
     ORDER BY created_at DESC`,
    params
  )

  return rows
}

async function createNotification(notification) {
  if (!notification.receiverCustomerId && !notification.recipientRole) {
    throw new Error('Notification requires receiverCustomerId or recipientRole')
  }

  const { rows } = await pool.query(
    `INSERT INTO notifications (
       receiver_customer_id,
       recipient_role,
       shipment_id,
       type,
       title,
       message,
       channel,
       sent_at,
       metadata
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)
     ON CONFLICT DO NOTHING
     RETURNING ${SELECT_FIELDS}`,
    [
      notification.receiverCustomerId || null,
      notification.recipientRole || null,
      notification.shipmentId,
      notification.type,
      notification.title,
      notification.message,
      notification.channel || 'in_app',
      notification.metadata || {},
    ]
  )

  return rows[0] || null
}

async function markNotificationRead(id) {
  const { rows } = await pool.query(
    `UPDATE notifications
     SET read_at = COALESCE(read_at, NOW())
     WHERE id = $1
     RETURNING ${SELECT_FIELDS}`,
    [id]
  )

  return rows[0] || null
}

module.exports = {
  createNotification,
  listNotifications,
  markNotificationRead,
}
