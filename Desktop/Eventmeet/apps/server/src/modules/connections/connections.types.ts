export interface SendConnectionRequestInput {
  message?: string
  isQuickConnect?: boolean
}

export interface ConnectionListQuery {
  page?:  number
  limit?: number
}
