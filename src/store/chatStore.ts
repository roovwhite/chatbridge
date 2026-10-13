import type { Account } from '@/api/client'
import type { Chat, ChatMessage, IncomingMessage, MessageStatus } from '@/api/types'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { phoneOf } from '@/api/whatsapp'

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
  // статус из уведомления GREEN-API: понижать статус нельзя (read не станет delivered)
  applyStatus: (chatId: string, idMessage: string, status: MessageStatus) => void
}

// порядок статусов доставки; уведомления могут приходить не по порядку
const STATUS_RANK: Partial<Record<MessageStatus, number>> = { pending: 0, sent: 1, delivered: 2, read: 3 }

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

      applyStatus: (chatId, idMessage, status) =>
        set((s) => {
          const list = s.messages[chatId]
          const target = list?.find((m) => m.id === idMessage && m.direction === 'out')
          if (!list || !target) return s // чужое сообщение или id ещё не подменён после отправки
          const from = STATUS_RANK[target.status]
          const to = STATUS_RANK[status]
          // failed приходит как есть, остальные только вверх по цепочке
          if (status !== 'failed' && from !== undefined && to !== undefined && to <= from) return s
          return {
            messages: {
              ...s.messages,
              [chatId]: list.map((m) => (m.id === idMessage ? { ...m, status } : m)),
            },
          }
        }),

      receiveMessage: (msg) => {
        const s = get()

        const { chatId } = msg

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
