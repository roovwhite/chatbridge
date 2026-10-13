import { describeError } from '@/api/describeError'
import { ChatList } from '@/components/ChatList'
import { ChatWindow } from '@/components/ChatWindow/ChatWindow'
import { LoginForm } from '@/components/LoginForm'
import { useReceiver } from '@/hooks/useReceiver'
import { useSettingsWarning } from '@/hooks/useSettingsWarning'
import { useChatStore } from '@/store/chatStore'
import { formatTime } from '@/utils/format'

import styles from './App.module.css'

export default function App() {
  const account = useChatStore((s) => s.account)
  const activeChatId = useChatStore((s) => s.activeChatId)
  const receiverError = useReceiver()
  const { warnings, failed, checkedAt, checking, cooldownLeftSec, recheck } = useSettingsWarning()

  if (!account) return <LoginForm />

  return (
    <div className={styles.layout}>
      {warnings.length > 0 && (
        <div className={styles.warning} role="alert">
          <div>
            {warnings.map((w) => (
              <p key={w}>{w}</p>
            ))}
            {checkedAt && !checking && (
              <p className={styles.checked}>
                {failed
                  ? 'Не удалось проверить (возможно, лимит запросов), попробуйте через минуту. '
                  : 'Настройки пока не изменились. '}
                Проверено в {formatTime(checkedAt, true)}
              </p>
            )}
          </div>
          <button
            className={styles.recheck}
            onClick={recheck}
            disabled={checking || cooldownLeftSec > 0}
          >
            {checking
              ? 'Проверяем...'
              : cooldownLeftSec > 0
                ? `Повторить через ${cooldownLeftSec} с`
                : 'Проверить снова'}
          </button>
        </div>
      )}

      {receiverError && receiverError.kind !== 'aborted' && (
        <div className={styles.banner} role="alert">
          {describeError(receiverError)}
          {!receiverError.retryable && ' (получение сообщений остановлено)'}
        </div>
      )}

      {/* на узких экранах показывается либо список, либо чат */}
      <div className={`${styles.body} ${activeChatId ? styles.chatOpen : ''}`}>
        <ChatList />
        {activeChatId ? (
          <ChatWindow chatId={activeChatId} />
        ) : (
          <div className={styles.placeholder}>Выберите чат или создайте новый</div>
        )}
      </div>
    </div>
  )
}
