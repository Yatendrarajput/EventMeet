export type EventCategory = 'COMEDY' | 'MUSIC' | 'THEATER' | 'SPORTS' | 'TECH' | 'ART' | 'FOOD' | 'OTHER'

export interface EventVenue {
  id:    string
  name:  string
  city:  string
  state: string
}

export interface EventSection {
  id:             string
  name:           string
  availableSeats: number
  pricePerSeat:   string
}

export interface Event {
  id:            string
  title:         string
  category:      EventCategory
  status:        string
  startDatetime: string
  endDatetime:   string
  basePrice:     string
  bannerUrl:     string | null
  tags:          string[]
  viewCount:     number
  venue:         EventVenue
  sections:      EventSection[]
  _count:        { availability: number }
}

export interface EventsResponse {
  events: Event[]
  total:  number
  page:   number
  limit:  number
}
