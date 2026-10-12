import type { MessageStatus } from '@/api/types'

import { Check, CheckCheck, CircleAlert, Clock } from 'lucide-react'

import styles from './MessageTicks.module.css'

// Статус исходящего сообщения: отправляется (часы), отправлено (одна галочка),
// доставлено (две), прочитано (две выделенные), ошибка. Цвет по умолчанию наследуется от родителя.
export function MessageTicks({ status }: { status: MessageStatus }) {
  switch (status) {
    case 'pending':
      return <Clock size={13} className={styles.icon} aria-label="Отправляется" />
    case 'sent':
      return <Check size={15} className={styles.icon} aria-label="Отправлено" />
    case 'delivered':
      return <CheckCheck size={15} className={styles.icon} aria-label="Доставлено" />
    case 'read':
      return <CheckCheck size={15} className={`${styles.icon} ${styles.read}`} aria-label="Прочитано" />
    case 'failed':
      return <CircleAlert size={14} className={`${styles.icon} ${styles.failed}`} aria-label="Не отправлено" />
  }
}
