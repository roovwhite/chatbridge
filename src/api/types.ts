export type InstanceState =
  | 'notAuthorized'
  | 'authorized'
  | 'blocked'
  | 'starting'
  | 'suspended'
  | 'sleepMode' // устаревший статус: телефон офлайн
  | 'yellowCard' // устаревший статус, заменён на suspended

// только поля getSettings, которые нужны приложению
export interface InstanceSettings {
  webhookUrl: string
  incomingWebhook: 'yes' | 'no'
  // нужны для статусов доставки и прочтения сообщений, отправленных через API
  outgoingWebhook: 'yes' | 'no'
  outgoingMessageWebhook: 'yes' | 'no'
  outgoingAPIMessageWebhook: 'yes' | 'no'
  // «yes»: входящие помечаются прочитанными сразу при получении, собеседник видит «прочитано»
  markIncomingMessagesReaded: 'yes' | 'no'
}

// pending -> sent (одна галочка) -> delivered (две) -> read (две синие); failed вне цепочки
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed'

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
  | { receiptId: number; kind: 'status'; chatId: string; idMessage: string; status: MessageStatus }
  | { receiptId: number; kind: 'ignored' }

export interface RawNotification {
  receiptId: number
  body: {
    typeWebhook: string
    timestamp?: number
    idMessage?: string
    // у outgoingMessageStatus chatId и status лежат на верхнем уровне
    chatId?: string
    status?: string
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
