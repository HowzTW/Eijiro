const API_URL = 'https://script.google.com/macros/s/AKfycbzGO29bI1z02CvF-RZsPDyZjrx63kQ3m_FYg9bMfmuP83FRUeIJ2eJxkJ-fAWhLSPPRGg/exec?action=content'
const CACHE_KEY = 'hataro-korean-note:content:v1'

function isValidTopic(topic) {
  return topic && typeof topic.id === 'string' && Array.isArray(topic.phrases)
}

function isValidResponse(payload) {
  return payload?.ok === true && payload.apiVersion === '1' && Array.isArray(payload.data?.topics) && payload.data.topics.every(isValidTopic)
}

export function readCachedContent() {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY))
    return isValidResponse(cached?.payload) ? cached : null
  } catch {
    return null
  }
}

export function saveCachedContent(payload) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: new Date().toISOString(), payload }))
  } catch {
    // A full or unavailable localStorage should never block the live content.
  }
}

export async function fetchKoreanNoteContent() {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 12000)

  try {
    const response = await fetch(API_URL, {
      method: 'GET',
      redirect: 'follow',
      cache: 'no-store',
      signal: controller.signal,
    })

    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const payload = await response.json()
    if (!isValidResponse(payload)) throw new Error('INVALID_API_RESPONSE')
    return payload
  } finally {
    window.clearTimeout(timeout)
  }
}

export { API_URL }
