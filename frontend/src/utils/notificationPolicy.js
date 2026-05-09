const NOTIFICATION_INBOX_POLICIES = {
  admin: {},
  logistics: { recipientRole: 'logistics' },
  support: { recipientRole: 'support' },
}

export function notificationInboxRole(profileOrRole) {
  const role = typeof profileOrRole === 'string' ? profileOrRole : profileOrRole?.role
  return String(role || '').trim().toLowerCase()
}

export function canUseNotificationInbox(profileOrRole) {
  return Object.prototype.hasOwnProperty.call(
    NOTIFICATION_INBOX_POLICIES,
    notificationInboxRole(profileOrRole)
  )
}

export function notificationInboxFilters(profileOrRole) {
  const role = notificationInboxRole(profileOrRole)
  return { ...(NOTIFICATION_INBOX_POLICIES[role] || {}) }
}
