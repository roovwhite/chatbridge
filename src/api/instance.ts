import type { Account } from './client'
import type { WhatsAppApi } from './whatsapp'

import { createClient } from './client'
import { createWhatsAppApi } from './whatsapp'

// Один экземпляр API на набор данных аккаунта, чтобы не пересоздавать клиент
// при каждой отправке, проверке настроек и запуске цикла получения.
let cached: { key: string; api: WhatsAppApi } | null = null

export function getWhatsAppApi(account: Account): WhatsAppApi {
  const key = `${account.apiUrl}|${account.idInstance}|${account.apiTokenInstance}`
  if (cached?.key !== key) {
    cached = { key, api: createWhatsAppApi(createClient(account)) }
  }
  return cached.api
}
