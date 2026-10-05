import { useState, type FormEvent } from 'react'
import { normalizeChatId } from '../api/max'
import { useChatStore } from '../store/chatStore'
import styles from './NewChat.module.css'

export function NewChat({ onDone }: { onDone: () => void }) {
  const openChat = useChatStore((s) => s.openChat)
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const chatId = normalizeChatId(value)
    if (!chatId) return setError('Введите номер в международном формате, например 79991234567')
    openChat(chatId)
    onDone()
  }

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <input
        className={styles.input}
        value={value}
        onChange={(e) => {
          setValue(e.target.value)
          setError(null)
        }}
        placeholder="Номер телефона получателя"
        inputMode="tel"
        autoFocus
      />
      <button className={styles.submit} type="submit">
        Создать чат
      </button>
      {error && <p className={styles.error}>{error}</p>}
    </form>
  )
}
