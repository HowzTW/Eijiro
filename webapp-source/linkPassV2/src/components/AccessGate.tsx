import { useState } from 'preact/hooks'
import { KeyRound } from 'lucide-preact'

interface Props {
  onUnlock: (accessKey: string) => void
}

export function AccessGate({ onUnlock }: Props) {
  const [accessKey, setAccessKey] = useState('')

  return (
    <main class="access-gate">
      <div class="access-card">
        <div class="brand-mark"><KeyRound aria-hidden="true" /></div>
        <h1>連接 LinkPass</h1>
        <p>輸入這台裝置共用的存取密碼。</p>
        <form onSubmit={(event) => { event.preventDefault(); if (accessKey.trim()) onUnlock(accessKey.trim()) }}>
          <label class="field">
            <span>裝置密碼</span>
            <input type="password" autoComplete="current-password" value={accessKey} onInput={(event) => setAccessKey(event.currentTarget.value)} autoFocus />
          </label>
          <button class="primary-button full-width" type="submit" disabled={!accessKey.trim()}>連接</button>
        </form>
      </div>
    </main>
  )
}
