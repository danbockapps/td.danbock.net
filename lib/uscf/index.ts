import {MockUscfLookup} from './mock'
import {OtbfeedUscfLookup} from './otbfeed'
import {OfficialUscfLookup} from './uscf'
import type {UscfLookup} from './types'

export type {UscfLookup, UscfLookupResult} from './types'

export function getUscfLookup(): UscfLookup {
  const provider = process.env.USCF_PROVIDER

  if (provider === 'otbfeed') {
    return new OtbfeedUscfLookup()
  }

  if (provider === 'uscf') {
    return new OfficialUscfLookup()
  }

  return new MockUscfLookup()
}
