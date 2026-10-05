import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Account } from '../api/client'
import type { Chat, ChatMessage, IncomingMessage } from '../api/types'

interface ChatState {
  account: Account | null
  chats: Record<string, Chat>
  messages: Record<string, ChatMessage[]>
  unread: Record<string, number>
  // числовой chatId MAX -> id чата, созданного по номеру телефона (79991234567@c.us)
  aliases: Record<string, string>
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

// «79991234567@c.us» -> «79991234567», для числового chatId возвращает undefined
const phoneOf = (chatId: string) => chatId.match(/^(\d+)@c\.us$/)?.[1]

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      account: null,
      chats: {},
      messages: {},
      unread: {},
      aliases: {},
      activeChatId: null,

      login: (account) => set({ account }),

      // креды и вся локальная история удаляются вместе, чтобы не смешивать разные инстансы
      logout: () =>
        set({ account: null, chats: {}, messages: {}, unread: {}, aliases: {}, activeChatId: null }),

      openChat: (chatId) =>
        set((s) => ({
          chats: s.chats[chatId]
            ? s.chats
            : { ...s.chats, [chatId]: { id: chatId, name: phoneOf(chatId) ?? chatId, phone: phoneOf(chatId) } },
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

        // определяем «родной» id чата: известный алиас, чат с таким же телефоном или сам chatId
        let chatId = s.aliases[msg.chatId] ?? msg.chatId
        let aliases = s.aliases
        if (!s.chats[chatId] && msg.senderPhone) {
          const byPhone = Object.values(s.chats).find((c) => c.phone === msg.senderPhone)
          if (byPhone) {
            chatId = byPhone.id
            aliases = { ...aliases, [msg.chatId]: chatId }
          }
        }

        // повторная доставка того же уведомления (например, не дошёл deleteNotification)
        if (s.messages[chatId]?.some((m) => m.id === msg.idMessage)) return

        const chat: Chat = s.chats[chatId] ?? {
          id: chatId,
          name: msg.chatName,
          phone: msg.senderPhone,
        }
        const message: ChatMessage = {
          id: msg.idMessage,
          chatId,
          text: msg.text,
          direction: 'in',
          timestamp: msg.timestamp,
          status: 'sent',
        }
        set({
          aliases,
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
        aliases: s.aliases,
        activeChatId: s.activeChatId,
      }),
    },
  ),
)
