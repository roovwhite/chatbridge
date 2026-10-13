import type { ApiClient, RequestOptions } from './client'
import type { IncomingEvent, InstanceSettings, InstanceState, RawNotification } from './types'

import { ApiError } from './client'

// Сколько сервер держит запрос в ожидании уведомления; тайм-аут клиента должен быть больше.
// GREEN-API принимает 5-60 секунд: при значении вне диапазона сервер отвечает сразу,
// и цикл получения превращается в поток запросов без пауз.
const RECEIVE_TIMEOUT_S = 20

// цифры номера в международном формате -> «79991234567@c.us»
export const phoneToChatId = (digits: string) => `${digits}@c.us`

// «79991234567@c.us» -> «79991234567»
export const phoneOf = (chatId: string) => chatId.split('@')[0]

export function createWhatsAppApi(client: ApiClient) {
  return {
    async getState(opts?: RequestOptions): Promise<InstanceState> {
      const res = await client.get<{ stateInstance: InstanceState }>('getStateInstance', opts)
      return res.stateInstance
    },

    // переключатели в настройках приходят строками "yes" / "no"
    async getSettings(opts?: RequestOptions): Promise<InstanceSettings> {
      return client.get<InstanceSettings>('getSettings', opts)
    },

    // Отмечает входящие сообщения чата прочитанными (без idMessage: все непрочитанные).
    // Собеседник после этого видит «прочитано».
    async readChat(chatId: string, opts?: RequestOptions): Promise<boolean> {
      const res = await client.post<{ setRead: boolean }>('readChat', { chatId }, opts)
      return Boolean(res?.setRead)
    },

    async sendText(chatId: string, message: string, opts?: RequestOptions): Promise<string> {
      const res = await client.post<{ idMessage: string }>('sendMessage', { chatId, message }, opts)
      return res.idMessage
    },

    async receive(signal?: AbortSignal): Promise<IncomingEvent | null> {
      let raw: RawNotification | null
      try {
        raw = await client.get<RawNotification | null>('receiveNotification', {
          signal,
          query: { receiveTimeout: RECEIVE_TIMEOUT_S },
          timeoutMs: (RECEIVE_TIMEOUT_S + 10) * 1000,
        })
      } catch (e) {
        // шлюз GREEN-API может оборвать долгий запрос ответом 408, пока очередь пуста:
        // для long-poll это обычный пустой опрос, а не ошибка
        if (e instanceof ApiError && e.status === 408) return null
        throw e
      }
      if (!raw) return null

      const { receiptId, body } = raw

      // статусы отправленных сообщений: sent, delivered, read; failed и noAccount считаем ошибкой
      if (body.typeWebhook === 'outgoingMessageStatus' && body.chatId && body.idMessage) {
        const status =
          body.status === 'sent' || body.status === 'delivered' || body.status === 'read'
            ? body.status
            : body.status === 'failed' || body.status === 'noAccount'
              ? 'failed'
              : null
        if (status) {
          return { receiptId, kind: 'status', chatId: body.chatId, idMessage: body.idMessage, status }
        }
      }

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
            chatName: s.senderContactName || s.chatName || s.senderName || phoneOf(s.chatId),
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
