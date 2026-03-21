export interface CreateBookingInput {
  eventId:    string
  sectionId:  string
  participants?: string[] // additional userIds (group booking)
}

export interface CancelBookingInput {
  reason?: string
}
