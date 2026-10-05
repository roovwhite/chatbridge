import { useState, type FormEvent } from 'react'
import { createClient } from '../api/client'
import { describeError, describeState } from '../api/describeError'
import { createMaxApi } from '../api/max'
import { useChatStore } from '../store/chatStore'
import styles from './LoginForm.module.css'

const DEFAULT_API_URL = 'https://api.green-api.com'

export function LoginForm() {
  const login = useChatStore((s) => s.login)
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL)
  const [idInstance, setIdInstance] = useState('')
  const [apiTokenInstance, setApiTokenInstance] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const account = {
      apiUrl: apiUrl.trim(),
      idInstance: idInstance.trim(),
      apiTokenInstance: apiTokenInstance.trim(),
    }
    if (!/^https?:\/\/\S+$/.test(account.apiUrl)) return setError('Укажите корректный apiUrl')
    if (!/^\d+$/.test(account.idInstance)) return setError('idInstance состоит только из цифр')
    if (!account.apiTokenInstance) return setError('Введите apiTokenInstance')

    setLoading(true)
    setError(null)
    try {
      // проверяем креды лёгким запросом, а не при первой отправке сообщения
      const state = await createMaxApi(createClient(account)).getState()
      if (state === 'authorized' || state === 'suspended') login(account)
      else setError(describeState(state))
    } catch (err) {
      setError(describeError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className={styles.page}>
      <form className={styles.card} onSubmit={onSubmit} noValidate>
        <h1 className={styles.title}>chatbridge</h1>
        <p className={styles.hint}>
          Введите данные инстанса из личного кабинета{' '}
          <a href="https://console.green-api.com" target="_blank" rel="noreferrer">
            GREEN-API
          </a>
        </p>

        <label className={styles.field}>
          <span>idInstance</span>
          <input
            value={idInstance}
            onChange={(e) => setIdInstance(e.target.value)}
            inputMode="numeric"
            autoComplete="off"
            autoFocus
          />
        </label>

        <label className={styles.field}>
          <span>apiTokenInstance</span>
          <input
            type="password"
            value={apiTokenInstance}
            onChange={(e) => setApiTokenInstance(e.target.value)}
            autoComplete="off"
          />
        </label>

        <label className={styles.field}>
          <span>apiUrl</span>
          <input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} autoComplete="off" />
        </label>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <button className={styles.submit} type="submit" disabled={loading}>
          {loading ? 'Проверка...' : 'Войти'}
        </button>
      </form>
    </main>
  )
}
