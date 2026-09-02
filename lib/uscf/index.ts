import {MockUscfLookup} from './mock'
import {OtbfeedUscfLookup} from './otbfeed'
import type {UscfLookup} from './types'

export type {UscfLookup, UscfLookupResult} from './types'

export function getUscfLookup(): UscfLookup {
  const provider = process.env.USCF_PROVIDER

  if (provider === 'otbfeed') {
    return new OtbfeedUscfLookup()
  }

  return new MockUscfLookup()
}
