export type InstanceState =
  | 'notAuthorized'
  | 'authorized'
  | 'blocked'
  | 'starting'
  | 'suspended'
  | 'pendingPassword'

export type MessageStatus = 'pending' | 'sent' | 'failed'

export interface ChatMessage {
  id: string
  chatId: string
  text: string
  direction: 'in' | 'out'
  timestamp: number // ms
  status: MessageStatus
}

export interface Chat {
  id: string
  name: string
  // телефон хранится, чтобы связать исходящий чат (79991234567@c.us)
  // с числовым chatId, который MAX присылает во входящих уведомлениях
  phone?: string
}

export interface IncomingMessage {
  chatId: string
  chatName: string
  senderPhone?: string
  idMessage: string
  text: string
  timestamp: number // ms
}

// Результат receiveNotification, уже приведённый к нашему формату.
// "ignored" означает любой тип уведомления, который мы не показываем; его всё равно нужно удалить.
export type IncomingEvent =
  | { receiptId: number; kind: 'message'; message: IncomingMessage }
  | { receiptId: number; kind: 'ignored' }

export interface RawNotification {
  receiptId: number
  body: {
    typeWebhook: string
    timestamp?: number
    idMessage?: string
    senderData?: {
      chatId: string
      chatName?: string
      senderName?: string
      senderPhoneNumber?: number
    }
    messageData?: {
      typeMessage: string
      textMessageData?: { textMessage: string }
    }
  }
}
