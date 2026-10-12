// Маска российского номера: пользователь видит «+7 (999) 123-45-67», в API уходит «79991234567».

export const PHONE_PLACEHOLDER = '+7 (___) ___-__-__'
// начало маски, которое подставляется при фокусе; курсор встаёт сразу после «(»
export const PHONE_PREFIX = '+7 ('
const NATIONAL_LENGTH = 10

// Разбирает любой ввод (в том числе вставку «8 999 ...», «+7 ...», «999...»)
// на национальную часть из 10 цифр и признак того, что ввод начат.
export function parsePhone(raw: string): { national: string; started: boolean } {
  const digits = raw.replace(/\D/g, '')
  // первая 7 или 8 это код страны (8 в России то же, что +7), его отбрасываем
  const national = /^[78]/.test(digits) ? digits.slice(1) : digits
  return { national: national.slice(0, NATIONAL_LENGTH), started: digits.length > 0 }
}

export function formatRuPhone(national: string, started = national.length > 0): string {
  if (!started) return ''
  let out = `${PHONE_PREFIX}${national.slice(0, 3)}`
  if (national.length > 3) out += `) ${national.slice(3, 6)}`
  if (national.length > 6) out += `-${national.slice(6, 8)}`
  if (national.length > 8) out += `-${national.slice(8, 10)}`
  return out
}

export const isCompleteRuPhone = (national: string) => national.length === NATIONAL_LENGTH

// 10 цифр национальной части -> «79991234567»
export const toApiPhone = (national: string) => `7${national}`
