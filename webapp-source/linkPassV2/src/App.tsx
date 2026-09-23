import { useEffect, useState } from 'preact/hooks'
import { AlertTriangle, Plus, RefreshCw, X } from 'lucide-preact'
import { AppHeader } from './components/AppHeader'
import { AccessGate } from './components/AccessGate'
import { DeleteDialog } from './components/DeleteDialog'
import { LinkComposer } from './components/LinkComposer'
import { LinkList } from './components/LinkList'
import { useLinks } from './hooks/useLinks'
import type { LinkItem, RuntimeConfig } from './model/link'
import { formatRelativeTime } from './utils/date'

const ACCESS_KEY_STORAGE_KEY = 'linkpass-v2-access-key'

const defaultConfig: RuntimeConfig = {
  apiUrl: '',
  requiresAccessKey: false,
  refreshIntervalMs: 30_000,
}

async function loadConfig(): Promise<RuntimeConfig> {
  const response = await fetch('./config.json', { cache: 'no-store' })
  if (!response.ok) throw new Error('無法讀取 LinkPass 設定')
  const input = await response.json() as Partial<RuntimeConfig>
  return {
    apiUrl: typeof input.apiUrl === 'string' ? input.apiUrl.trim() : '',
    requiresAccessKey: Boolean(input.requiresAccessKey),
    refreshIntervalMs: typeof input.refreshIntervalMs === 'number' ? input.refreshIntervalMs : defaultConfig.refreshIntervalMs,
  }
}

export function App() {
  const [config, setConfig] = useState<RuntimeConfig | null>(null)
  const [configError, setConfigError] = useState('')
  const [accessKey, setAccessKey] = useState(() => localStorage.getItem(ACCESS_KEY_STORAGE_KEY) || '')
  const [composerOpen, setComposerOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<LinkItem | null>(null)
  const links = useLinks(config, accessKey)

  useEffect(() => {
    loadConfig().then(setConfig).catch((error) => setConfigError(error instanceof Error ? error.message : '設定載入失敗'))
  }, [])

  const saveAccessKey = (nextAccessKey: string) => {
    localStorage.setItem(ACCESS_KEY_STORAGE_KEY, nextAccessKey)
    setAccessKey(nextAccessKey)
    links.clearError()
  }

  const clearAccessKey = () => {
    localStorage.removeItem(ACCESS_KEY_STORAGE_KEY)
    setAccessKey('')
    links.clearError()
  }

  if (configError) {
    return <FatalState title="設定載入失敗" message={configError} />
  }

  if (!config) {
    return <div class="boot-screen" aria-label="LinkPass 載入中"><div class="brand-mark"><RefreshCw class="spin" /></div></div>
  }

  if (!config.apiUrl) {
    return <FatalState title="尚未連接 API" message="請先在 config.json 填入 Google Apps Script Web App 網址。" />
  }

  if (config.requiresAccessKey && !accessKey) {
    return <AccessGate onUnlock={saveAccessKey} />
  }

  const unauthorized = links.error && 'code' in links.error && links.error.code === 'UNAUTHORIZED'

  return (
    <div class="app-shell">
      <AppHeader requiresAccessKey={config.requiresAccessKey} onAdd={() => setComposerOpen(true)} onChangeAccessKey={clearAccessKey} />

      <main>
        <div class="list-heading">
          <h2>最近新增</h2>
          <button class="sync-button" type="button" disabled={links.loading} onClick={() => links.refresh()} aria-label="重新同步連結">
            <span class={`sync-dot${links.error ? ' sync-dot-error' : ''}`} aria-hidden="true" />
            {links.loading ? '同步中' : links.lastSyncedAt ? `${formatRelativeTime(links.lastSyncedAt.toISOString())}同步` : '等待同步'}
          </button>
        </div>

        {links.error && (
          <div class="error-banner" role="alert">
            <AlertTriangle aria-hidden="true" />
            <span>{unauthorized ? '裝置密碼不正確，請重新輸入。' : links.error.message}</span>
            {unauthorized ? (
              <button type="button" onClick={clearAccessKey}>重新輸入</button>
            ) : (
              <button type="button" onClick={() => links.refresh()}>重試</button>
            )}
            <button class="dismiss-error" type="button" onClick={links.clearError} aria-label="關閉錯誤訊息"><X /></button>
          </div>
        )}

        <LinkList
          items={links.items}
          loading={links.loading}
          loadingMore={links.loadingMore}
          hasMore={links.hasMore}
          mutating={links.mutating}
          onAdd={() => setComposerOpen(true)}
          onDelete={setDeleteTarget}
          onLoadMore={() => links.loadMore()}
        />
      </main>

      <button class="primary-button mobile-add-button" type="button" onClick={() => setComposerOpen(true)}>
        <Plus aria-hidden="true" />新增連結
      </button>

      <LinkComposer
        open={composerOpen}
        busy={links.mutating}
        onClose={() => !links.mutating && setComposerOpen(false)}
        onSubmit={links.add}
      />
      <DeleteDialog
        item={deleteTarget}
        busy={links.mutating}
        onClose={() => !links.mutating && setDeleteTarget(null)}
        onConfirm={async (id) => {
          try {
            await links.remove(id)
            setDeleteTarget(null)
          } catch {
            // 錯誤由頁面上的 error banner 顯示，保留對話框供使用者重試。
          }
        }}
      />
    </div>
  )
}

function FatalState({ title, message }: { title: string; message: string }) {
  return (
    <main class="fatal-state">
      <div class="fatal-card">
        <AlertTriangle aria-hidden="true" />
        <h1>{title}</h1>
        <p>{message}</p>
      </div>
    </main>
  )
}
