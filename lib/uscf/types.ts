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

export function memberToLookupResult(member: Member): UscfLookupResult {
  const name = `${member.firstName} ${member.lastName}`
  const rating = member.ratings.find((r) => r.ratingSystem === 'R')?.rating ?? null
  return {name, rating}
}
