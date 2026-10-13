import { Plus, X } from 'lucide-react'
import { useState } from 'react'

import { useChatStore } from '@/store/chatStore'
import { formatTime } from '@/utils/format'

import { Avatar } from './Avatar'
import styles from './ChatList.module.css'
import { MessageTicks } from './MessageTicks'
import { NewChat } from './NewChat'

export function ChatList() {
  const chats = useChatStore((s) => s.chats)
  const messages = useChatStore((s) => s.messages)
  const unread = useChatStore((s) => s.unread)
  const activeChatId = useChatStore((s) => s.activeChatId)
  const selectChat = useChatStore((s) => s.selectChat)
  const logout = useChatStore((s) => s.logout)
  const [creating, setCreating] = useState(false)

  // сверху чаты с самым свежим сообщением, пустые (только что созданные) выше всех
  const items = Object.values(chats)
    .map((chat) => {
      const list = messages[chat.id] ?? []
      return { chat, last: list[list.length - 1] }
    })
    .sort((a, b) => (b.last?.timestamp ?? Infinity) - (a.last?.timestamp ?? Infinity))

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <div className={styles.titleWrapper}>
          <h1 className={styles.title}>Чаты</h1>
          <div className={styles.subtitle}>Whatsapp</div>
        </div>
        <div className={styles.btnWrapper}>
          <button
            className={styles.add}
            onClick={() => setCreating((v) => !v)}
            aria-label="Новый чат"
            aria-expanded={creating}
          >
            {creating ? <X size={22} /> : <Plus size={22} />}
          </button>
          <button className={styles.logout} onClick={logout}>
            Выйти
          </button>
        </div>
      </div>

      {creating && <NewChat onDone={() => setCreating(false)} />}

      <ul className={styles.list}>
        {items.map(({ chat, last }) => (
          <li key={chat.id}>
            <button
              className={`${styles.item} ${chat.id === activeChatId ? styles.active : ''}`}
              onClick={() => selectChat(chat.id)}
            >
              <Avatar id={chat.id} name={chat.name} />
              <div className={styles.content}>
                <div className={styles.top}>
                  <div className={styles.name}>{chat.name}</div>
                  {last && <span className={styles.time}>{formatTime(last.timestamp)}</span>}
                </div>
                <div className={styles.bottom}>
                  <div className={styles.preview}>
                    {/* статус показывается только у моего последнего сообщения, у входящего его нет */}
                    {last?.direction === 'out' && <MessageTicks status={last.status} />}
                    <span className={styles.previewText}>{last ? last.text : 'Нет сообщений'}</span>
                  </div>
                  {unread[chat.id] > 0 && <span className={styles.badge}>{unread[chat.id]}</span>}
                </div>
              </div>
            </button>
          </li>
        ))}
        {items.length === 0 && !creating && (
          <li className={styles.empty}>Нажмите «+», чтобы начать чат</li>
        )}
      </ul>
    </aside>
  )
}
