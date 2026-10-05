import { useEffect, useState } from 'react'
import { ApiError, createClient } from '../api/client'
import { createMaxApi } from '../api/max'
import { useChatStore } from '../store/chatStore'

const BASE_DELAY_MS = 1_000
const MAX_DELAY_MS = 30_000
// ключ persist в chatStore, по нему другие вкладки узнают об изменениях
const STORAGE_KEY = 'chatbridge'

// пауза, которую можно прервать через signal
function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms)
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        resolve()
      },
      { once: true },
    )
  })
}

/**
 * Polling входящих сообщений: receiveNotification -> сохранить в store -> deleteNotification.
 * Возвращает последнюю ошибку; при неповторяемых ошибках (auth, quota и т.п.) цикл останавливается.
 */
export function useReceiver(): ApiError | null {
  const account = useChatStore((s) => s.account)
  const [error, setError] = useState<ApiError | null>(null)

  const apiUrl = account?.apiUrl
  const idInstance = account?.idInstance
  const apiTokenInstance = account?.apiTokenInstance

  useEffect(() => {
    if (!apiUrl || !idInstance || !apiTokenInstance) return

    const ctrl = new AbortController()
    const { signal } = ctrl
    const api = createMaxApi(createClient({ apiUrl, idInstance, apiTokenInstance }))
    const { receiveMessage } = useChatStore.getState()

    async function loop() {
      let delay = BASE_DELAY_MS
      while (!signal.aborted) {
        try {
          const event = await api.receive(signal)
          if (signal.aborted) return
          delay = BASE_DELAY_MS
          setError(null)
          if (!event) continue // очередь пуста, сервер уже подождал receiveTimeout

          // сначала сохраняем, потом удаляем: при сбое между шагами сообщение придёт повторно,
          // а дубль отсекается по idMessage в receiveMessage
          if (event.kind === 'message') receiveMessage(event.message)

          try {
            await api.ack(event.receiptId, signal)
          } catch (e) {
            if (signal.aborted) return
            // сообщение уже в store, поэтому сбой ack не останавливает цикл
            console.warn('deleteNotification не удался', e)
          }
        } catch (e) {
          if (signal.aborted) return
          const err = e instanceof ApiError ? e : new ApiError('network', 'Неизвестная ошибка')
          if (err.kind === 'aborted') return
          setError(err)
          if (!err.retryable) return
          await sleep(delay, signal)
          delay = Math.min(delay * 2, MAX_DELAY_MS)
        }
      }
    }

    // Web Locks: опрашивает только одна вкладка, иначе они разберут очередь между собой.
    // Замок общий на инстанс; при закрытии вкладки он переходит к следующей.
    // Заодно закрывает двойной запуск эффекта в StrictMode: второй цикл ждёт, пока завершится первый.
    if ('locks' in navigator) {
      navigator.locks
        .request(`chatbridge-receiver-${idInstance}`, { signal }, loop)
        .catch(() => {}) // AbortError, если вкладка отменила ожидание замка
    } else {
      void loop()
    }

    return () => ctrl.abort()
  }, [apiUrl, idInstance, apiTokenInstance])

  // вкладка, которая не держит замок, получает новые сообщения через localStorage
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) void useChatStore.persist.rehydrate()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return error
}
