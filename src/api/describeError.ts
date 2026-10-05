import { ApiError } from './client'
import type { InstanceState } from './types'

// Тексты для пользователя; сам ApiError остаётся техническим.
export function describeError(e: unknown): string {
  if (!(e instanceof ApiError)) return 'Что-то пошло не так'
  switch (e.kind) {
    case 'auth':
      return 'Неверные idInstance или apiTokenInstance'
    case 'quota':
      return 'Исчерпана квота тарифа GREEN-API'
    case 'rate_limit':
      return 'Слишком много запросов, повторите чуть позже'
    case 'network':
      return 'Нет соединения с GREEN-API'
    case 'timeout':
      return 'GREEN-API не отвечает'
    case 'server':
      return 'Ошибка на стороне GREEN-API'
    case 'parse':
      return 'Некорректный ответ сервера'
    case 'client':
      return typeof e.body === 'string' && e.body.includes('custom webhook url')
        ? 'У инстанса задан webhookUrl, очистите его в настройках'
        : `Ошибка запроса (${e.status ?? '?'})`
    default:
      return 'Запрос отменён'
  }
}

export function describeState(state: InstanceState): string {
  switch (state) {
    case 'notAuthorized':
      return 'Инстанс не авторизован: войдите в MAX через личный кабинет GREEN-API'
    case 'blocked':
      return 'Аккаунт MAX заблокирован'
    case 'starting':
      return 'Инстанс запускается, попробуйте через несколько минут'
    case 'pendingPassword':
      return 'Инстанс ждёт пароль двухфакторной авторизации'
    case 'suspended':
      return 'Отправка ограничена: сообщения доступны только сохранённым контактам'
    default:
      return state
  }
}
