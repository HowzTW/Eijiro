import { KeyRound, Plus, Send } from 'lucide-preact'

interface Props {
  requiresAccessKey: boolean
  onAdd: () => void
  onChangeAccessKey: () => void
}

export function AppHeader({ requiresAccessKey, onAdd, onChangeAccessKey }: Props) {
  return (
    <header class="app-header">
      <div class="brand">
        <div class="brand-mark" aria-hidden="true"><Send /></div>
        <div>
          <h1>LinkPass</h1>
          <p>把手機上的連結，送到大螢幕</p>
        </div>
      </div>
      <div class="header-actions">
        {requiresAccessKey && (
          <button class="icon-button" type="button" onClick={onChangeAccessKey} aria-label="變更裝置密碼">
            <KeyRound />
          </button>
        )}
        <button class="primary-button header-add-button" type="button" onClick={onAdd}>
          <Plus aria-hidden="true" />新增連結
        </button>
      </div>
    </header>
  )
}
