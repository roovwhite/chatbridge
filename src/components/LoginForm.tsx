import type { LoginInput, LoginOutput } from '@/validation/forms'
import type { ComponentProps } from 'react'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import { describeError, describeState } from '@/api/describeError'
import { getWhatsAppApi } from '@/api/instance'
import { useChatStore } from '@/store/chatStore'
import { loginSchema } from '@/validation/forms'

import styles from './LoginForm.module.css'

const DEFAULT_API_URL = 'https://api.green-api.com'

// ошибка поля связана с input через aria-describedby и не попадает в его доступное имя
type FieldProps = ComponentProps<'input'> & { id: string; label: string; error?: string }

function Field({ id, label, error, ...inputProps }: FieldProps) {
  const errorId = `${id}-error`
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <input id={id} aria-invalid={!!error} aria-describedby={error ? errorId : undefined} {...inputProps} />
      {error && (
        <small id={errorId} className={styles.error}>
          {error}
        </small>
      )}
    </div>
  )
}

export function LoginForm() {
  const login = useChatStore((s) => s.login)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput, unknown, LoginOutput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { apiUrl: DEFAULT_API_URL, idInstance: '', apiTokenInstance: '' },
  })

  const onSubmit = handleSubmit(async (account) => {
    try {
      // проверяем креды лёгким запросом, а не при первой отправке сообщения
      const state = await getWhatsAppApi(account).getState()
      // suspended и yellowCard: отправка ограничена, но войти и получать сообщения можно
      if (state === 'authorized' || state === 'suspended' || state === 'yellowCard') login(account)
      else setError('root.server', { message: describeState(state) })
    } catch (err) {
      setError('root.server', { message: describeError(err) })
    }
  })

  return (
    <main className={styles.page}>
      <form className={styles.card} onSubmit={onSubmit} noValidate>
        <h1 className={styles.title}>Chat Bridge</h1>
        <p className={styles.hint}>
          Введите данные инстанса из личного кабинета{' '}
          <a href="https://console.green-api.com" target="_blank" rel="noreferrer">
            GREEN-API
          </a>
        </p>

        <Field
          id="login-apiUrl"
          label="apiUrl"
          error={errors.apiUrl?.message}
          autoComplete="off"
          {...register('apiUrl')}
        />
        <Field
          id="login-idInstance"
          label="idInstance"
          error={errors.idInstance?.message}
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          {...register('idInstance')}
        />
        <Field
          id="login-apiTokenInstance"
          label="apiTokenInstance"
          error={errors.apiTokenInstance?.message}
          type="password"
          autoComplete="off"
          {...register('apiTokenInstance')}
        />

        {errors.root?.server && (
          <p className={styles.error} role="alert">
            {errors.root.server.message}
          </p>
        )}

        <button className={styles.submit} type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Проверка...' : 'Войти'}
        </button>
      </form>
    </main>
  )
}
