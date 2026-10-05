import { describeError } from './api/describeError'
import { ChatList } from './components/ChatList'
import { ChatWindow } from './components/ChatWindow'
import { LoginForm } from './components/LoginForm'
import { useReceiver } from './hooks/useReceiver'
import { useChatStore } from './store/chatStore'
import styles from './App.module.css'

export default function App() {
  const account = useChatStore((s) => s.account)
  const activeChatId = useChatStore((s) => s.activeChatId)
  // хук сам ничего не делает, пока нет account
  const receiverError = useReceiver()

  if (!account) return <LoginForm />

  return (
    <div className={styles.layout}>
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
