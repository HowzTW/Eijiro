import { ExternalLink, Trash2 } from 'lucide-preact'
import type { LinkItem } from '../model/link'
import { formatRelativeTime } from '../utils/date'
import { getDisplayHost, getDisplayUrl, getSafeExternalUrl } from '../utils/url'

interface Props {
  item: LinkItem
  disabled: boolean
  onDelete: (item: LinkItem) => void
}

export function LinkCard({ item, disabled, onDelete }: Props) {
  const title = item.label || getDisplayHost(item.url)
  const safeUrl = getSafeExternalUrl(item.url)

  return (
    <article class="link-card">
      <div class="link-copy">
        <h3>{title}</h3>
        <div class="link-meta">
          <span class="display-url">{getDisplayUrl(item.url)}</span>
          <time dateTime={item.createdAt}>{formatRelativeTime(item.createdAt)}</time>
        </div>
      </div>
      {safeUrl ? (
        <a class="open-button" href={safeUrl} target="_blank" rel="noopener noreferrer" aria-label={`開啟「${title}」`}>
          <ExternalLink aria-hidden="true" />
          <span>開啟</span>
        </a>
      ) : (
        <button class="open-button" type="button" disabled aria-label={`「${title}」的網址無效`}>
          <ExternalLink aria-hidden="true" />
          <span>無效網址</span>
        </button>
      )}
      <button
        class="delete-button"
        type="button"
        disabled={disabled}
        onClick={() => onDelete(item)}
        aria-label={`刪除「${title}」`}
      >
        <Trash2 aria-hidden="true" />
      </button>
    </article>
  )
}
