import type { InstanceSettings } from '@/api/types'
import type { WhatsAppApi } from '@/api/whatsapp'

import { useEffect, useState } from 'react'

import { getWhatsAppApi } from '@/api/instance'
import { useChatStore } from '@/store/chatStore'

// getSettings у GREEN-API ограничен по частоте (429): автоматическая проверка при загрузке
// кэшируется на минуту. Ручная («Проверить снова») всегда делает реальный запрос,
// но параллельные запросы схлопываются в один.
const AUTO_MAX_AGE_MS = 60_000
// после проверки повторная ручная недоступна, пока не пройдёт это время
const RECHECK_COOLDOWN_MS = 10_000

interface CacheEntry {
  key: string
  at: number
  pending: boolean
  promise: Promise<string[] | null>
}

let cache: CacheEntry | null = null

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
function loadWarnings(api: WhatsAppApi, key: string, maxAgeMs: number): Promise<string[] | null> {
  if (cache && cache.key === key && (cache.pending || Date.now() - cache.at < maxAgeMs)) {
    return cache.promise
  }
  const entry: CacheEntry = { key, at: Date.now(), pending: true, promise: Promise.resolve(null) }
  entry.promise = api
    .getSettings()
    .then(describeProblems)
    .catch(() => null)
    .finally(() => {
      entry.pending = false
    })
  cache = entry
  return entry.promise
}

// Проверяет настройки инстанса и возвращает список проблем, из-за которых
// ответы не будут приходить (запросы при этом проходят, и без подсказки причина неочевидна).
export function useSettingsWarning() {
  const apiUrl = useChatStore((s) => s.account?.apiUrl)
  const idInstance = useChatStore((s) => s.account?.idInstance)
  const apiTokenInstance = useChatStore((s) => s.account?.apiTokenInstance)
  const [warnings, setWarnings] = useState<string[]>([])
  const [failed, setFailed] = useState(false)
  const [checkedAt, setCheckedAt] = useState<number | null>(null)
  // номер запрошенной проверки: 0 автоматическая, дальше по кнопке «Проверить снова»
  const [attempt, setAttempt] = useState(0)
  // номер последней завершённой; пока он отличается от attempt, проверка идёт
  const [doneAttempt, setDoneAttempt] = useState(-1)

  useEffect(() => {
    if (!apiUrl || !idInstance || !apiTokenInstance) return
    let cancelled = false
    const api = getWhatsAppApi({ apiUrl, idInstance, apiTokenInstance })
    const key = `${apiUrl}|${idInstance}`

    loadWarnings(api, key, attempt > 0 ? 0 : AUTO_MAX_AGE_MS).then((found) => {
      if (cancelled) return
      setFailed(found === null)
      if (found) setWarnings(found)
      setCheckedAt(Date.now())
      setDoneAttempt(attempt)
    })

    return () => {
      cancelled = true
    }
  }, [apiUrl, idInstance, apiTokenInstance, attempt])

  // текущее время для обратного отсчёта; тикает, только пока действует ограничение
  const [now, setNow] = useState(() => Date.now())
  const cooldownEndsAt = checkedAt === null ? 0 : checkedAt + RECHECK_COOLDOWN_MS

  useEffect(() => {
    if (cooldownEndsAt <= Date.now()) return
    const timer = setInterval(() => {
      const t = Date.now()
      setNow(t)
      if (t >= cooldownEndsAt) clearInterval(timer)
    }, 500)
    return () => clearInterval(timer)
  }, [cooldownEndsAt])

  const checking = doneAttempt !== attempt
  // верхний предел нужен, пока now не обновился после завершения проверки (иначе мелькнёт лишнее)
  const cooldownLeftSec = Math.min(
    Math.ceil(RECHECK_COOLDOWN_MS / 1000),
    Math.max(0, Math.ceil((cooldownEndsAt - now) / 1000)),
  )

  return {
    warnings,
    // последняя проверка не удалась (чаще всего 429), показанные предупреждения могли устареть
    failed,
    checkedAt,
    checking,
    // сколько секунд осталось до возможности повторить проверку; 0, если можно
    cooldownLeftSec,
    recheck: () => {
      // повторное нажатие до окончания паузы или во время проверки ничего не делает
      if (checking || cooldownLeftSec > 0) return
      setAttempt((n) => n + 1)
    },
  }
}
