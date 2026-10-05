export interface Account {
  apiUrl: string
  idInstance: string
  apiTokenInstance: string
}

export type ErrorKind =
  | 'network'
  | 'timeout'
  | 'aborted'
  | 'auth'
  | 'rate_limit'
  | 'quota'
  | 'client'
  | 'server'
  | 'parse'

export class ApiError extends Error {
  readonly kind: ErrorKind
  readonly status?: number
  readonly body?: unknown

  constructor(kind: ErrorKind, message: string, status?: number, body?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
    this.status = status
    this.body = body
  }

  get retryable(): boolean {
    return ['network', 'timeout', 'rate_limit', 'server'].includes(this.kind)
  }
}

export interface RequestOptions {
  signal?: AbortSignal
  timeoutMs?: number
  query?: Record<string, string | number>
  // сегмент пути после токена, например deleteNotification/{token}/{receiptId}
  suffix?: string | number
}

const DEFAULT_TIMEOUT_MS = 15_000

function kindFromStatus(status: number): ErrorKind {
  if (status === 401 || status === 403) return 'auth'
  if (status === 429) return 'rate_limit'
  if (status === 466) return 'quota'
  if (status >= 500) return 'server'
  return 'client'
}

export function createClient(account: Account) {
  const base = `${account.apiUrl.replace(/\/+$/, '')}/waInstance${account.idInstance}`

  async function request<T>(
    method: string,
    httpMethod: 'GET' | 'POST' | 'DELETE',
    body?: unknown,
    { signal, timeoutMs = DEFAULT_TIMEOUT_MS, query, suffix }: RequestOptions = {},
  ): Promise<T> {
    const qs = query
      ? '?' + new URLSearchParams(Object.entries(query).map(([k, v]) => [k, String(v)]))
      : ''
    const tail = suffix === undefined ? '' : `/${suffix}`
    const url = `${base}/${method}/${account.apiTokenInstance}${tail}${qs}`
    // токен находится в URL, поэтому в тексты ошибок попадает только замаскированный вариант
    const safeUrl = `${base}/${method}/***${tail}`

    const timeout = AbortSignal.timeout(timeoutMs)
    const combined = signal ? AbortSignal.any([signal, timeout]) : timeout

    let res: Response
    try {
      res = await fetch(url, {
        method: httpMethod,
        headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: combined,
      })
    } catch {
      if (signal?.aborted) throw new ApiError('aborted', 'Request aborted')
      if (timeout.aborted) throw new ApiError('timeout', `Timeout: ${safeUrl}`)
      throw new ApiError('network', `Network error: ${safeUrl}`)
    }

    let text: string
    try {
      text = await res.text()
    } catch {
      if (signal?.aborted) throw new ApiError('aborted', 'Request aborted')
      throw new ApiError('network', `Failed to read response: ${safeUrl}`, res.status)
    }

    let parsed: unknown = null
    let parseFailed = false
    if (text.trim() !== '') {
      try {
        parsed = JSON.parse(text)
      } catch {
        parseFailed = true
      }
    }

    if (!res.ok) {
      const detail = parseFailed ? text.slice(0, 200) : parsed
      throw new ApiError(
        kindFromStatus(res.status),
        `HTTP ${res.status}: ${safeUrl}`,
        res.status,
        detail,
      )
    }

    if (parseFailed) throw new ApiError('parse', `Invalid JSON: ${safeUrl}`, res.status, text.slice(0, 200))

    // при пустой очереди receiveNotification возвращает null или пустое тело, это не ошибка
    return parsed as T
  }

  return {
    get: <T>(method: string, opts?: RequestOptions) => request<T>(method, 'GET', undefined, opts),
    post: <T>(method: string, body: unknown, opts?: RequestOptions) =>
      request<T>(method, 'POST', body, opts),
    delete: <T>(method: string, opts?: RequestOptions) =>
      request<T>(method, 'DELETE', undefined, opts),
  }
}

export type ApiClient = ReturnType<typeof createClient>
