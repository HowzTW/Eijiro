import type { ApiResponse } from '../model/link'

export class LinkPassApiError extends Error {
  constructor(
    message: string,
    public readonly code = 'UNKNOWN_ERROR',
  ) {
    super(message)
    this.name = 'LinkPassApiError'
  }
}

export async function postApi<T>(
  apiUrl: string,
  payload: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<T> {
  if (!apiUrl) throw new LinkPassApiError('尚未設定 Google Apps Script API 網址', 'NOT_CONFIGURED')

  const timeoutController = new AbortController()
  const timeoutId = window.setTimeout(() => timeoutController.abort(), 15_000)
  const combinedSignal = signal
    ? AbortSignal.any([signal, timeoutController.signal])
    : timeoutController.signal

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify(payload),
      redirect: 'follow',
      signal: combinedSignal,
    })

    if (!response.ok) {
      throw new LinkPassApiError(`API 回應錯誤（${response.status}）`, 'HTTP_ERROR')
    }

    const result = (await response.json()) as ApiResponse<T>
    if (!result.ok) throw new LinkPassApiError(result.error.message, result.error.code)
    return result.data
  } catch (error) {
    if (error instanceof LinkPassApiError) throw error
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new LinkPassApiError('連線逾時，請稍後再試', 'TIMEOUT')
    }
    throw new LinkPassApiError('無法連接 LinkPass API，請檢查網路後重試', 'NETWORK_ERROR')
  } finally {
    window.clearTimeout(timeoutId)
  }
}
