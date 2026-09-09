import type {Member, UscfLookup, UscfLookupResult} from './types'

const API_BASE = 'https://ratings-api.uschess.org/api/v2'

export class OfficialUscfLookup implements UscfLookup {
  async lookup(uscfId: string): Promise<UscfLookupResult> {
    const apiKey = process.env.USCF_API_KEY

    if (!apiKey) {
      throw new Error('USCF_API_KEY is not set')
    }

    const response = await fetch(`${API_BASE}/members/${uscfId}`, {
      headers: {
        accept: 'application/json',
        'x-api-key': apiKey,
      },
    })

    if (!response.ok) {
      throw new Error(`uscf lookup failed for ${uscfId}: ${response.status}`)
    }

    const member: Member = await response.json()
    const name = `${member.firstName} ${member.lastName}`
    const rating = member.ratings.find((r) => r.ratingSystem === 'R')?.rating ?? null

    return {name, rating}
  }
}
