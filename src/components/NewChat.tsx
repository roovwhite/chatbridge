import type { ChangeEvent, FocusEvent, MouseEvent, SubmitEvent } from 'react'

import { useState } from 'react'

import { phoneToChatId } from '@/api/whatsapp'
import { useChatStore } from '@/store/chatStore'
import { formatRuPhone, parsePhone, PHONE_PLACEHOLDER, PHONE_PREFIX, toApiPhone } from '@/utils/phone'
import { newChatSchema } from '@/validation/forms'

import styles from './NewChat.module.css'

// ставит курсор в конец значения (после «(», пока цифр ещё нет)
function moveCaretToEnd(el: HTMLInputElement) {
  const end = el.value.length
  el.setSelectionRange(end, end)
}

export function NewChat({ onDone }: { onDone: () => void }) {
  const openChat = useChatStore((s) => s.openChat)
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    const next = e.target.value
    const parsed = parsePhone(next)
    const prev = parsePhone(value)
    const deleting = next.length < value.length
    let national = parsed.national

    if (deleting && prev.national.length === 0) {
      // стирается сам префикс «+7 (»: очищаем поле, чтобы снова показался плейсхолдер
      setValue('')
      setError(null)
      return
    }
    // удаление символа маски («)», «-», пробел) не меняет цифры: тогда убираем последнюю цифру,
    // иначе поле тут же вернуло бы символ и курсор «застрял» бы
    if (deleting && national === prev.national) national = national.slice(0, -1)

    setValue(formatRuPhone(national, parsed.started))
    setError(null)
  }

  function onFocus(e: FocusEvent<HTMLInputElement>) {
    const el = e.currentTarget
    // при фокусе сразу подставляем «+7 (»; поле с уже введённой частью номера не трогаем
    if (value === '') setValue(PHONE_PREFIX)
    // браузер ставит курсор по клику уже после фокуса, поэтому переносим его в следующем кадре
    requestAnimationFrame(() => moveCaretToEnd(el))
  }

  function onBlur() {
    // если цифр так и не ввели, возвращаем пустое поле с плейсхолдером
    if (parsePhone(value).national === '') setValue('')
  }

  function onClick(e: MouseEvent<HTMLInputElement>) {
    // пока введён только префикс, курсор не должен оказываться перед «(»
    if (parsePhone(value).national === '') moveCaretToEnd(e.currentTarget)
  }

  function onSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    const result = newChatSchema.safeParse(value)
    if (!result.success) return setError(result.error.issues[0].message)
    openChat(phoneToChatId(toApiPhone(result.data)))
    onDone()
  }

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <input
        name="phone"
        aria-label="Номер телефона получателя"
        className={styles.input}
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        onClick={onClick}
        placeholder={PHONE_PLACEHOLDER}
        type="tel"
        inputMode="tel"
        autoComplete="off"
        autoFocus
      />
      <button className={styles.submit} type="submit">
        Создать чат
      </button>
      {error && <p className={styles.error}>{error}</p>}
    </form>
  )
}
