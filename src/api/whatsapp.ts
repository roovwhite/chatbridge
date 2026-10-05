import { ApiError, type ApiClient, type RequestOptions } from './client'
import type { IncomingEvent, InstanceState, RawNotification } from './types'

// сколько сервер держит запрос в ожидании уведомления; таймаут клиента должен быть больше
const RECEIVE_TIMEOUT_S = 20

// Телефон (10-15 цифр, можно с «+», пробелами и скобками) -> "79991234567@c.us".
// Готовый chatId вида "...@c.us" или "...@g.us" возвращается как есть.
// Если ввод некорректный, вернёт null.
export function normalizeChatId(input: string): string | null {
  const trimmed = input.trim()
  if (/^\d+@[cg]\.us$/.test(trimmed)) return trimmed
  const digits = trimmed.replace(/\D/g, '')
  if (digits.length >= 10 && digits.length <= 15) return `${digits}@c.us`
  return null
}

export function createWhatsAppApi(client: ApiClient) {
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
      const data = body.messageData
      // обычный текст приходит как textMessage, текст со ссылкой или ответом как extendedTextMessage
      const text =
        data?.typeMessage === 'textMessage'
          ? data.textMessageData?.textMessage
          : data?.typeMessage === 'extendedTextMessage'
            ? data.extendedTextMessageData?.text
            : undefined

      if (
        body.typeWebhook === 'incomingMessageReceived' &&
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
            chatName: s.senderContactName || s.chatName || s.senderName || s.chatId.split('@')[0],
            idMessage: body.idMessage,
            text,
            timestamp: (body.timestamp ?? Math.floor(Date.now() / 1000)) * 1000,
          },
        }
      }
      return { receiptId, kind: 'ignored' }
    },

    // receiptId передаётся в пути после токена, метод DELETE
    async ack(receiptId: number, signal?: AbortSignal): Promise<void> {
      const res = await client.delete<{ result: boolean; reason?: string }>('deleteNotification', {
        signal,
        suffix: receiptId,
      })
      if (!res?.result) throw new ApiError('client', `deleteNotification failed: ${res?.reason ?? ''}`)
    },
  }
}

export type WhatsAppApi = ReturnType<typeof createWhatsAppApi>
