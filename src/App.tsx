import { describeError } from '@/api/describeError'
import { ChatList } from '@/components/ChatList'
import { ChatWindow } from '@/components/ChatWindow/ChatWindow.tsx'
import { LoginForm } from '@/components/LoginForm'
import { useReceiver } from '@/hooks/useReceiver'
import { useSettingsWarning } from '@/hooks/useSettingsWarning'
import { useChatStore } from '@/store/chatStore'

import styles from './App.module.css'

const formatClock = (ts: number) =>
  new Date(ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

export default function App() {
  const account = useChatStore((s) => s.account)
  const activeChatId = useChatStore((s) => s.activeChatId)
  // хук сам ничего не делает, пока нет account
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
            {/* без этого повторная проверка с тем же результатом выглядит как «ничего не произошло» */}
            {checkedAt && !checking && (
              <p className={styles.checked}>
                {failed
                  ? 'Не удалось проверить (возможно, лимит запросов), попробуйте через минуту. '
                  : 'Настройки пока не изменились. '}
                Проверено в {formatClock(checkedAt)}
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
