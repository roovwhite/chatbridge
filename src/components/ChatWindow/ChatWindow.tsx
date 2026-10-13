import { ChevronLeft } from 'lucide-react'
import { useEffect, useRef } from 'react'

import { Avatar } from '@/components/Avatar'
import { MessageInput } from '@/components/MessageInput'
import { MessageTicks } from '@/components/MessageTicks'
import { useMarkChatRead } from '@/hooks/useMarkChatRead'
import { useSendMessage } from '@/hooks/useSendMessage'
import { useChatStore } from '@/store/chatStore'
import { formatTime } from '@/utils/format'

import styles from './ChatWindow.module.css'

export function ChatWindow({ chatId }: { chatId: string }) {
  const chat = useChatStore((s) => s.chats[chatId])
  const messages = useChatStore((s) => s.messages[chatId])
  const selectChat = useChatStore((s) => s.selectChat)
  const { send, retry } = useSendMessage()
  const bottomRef = useRef<HTMLDivElement>(null)
  // отметка «прочитано» уходит в WhatsApp, когда чат открыт и вкладка на виду
  useMarkChatRead(chatId, messages?.findLast((m) => m.direction === 'in')?.id)

  // прокрутка вниз при новых сообщениях и при открытии чата
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages?.length, chatId])

  if (!chat) return null

  return (
    <section className={styles.window}>
      <header className={styles.header}>
        <button className={styles.back} onClick={() => selectChat(null)} aria-label="Назад">
          <ChevronLeft size={28} />
        </button>
        <Avatar id={chat.id} name={chat.name} size={44} />
        <div className={styles.name}>{chat.name}</div>
      </header>

      <div className={styles.messages}>
        {(messages ?? []).map((m) => (
          <div key={m.id} className={`${styles.row} ${m.direction === 'out' ? styles.out : ''}`}>
            <div className={`${styles.bubble} ${m.direction === 'out' ? styles.bubbleOut : ''}`}>
              <span className={styles.text}>{m.text}</span>
              <span className={styles.meta}>
                {formatTime(m.timestamp)}
                {m.direction === 'out' && <MessageTicks status={m.status} />}
              </span>
            </div>
            {m.status === 'failed' && (
              <button className={styles.retry} onClick={() => retry(chatId, m.id, m.text)}>
                Не отправлено. Повторить
              </button>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <MessageInput onSend={(text) => send(chatId, text)} />
    </section>
  )
}
