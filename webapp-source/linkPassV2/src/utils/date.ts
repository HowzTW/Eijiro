const formatter = new Intl.RelativeTimeFormat('zh-TW', { numeric: 'auto' })

export function formatRelativeTime(isoTime: string, now = Date.now()): string {
  const timestamp = Date.parse(isoTime)
  if (!Number.isFinite(timestamp)) return ''

  const seconds = Math.round((timestamp - now) / 1000)
  const absolute = Math.abs(seconds)

  if (absolute < 60) return '剛剛'
  if (absolute < 3600) return formatter.format(Math.round(seconds / 60), 'minute')
  if (absolute < 86400) return formatter.format(Math.round(seconds / 3600), 'hour')
  if (absolute < 604800) return formatter.format(Math.round(seconds / 86400), 'day')

  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(timestamp)
}
