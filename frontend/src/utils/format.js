export function asArray(value) {
  return Array.isArray(value) ? value : []
}

export function compactId(value) {
  if (!value) return 'Unassigned'
  return String(value).slice(0, 8)
}

export function formatDateTime(value) {
  if (!value) return 'Not set'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not set'

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function formatStatus(value) {
  if (!value) return 'Not started'
  return String(value)
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}
