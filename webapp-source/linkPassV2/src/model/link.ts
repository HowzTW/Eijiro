export interface LinkItem {
  id: string
  url: string
  label: string
  createdAt: string
  createdAtMs: number
}

export interface ListData {
  items: LinkItem[]
  nextCursor: string | null
  hasMore: boolean
  serverTime: string
}

export interface RuntimeConfig {
  apiUrl: string
  requiresAccessKey: boolean
  refreshIntervalMs: number
}

export interface ApiErrorShape {
  code: string
  message: string
}

export type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiErrorShape }
