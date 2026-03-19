export interface CreateConversationInput {
  type:        'DIRECT' | 'GROUP'
  eventId:     string
  name?:       string
  memberIds:   string[]
}

export interface SendMessageInput {
  content: string
  type?:   'TEXT'
}
