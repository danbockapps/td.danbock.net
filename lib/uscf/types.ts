export interface UscfLookupResult {
  name: string
  rating: number | null
}

export interface UscfLookup {
  lookup(uscfId: string): Promise<UscfLookupResult>
}

export interface Member {
  id: string
  firstName: string
  lastName: string
  ratings: {
    rating: number
    ratingSystem: 'R' | 'Q' | 'B' | 'OR' | 'OQ' | 'OB'
  }[]
}
