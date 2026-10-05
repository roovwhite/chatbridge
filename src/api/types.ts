export type InstanceState =
  | 'notAuthorized'
  | 'authorized'
  | 'blocked'
  | 'starting'
  | 'suspended'
  | 'sleepMode' // устаревший статус: телефон офлайн
  | 'yellowCard' // устаревший статус, заменён на suspended

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
}

export interface IncomingMessage {
  chatId: string
  chatName: string
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
      senderContactName?: string
    }
    messageData?: {
      typeMessage: string
      textMessageData?: { textMessage: string }
      extendedTextMessageData?: { text: string }
    }
  }
}
