import { useCallback } from 'react'
import { createClient } from '../api/client'
import { createWhatsAppApi } from '../api/whatsapp'
import { useChatStore } from '../store/chatStore'

// Отправка текста: сообщение сразу появляется в чате (pending), потом получает sent или failed.
export function useSendMessage() {
  const deliver = useCallback(async (chatId: string, localId: string, text: string) => {
    const { account, updateMessage } = useChatStore.getState()
    if (!account) return
    updateMessage(chatId, localId, { status: 'pending' })
    try {
      const idMessage = await createWhatsAppApi(createClient(account)).sendText(chatId, text)
      // заменяем локальный id настоящим, чтобы не путаться с сообщениями из API
      updateMessage(chatId, localId, { id: idMessage, status: 'sent' })
    } catch {
      // автоматического повтора нет: сообщение могло уйти, и повтор создал бы дубль
      updateMessage(chatId, localId, { status: 'failed' })
    }
  }, [])

  const send = useCallback(
    (chatId: string, text: string) => {
      const localId = useChatStore.getState().addOutgoing(chatId, text)
      return deliver(chatId, localId, text)
    },
    [deliver],
  )

  // повторная отправка по кнопке для сообщения со статусом failed
  const retry = deliver

  return { send, retry }
}
