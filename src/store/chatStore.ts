import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Account } from '../api/client'
import type { Chat, ChatMessage, IncomingMessage } from '../api/types'

interface ChatState {
  account: Account | null
  chats: Record<string, Chat>
  messages: Record<string, ChatMessage[]>
  unread: Record<string, number>
  activeChatId: string | null

  login: (account: Account) => void
  logout: () => void
  // создаёт чат (если его ещё нет) и делает его активным
  openChat: (chatId: string) => void
  selectChat: (chatId: string | null) => void
  // добавляет исходящее сообщение со статусом pending и возвращает его локальный id
  addOutgoing: (chatId: string, text: string) => string
  updateMessage: (chatId: string, id: string, patch: Partial<ChatMessage>) => void
  receiveMessage: (msg: IncomingMessage) => void
}

// «79991234567@c.us» -> «79991234567»; имя чата по умолчанию, пока нет имени контакта
const phoneOf = (chatId: string) => chatId.split('@')[0]

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      account: null,
      chats: {},
      messages: {},
      unread: {},
      activeChatId: null,

      login: (account) => set({ account }),

      // креды и вся локальная история удаляются вместе, чтобы не смешивать разные инстансы
      logout: () => set({ account: null, chats: {}, messages: {}, unread: {}, activeChatId: null }),

      openChat: (chatId) =>
        set((s) => ({
          chats: s.chats[chatId]
            ? s.chats
            : { ...s.chats, [chatId]: { id: chatId, name: phoneOf(chatId) } },
          activeChatId: chatId,
          unread: { ...s.unread, [chatId]: 0 },
        })),

      selectChat: (chatId) =>
        set((s) => ({
          activeChatId: chatId,
          unread: chatId ? { ...s.unread, [chatId]: 0 } : s.unread,
        })),

      addOutgoing: (chatId, text) => {
        const id = crypto.randomUUID()
        const message: ChatMessage = {
          id,
          chatId,
          text,
          direction: 'out',
          timestamp: Date.now(),
          status: 'pending',
        }
        set((s) => ({
          messages: { ...s.messages, [chatId]: [...(s.messages[chatId] ?? []), message] },
        }))
        return id
      },

      updateMessage: (chatId, id, patch) =>
        set((s) => ({
          messages: {
            ...s.messages,
            [chatId]: (s.messages[chatId] ?? []).map((m) => (m.id === id ? { ...m, ...patch } : m)),
          },
        })),

      receiveMessage: (msg) => {
        const s = get()

        // в WhatsApp chatId входящих совпадает с chatId, на который мы отправляли (79991234567@c.us)
        const chatId = msg.chatId

        // повторная доставка того же уведомления (например, не дошёл deleteNotification)
        if (s.messages[chatId]?.some((m) => m.id === msg.idMessage)) return

        const existing = s.chats[chatId]
        // чат, созданный по номеру, получает имя контакта, когда оно становится известно
        const chat: Chat =
          existing && existing.name !== phoneOf(chatId)
            ? existing
            : { id: chatId, name: msg.chatName }
        const message: ChatMessage = {
          id: msg.idMessage,
          chatId,
          text: msg.text,
          direction: 'in',
          timestamp: msg.timestamp,
          status: 'sent',
        }
        set({
          chats: { ...s.chats, [chatId]: chat },
          messages: { ...s.messages, [chatId]: [...(s.messages[chatId] ?? []), message] },
          unread:
            s.activeChatId === chatId
              ? s.unread
              : { ...s.unread, [chatId]: (s.unread[chatId] ?? 0) + 1 },
        })
      },
    }),
    {
      name: 'chatbridge',
      version: 1,
      // сохраняем всё состояние, кроме функций
      partialize: (s) => ({
        account: s.account,
        chats: s.chats,
        messages: s.messages,
        unread: s.unread,
        activeChatId: s.activeChatId,
      }),
    },
  ),
)
