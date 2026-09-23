import { useCallback, useEffect, useRef, useState } from 'preact/hooks'
import { createLink, deleteLink, listLinks } from '../api/linkPassApi'
import type { LinkItem, RuntimeConfig } from '../model/link'
import { createRequestId } from '../utils/requestId'

const PAGE_SIZE = 40

export function useLinks(config: RuntimeConfig | null, accessKey: string) {
  const [items, setItems] = useState<LinkItem[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [mutating, setMutating] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const context = config ? { apiUrl: config.apiUrl, accessKey } : null

  const refresh = useCallback(async (quiet = false) => {
    if (!context) return
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    if (!quiet) setLoading(true)

    try {
      const data = await listLinks(context, { limit: PAGE_SIZE }, controller.signal)
      setItems(data.items)
      setNextCursor(data.nextCursor)
      setHasMore(data.hasMore)
      setError(null)
      setLastSyncedAt(new Date())
    } catch (caught) {
      if (!controller.signal.aborted) setError(caught instanceof Error ? caught : new Error('載入失敗'))
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [config?.apiUrl, accessKey])

  const loadMore = useCallback(async () => {
    if (!context || !nextCursor || loadingMore) return
    setLoadingMore(true)
    try {
      const data = await listLinks(context, { limit: PAGE_SIZE, cursor: nextCursor })
      setItems((current) => {
        const ids = new Set(current.map((item) => item.id))
        return [...current, ...data.items.filter((item) => !ids.has(item.id))]
      })
      setNextCursor(data.nextCursor)
      setHasMore(data.hasMore)
      setError(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught : new Error('載入失敗'))
    } finally {
      setLoadingMore(false)
    }
  }, [config?.apiUrl, accessKey, nextCursor, loadingMore])

  const add = useCallback(async (url: string, label: string) => {
    if (!context || mutating) return
    setMutating(true)
    try {
      const item = await createLink(context, { url, label, clientRequestId: createRequestId() })
      setItems((current) => [item, ...current.filter((existing) => existing.id !== item.id)])
      setError(null)
      setLastSyncedAt(new Date())
      return item
    } catch (caught) {
      const nextError = caught instanceof Error ? caught : new Error('新增失敗')
      setError(nextError)
      throw nextError
    } finally {
      setMutating(false)
    }
  }, [config?.apiUrl, accessKey, mutating])

  const remove = useCallback(async (id: string) => {
    if (!context || mutating) return
    setMutating(true)
    try {
      await deleteLink(context, id)
      setItems((current) => current.filter((item) => item.id !== id))
      setError(null)
      setLastSyncedAt(new Date())
    } catch (caught) {
      const nextError = caught instanceof Error ? caught : new Error('刪除失敗')
      setError(nextError)
      throw nextError
    } finally {
      setMutating(false)
    }
  }, [config?.apiUrl, accessKey, mutating])

  useEffect(() => {
    if (!context) return
    void refresh()
    return () => abortRef.current?.abort()
  }, [refresh])

  useEffect(() => {
    if (!config || !context || config.refreshIntervalMs <= 0) return
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void refresh(true)
    }
    const intervalId = window.setInterval(refreshWhenVisible, config.refreshIntervalMs)
    document.addEventListener('visibilitychange', refreshWhenVisible)
    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [config?.refreshIntervalMs, refresh])

  return {
    items,
    hasMore,
    loading,
    loadingMore,
    mutating,
    error,
    lastSyncedAt,
    refresh,
    loadMore,
    add,
    remove,
    clearError: () => setError(null),
  }
}
