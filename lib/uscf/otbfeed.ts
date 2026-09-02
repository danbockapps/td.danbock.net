import type {Member, UscfLookup, UscfLookupResult} from './types'

const API_BASE = 'https://otbfeed.danbock.net/caissa/api/v1'

export class OtbfeedUscfLookup implements UscfLookup {
  async lookup(uscfId: string): Promise<UscfLookupResult> {
    const response = await fetch(`${API_BASE}/members/${uscfId}`)

    if (!response.ok) {
      throw new Error(`otbfeed lookup failed for ${uscfId}: ${response.status}`)
    }

    const member: Member = await response.json()
    const name = `${member.firstName} ${member.lastName}`
    const rating = member.ratings.find((r) => r.ratingSystem === 'R')?.rating ?? null

    return {name, rating}
  }
}
