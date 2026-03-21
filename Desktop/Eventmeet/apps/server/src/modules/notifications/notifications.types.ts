export type NotificationType =
  | 'CONNECTION_REQUEST'
  | 'CONNECTION_ACCEPTED'
  | 'GROUP_INVITE'
  | 'BOOKING_INVITE'
  | 'QUEUE_UPDATED'
  | 'SEAT_ASSIGNED'
  | 'BOOKING_CONFIRMED'
  | 'BOOKING_CANCELLED'
  | 'PAYMENT_FAILED'
  | 'EVENT_CANCELLED'
  | 'RATING_REMINDER'
  | 'CREDITS_RECHARGED'
  | 'QUICK_CONNECT_REQUEST'

export interface CreateNotificationInput {
  userId:  string
  type:    NotificationType
  title:   string
  body:    string
  data?:   Record<string, unknown>
  eventId?: string
}
