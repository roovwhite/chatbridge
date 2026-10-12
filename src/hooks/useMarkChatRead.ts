import { useEffect, useRef } from 'react'

import { getWhatsAppApi } from '@/api/instance'
import { useChatStore } from '@/store/chatStore'

// Отмечает чат прочитанным в WhatsApp, только когда пользователь реально его видит:
// чат открыт и вкладка на виду. Иначе собеседник увидел бы «прочитано» раньше времени.
// Для этого у инстанса должна быть выключена настройка markIncomingMessagesReaded.
export function useMarkChatRead(chatId: string, lastIncomingId: string | undefined) {
  // последнее входящее, для которого отметка уже отправлена, по чатам
  const marked = useRef<Record<string, string>>({})

  useEffect(() => {
    if (!lastIncomingId) return

    const mark = () => {
      if (document.visibilityState !== 'visible') return
      if (marked.current[chatId] === lastIncomingId) return
      const account = useChatStore.getState().account
      if (!account) return

      marked.current[chatId] = lastIncomingId
      getWhatsAppApi(account)
        .readChat(chatId)
        .catch(() => {
          // не вышло: позволяем повторить при следующем входящем или возврате на вкладку
          delete marked.current[chatId]
        })
    }

    mark()
    // вкладка была в фоне, пользователь вернулся: теперь сообщения действительно прочитаны
    document.addEventListener('visibilitychange', mark)
    return () => document.removeEventListener('visibilitychange', mark)
  }, [chatId, lastIncomingId])
}
