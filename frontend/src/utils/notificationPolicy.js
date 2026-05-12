const NOTIFICATION_INBOX_POLICIES = {
  admin: { recipientRole: 'admin' },
  logistics: { recipientRole: 'logistics' },
  support: { recipientRole: 'support' },
}

export function notificationInboxRole(profileOrRole) {
  const role = typeof profileOrRole === 'string' ? profileOrRole : profileOrRole?.role
  return String(role || '').trim().toLowerCase()
}

function notificationInboxCustomerId(profileOrRole) {
  if (!profileOrRole || typeof profileOrRole === 'string') return ''
  return profileOrRole.customerId || profileOrRole.id || ''
}

export function canUseNotificationInbox(profileOrRole) {
  const role = notificationInboxRole(profileOrRole)
  if (role === 'customer') return Boolean(notificationInboxCustomerId(profileOrRole))

  return Object.prototype.hasOwnProperty.call(
    NOTIFICATION_INBOX_POLICIES,
    role
  )
}

export function notificationInboxFilters(profileOrRole) {
  const role = notificationInboxRole(profileOrRole)
  if (role === 'customer') {
    const customerId = notificationInboxCustomerId(profileOrRole)
    return customerId ? { receiverCustomerId: customerId } : {}
  }

  return { ...(NOTIFICATION_INBOX_POLICIES[role] || {}) }
}
