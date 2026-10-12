import { z } from 'zod/mini'

import { isCompleteRuPhone, parsePhone, PHONE_PLACEHOLDER } from '@/utils/phone'

export const loginSchema = z.object({
  apiUrl: z.string().check(z.trim(), z.regex(/^https?:\/\/\S+$/, 'Укажите корректный apiUrl')),
  idInstance: z.string().check(z.trim(), z.regex(/^\d+$/, 'idInstance состоит только из цифр')),
  apiTokenInstance: z.string().check(z.trim(), z.minLength(1, 'Введите apiTokenInstance')),
})

export type LoginInput = z.input<typeof loginSchema>
export type LoginOutput = z.output<typeof loginSchema>

// значение поля с маской -> 10 цифр национальной части
export const newChatSchema = z
  .pipe(
    z.string(),
    z.transform((value) => parsePhone(value).national),
  )
  .check(z.refine(isCompleteRuPhone, `Введите номер полностью: ${PHONE_PLACEHOLDER}`))
