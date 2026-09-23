import { useEffect, useRef, useState } from 'preact/hooks'
import { LoaderCircle, X } from 'lucide-preact'
import { normalizeUrl } from '../utils/url'

interface Props {
  open: boolean
  busy: boolean
  onClose: () => void
  onSubmit: (url: string, label: string) => Promise<unknown>
}

export function LinkComposer({ open, busy, onClose, onSubmit }: Props) {
  const [url, setUrl] = useState('')
  const [label, setLabel] = useState('')
  const [validationError, setValidationError] = useState('')
  const urlInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setValidationError('')
    window.setTimeout(() => urlInputRef.current?.focus(), 50)
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [open, busy, onClose])

  if (!open) return null

  const submit = async (event: Event) => {
    event.preventDefault()
    try {
      const normalizedUrl = normalizeUrl(url)
      setValidationError('')
      await onSubmit(normalizedUrl, label.trim())
      setUrl('')
      setLabel('')
      onClose()
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : '新增失敗')
    }
  }

  return (
    <div class="dialog-backdrop" onMouseDown={(event) => event.currentTarget === event.target && !busy && onClose()}>
      <section class="dialog composer-dialog" role="dialog" aria-modal="true" aria-labelledby="composer-title">
        <div class="dialog-heading">
          <div>
            <h2 id="composer-title">新增連結</h2>
            <p>貼上網址，所有裝置就能一起開啟。</p>
          </div>
          <button class="icon-button" type="button" disabled={busy} onClick={onClose} aria-label="關閉新增視窗"><X /></button>
        </div>
        <form onSubmit={submit}>
          <label class="field">
            <span>網址</span>
            <input
              ref={urlInputRef}
              type="text"
              inputMode="url"
              autoComplete="url"
              placeholder="https://example.com"
              value={url}
              onInput={(event) => setUrl(event.currentTarget.value)}
              required
            />
          </label>
          <label class="field">
            <span>名稱 <small>選填</small></span>
            <input
              type="text"
              maxLength={120}
              placeholder="例如：今晚要看的電影"
              value={label}
              onInput={(event) => setLabel(event.currentTarget.value)}
            />
          </label>
          {validationError && <p class="field-error" role="alert">{validationError}</p>}
          <div class="dialog-actions">
            <button class="secondary-button" type="button" disabled={busy} onClick={onClose}>取消</button>
            <button class="primary-button" type="submit" disabled={busy || !url.trim()}>
              {busy && <LoaderCircle class="spin" aria-hidden="true" />}
              新增
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
