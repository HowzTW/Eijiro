import { LoaderCircle } from 'lucide-preact'
import { useEffect } from 'preact/hooks'
import type { LinkItem } from '../model/link'
import { getDisplayHost } from '../utils/url'

interface Props {
  item: LinkItem | null
  busy: boolean
  onClose: () => void
  onConfirm: (id: string) => Promise<unknown>
}

export function DeleteDialog({ item, busy, onClose, onConfirm }: Props) {
  useEffect(() => {
    if (!item) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [item, busy, onClose])

  if (!item) return null
  const title = item.label || getDisplayHost(item.url)

  return (
    <div class="dialog-backdrop dialog-backdrop-centered">
      <section class="dialog delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-description">
        <h2 id="delete-title">刪除這個連結？</h2>
        <p id="delete-description"><strong>{title}</strong><br />刪除後，它也會從其他裝置消失。</p>
        <div class="dialog-actions">
          <button class="secondary-button" type="button" autoFocus disabled={busy} onClick={onClose}>保留</button>
          <button class="danger-button" type="button" disabled={busy} onClick={() => onConfirm(item.id)}>
            {busy && <LoaderCircle class="spin" aria-hidden="true" />}
            刪除
          </button>
        </div>
      </section>
    </div>
  )
}
