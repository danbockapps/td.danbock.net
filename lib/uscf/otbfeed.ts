import {memberToLookupResult, type Member, type UscfLookup, type UscfLookupResult} from './types'

const API_BASE = 'https://otbfeed.danbock.net/caissa/api/v1'

export class OtbfeedUscfLookup implements UscfLookup {
  async lookup(uscfId: string): Promise<UscfLookupResult> {
    const response = await fetch(`${API_BASE}/members/${uscfId}`)

    if (!response.ok) {
      throw new Error(`otbfeed lookup failed for ${uscfId}: ${response.status}`)
    }

    const member: Member = await response.json()
    return memberToLookupResult(member)
  }
}
