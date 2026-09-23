import type { LinkItem, ListData } from '../model/link'
import { postApi } from './client'

interface ApiContext {
  apiUrl: string
  accessKey: string
}

function withAccessKey(context: ApiContext, payload: Record<string, unknown>) {
  return context.accessKey ? { ...payload, accessKey: context.accessKey } : payload
}

export function listLinks(
  context: ApiContext,
  options: { limit?: number; cursor?: string | null } = {},
  signal?: AbortSignal,
) {
  return postApi<ListData>(
    context.apiUrl,
    withAccessKey(context, {
      action: 'list',
      limit: options.limit ?? 40,
      cursor: options.cursor ?? null,
    }),
    signal,
  )
}

export function createLink(
  context: ApiContext,
  input: { url: string; label: string; clientRequestId: string },
) {
  return postApi<LinkItem>(context.apiUrl, withAccessKey(context, { action: 'create', ...input }))
}

export function deleteLink(context: ApiContext, id: string) {
  return postApi<{ id: string }>(context.apiUrl, withAccessKey(context, { action: 'delete', id }))
}
