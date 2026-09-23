const HTTP_PROTOCOLS = new Set(['http:', 'https:'])

export function normalizeUrl(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) throw new Error('請輸入網址')

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  let parsed: URL

  try {
    parsed = new URL(withProtocol)
  } catch {
    throw new Error('網址格式不正確')
  }

  if (!HTTP_PROTOCOLS.has(parsed.protocol) || !parsed.hostname.includes('.')) {
    throw new Error('請輸入有效的 http 或 https 網址')
  }

  if (parsed.username || parsed.password) {
    throw new Error('網址不可包含帳號或密碼')
  }

  return parsed.toString()
}

export function getDisplayHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function getDisplayUrl(url: string): string {
  try {
    const parsed = new URL(url)
    return `${parsed.hostname.replace(/^www\./, '')}${parsed.pathname === '/' ? '' : parsed.pathname}${parsed.search}`
  } catch {
    return url
  }
}

export function getSafeExternalUrl(url: string): string | null {
  try {
    const parsed = new URL(url)
    return HTTP_PROTOCOLS.has(parsed.protocol) ? parsed.toString() : null
  } catch {
    return null
  }
}
