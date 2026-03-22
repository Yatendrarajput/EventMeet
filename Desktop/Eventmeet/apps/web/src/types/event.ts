export type EventCategory = 'COMEDY' | 'MUSIC' | 'THEATER' | 'SPORTS' | 'TECH' | 'ART' | 'FOOD' | 'OTHER'

export interface EventVenue {
  id:            string
  name:          string
  addressLine1:  string
  addressLine2?: string | null
  city:          string
  state:         string
  pincode?:      string | null
  googleMapsUrl?:string | null
}

export interface EventSection {
  id:             string
  name:           string
  totalSeats:     number
  availableSeats: number
  pricePerSeat:   string
  displayOrder:   number
}

export interface EventCreator {
  id:        string
  fullName:  string
  avatarUrl: string | null
}

export interface AvailableUser {
  id:        string
  fullName:  string
  avatarUrl: string | null
  note:      string | null
}

export interface Event {
  id:            string
  title:         string
  description:   string | null
  category:      EventCategory
  status:        string
  startDatetime: string
  endDatetime:   string
  doorsOpenAt:   string | null
  basePrice:     string
  bannerUrl:     string | null
  images:        string[]
  tags:          string[]
  viewCount:     number
  venue:         EventVenue
  creator:       EventCreator
  sections:      EventSection[]
  _count:        { availability: number; bookings: number }
}

export interface EventsResponse {
  data:       Event[]
  pagination: { page: number; limit: number; total: number; hasMore: boolean }
}
