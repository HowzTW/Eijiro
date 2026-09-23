import { Inbox, LoaderCircle } from 'lucide-preact'
import type { LinkItem } from '../model/link'
import { LinkCard } from './LinkCard'

interface Props {
  items: LinkItem[]
  loading: boolean
  loadingMore: boolean
  hasMore: boolean
  mutating: boolean
  onAdd: () => void
  onDelete: (item: LinkItem) => void
  onLoadMore: () => void
}

function SkeletonList() {
  return (
    <div class="skeleton-list" aria-label="正在載入連結">
      {[0, 1, 2].map((index) => <div class="skeleton-card" key={index} />)}
    </div>
  )
}

export function LinkList({ items, loading, loadingMore, hasMore, mutating, onAdd, onDelete, onLoadMore }: Props) {
  if (loading && items.length === 0) return <SkeletonList />

  if (items.length === 0) {
    return (
      <section class="empty-state">
        <Inbox aria-hidden="true" />
        <h2>還沒有連結</h2>
        <p>從手機貼上一個網址，它就會出現在所有裝置上。</p>
        <button class="primary-button" type="button" onClick={onAdd}>新增第一個連結</button>
      </section>
    )
  }

  return (
    <>
      <div class="link-list">
        {items.map((item) => (
          <LinkCard key={item.id} item={item} disabled={mutating} onDelete={onDelete} />
        ))}
      </div>
      {hasMore && (
        <button class="load-more-button" type="button" disabled={loadingMore} onClick={onLoadMore}>
          {loadingMore ? <><LoaderCircle class="spin" aria-hidden="true" />載入中</> : '載入較早的連結'}
        </button>
      )}
    </>
  )
}
