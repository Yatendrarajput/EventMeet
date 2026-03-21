export interface CreateRatingInput {
  ratedUserId: string
  eventId:     string
  bookingId:   string
  score:       number        // 1–5
  tags?:       string[]
  review?:     string
}
