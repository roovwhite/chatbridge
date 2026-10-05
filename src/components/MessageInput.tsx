import { useState, type KeyboardEvent } from 'react'
import styles from './MessageInput.module.css'

// лимит текста одного сообщения в GREEN-API
const MAX_LENGTH = 4000

export function MessageInput({ onSend }: { onSend: (text: string) => void }) {
  const [text, setText] = useState('')

  function submit() {
    const trimmed = text.trim()
    if (!trimmed) return
    onSend(trimmed)
    setText('')
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter отправляет, Shift+Enter переносит строку; isComposing не даёт отправить во время ввода через IME
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className={styles.wrap}>
      <textarea
        className={styles.input}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Сообщение"
        rows={1}
        maxLength={MAX_LENGTH}
        autoFocus
      />
      <button className={styles.send} onClick={submit} disabled={!text.trim()} aria-label="Отправить">
        ➤
      </button>
    </div>
  )
}
