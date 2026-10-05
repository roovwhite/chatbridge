import { ApiError, type ApiClient, type RequestOptions } from './client'
import type { IncomingEvent, InstanceState, RawNotification } from './types'

// сколько сервер держит запрос в ожидании уведомления; таймаут клиента должен быть больше
const RECEIVE_TIMEOUT_S = 20

// Телефон (10-15 цифр) -> "79991234567@c.us". Готовые id ("...@c.us" или короткий
// числовой chatId MAX) возвращаются как есть. Если ввод некорректный, вернёт null.
export function normalizeChatId(input: string): string | null {
  const trimmed = input.trim()
  if (/^\d+@c\.us$/.test(trimmed)) return trimmed
  const digits = trimmed.replace(/\D/g, '')
  if (digits.length >= 10 && digits.length <= 15) return `${digits}@c.us`
  if (/^\d{1,9}$/.test(digits) && digits === trimmed) return digits
  return null
}

export function createMaxApi(client: ApiClient) {
  return {
    async getState(opts?: RequestOptions): Promise<InstanceState> {
      const res = await client.get<{ stateInstance: InstanceState }>('getStateInstance', opts)
      return res.stateInstance
    },

    async sendText(chatId: string, message: string, opts?: RequestOptions): Promise<string> {
      const res = await client.post<{ idMessage: string }>('sendMessage', { chatId, message }, opts)
      return res.idMessage
    },

    async receive(signal?: AbortSignal): Promise<IncomingEvent | null> {
      const raw = await client.get<RawNotification | null>('receiveNotification', {
        signal,
        query: { receiveTimeout: RECEIVE_TIMEOUT_S },
        timeoutMs: (RECEIVE_TIMEOUT_S + 10) * 1000,
      })
      if (!raw) return null

      const { receiptId, body } = raw
      const text = body.messageData?.textMessageData?.textMessage
      if (
        body.typeWebhook === 'incomingMessageReceived' &&
        body.messageData?.typeMessage === 'textMessage' &&
        body.senderData &&
        body.idMessage &&
        text !== undefined
      ) {
        const s = body.senderData
        return {
          receiptId,
          kind: 'message',
          message: {
            chatId: s.chatId,
            chatName: s.chatName || s.senderName || s.chatId,
            senderPhone: s.senderPhoneNumber ? String(s.senderPhoneNumber) : undefined,
            idMessage: body.idMessage,
            text,
            timestamp: (body.timestamp ?? Math.floor(Date.now() / 1000)) * 1000,
          },
        }
      }
      return { receiptId, kind: 'ignored' }
    },

    async ack(receiptId: number, signal?: AbortSignal): Promise<void> {
      const res = await client.delete<{ result: boolean; reason?: string }>('deleteNotification', {
        signal,
        suffix: receiptId,
      })
      if (!res?.result) throw new ApiError('client', `deleteNotification failed: ${res?.reason ?? ''}`)
    },
  }
}

export type MaxApi = ReturnType<typeof createMaxApi>
