export interface EventListQuery {
  city?: string
  category?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
}

export interface CreateEventInput {
  title: string
  description?: string
  category: string
  venueId: string
  startDatetime: string
  endDatetime: string
  doorsOpenAt?: string
  basePrice: number
  bannerUrl?: string
  tags?: string[]
  sections: CreateSectionInput[]
}

export interface CreateSectionInput {
  name: string
  totalSeats: number
  pricePerSeat?: number
  displayOrder?: number
}

export interface UpdateEventInput {
  title?: string
  description?: string
  status?: string
  startDatetime?: string
  endDatetime?: string
  doorsOpenAt?: string
  basePrice?: number
  bannerUrl?: string
  tags?: string[]
  cancellationReason?: string
}

export interface SetAvailabilityInput {
  note?: string
}
