import type { InstanceSettings } from '@/api/types'
import type { WhatsAppApi } from '@/api/whatsapp'

import { useEffect, useState } from 'react'

import { getWhatsAppApi } from '@/api/instance'
import { useChatStore } from '@/store/chatStore'

// после проверки повторная ручная недоступна, пока не пройдёт это время (getSettings лимитирован, 429)
const RECHECK_COOLDOWN_MS = 10_000

function describeProblems(settings: InstanceSettings): string[] {
  const found: string[] = []
  if (settings.incomingWebhook !== 'yes') {
    found.push(
      'В настройках инстанса выключены уведомления о входящих сообщениях, поэтому ответы не придут. ' +
        'Включите «Получать уведомления о входящих сообщениях и файлах» в личном кабинете GREEN-API.',
    )
  }
  if (settings.webhookUrl) {
    found.push(
      'У инстанса задан адрес отправки уведомлений (webhookUrl), и получение через HTTP API не работает. ' +
        'Очистите это поле в настройках инстанса.',
    )
  }
  if (
    settings.outgoingWebhook !== 'yes' ||
    settings.outgoingMessageWebhook !== 'yes' ||
    settings.outgoingAPIMessageWebhook !== 'yes'
  ) {
    found.push(
      'Чтобы видеть доставку и прочтение (две галочки), включите в настройках инстанса уведомления ' +
        'о статусах отправленных сообщений, о сообщениях, отправленных с API и с телефона.',
    )
  }
  if (settings.markIncomingMessagesReaded === 'yes') {
    found.push(
      'На инстансе включена автоматическая отметка входящих прочитанными (markIncomingMessagesReaded): ' +
        'собеседник видит «прочитано», даже если вы ещё не открывали чат. Отключите её в настройках инстанса, ' +
        'и приложение будет отмечать чат прочитанным само, когда вы его откроете.',
    )
  }
  return found
}

// null означает, что настройки узнать не удалось (сеть, лимит запросов)
// Параллельные проверки (двойной запуск эффекта в StrictMode) делят один запрос.
let inflight: { key: string; promise: Promise<string[] | null> } | null = null

function loadWarnings(api: WhatsAppApi, key: string): Promise<string[] | null> {
  if (inflight?.key === key) return inflight.promise
  const promise = api
    .getSettings()
    .then(describeProblems)
    .catch(() => null)
    .finally(() => {
      inflight = null
    })
  inflight = { key, promise }
  return promise
}

interface CheckResult {
  key: string
  // номер запрошенной проверки: 0 автоматическая, дальше по кнопке «Проверить снова»
  attempt: number
  warnings: string[]
  failed: boolean
  checkedAt: number
}

// Проверяет настройки инстанса и возвращает список проблем, из-за которых
// ответы не будут приходить (запросы при этом проходят, и без подсказки причина неочевидна).
export function useSettingsWarning() {
  const apiUrl = useChatStore((s) => s.account?.apiUrl)
  const idInstance = useChatStore((s) => s.account?.idInstance)
  const apiTokenInstance = useChatStore((s) => s.account?.apiTokenInstance)
  const [result, setResult] = useState<CheckResult | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const key = `${apiUrl}|${idInstance}|${apiTokenInstance}`

  useEffect(() => {
    if (!apiUrl || !idInstance || !apiTokenInstance) return
    let cancelled = false
    const api = getWhatsAppApi({ apiUrl, idInstance, apiTokenInstance })

    loadWarnings(api, key).then((found) => {
      if (cancelled) return
      const checkedAt = Date.now()
      setNow(checkedAt)
      // при неудачной проверке оставляем прошлые предупреждения: они могли устареть, но лучше, чем ничего
      setResult((prev) => ({
        key,
        attempt,
        checkedAt,
        failed: found === null,
        warnings: found ?? (prev?.key === key ? prev.warnings : []),
      }))
    })

    return () => {
      cancelled = true
    }
  }, [apiUrl, idInstance, apiTokenInstance, key, attempt])

  const current = result?.key === key ? result : null
  const cooldownEndsAt = current ? current.checkedAt + RECHECK_COOLDOWN_MS : 0

  // обратный отсчёт тикает, только пока действует ограничение
  useEffect(() => {
    if (cooldownEndsAt <= Date.now()) return
    const timer = setInterval(() => {
      const t = Date.now()
      setNow(t)
      if (t >= cooldownEndsAt) clearInterval(timer)
    }, 500)
    return () => clearInterval(timer)
  }, [cooldownEndsAt])

  const checking = current?.attempt !== attempt
  const cooldownLeftSec = Math.max(0, Math.ceil((cooldownEndsAt - now) / 1000))

  return {
    warnings: current?.warnings ?? [],
    // последняя проверка не удалась (чаще всего 429), показанные предупреждения могли устареть
    failed: current?.failed ?? false,
    checkedAt: current?.checkedAt ?? null,
    checking,
    // сколько секунд осталось до возможности повторить проверку; 0, если можно
    cooldownLeftSec,
    recheck: () => {
      if (checking || cooldownLeftSec > 0) return
      setAttempt((n) => n + 1)
    },
  }
}
