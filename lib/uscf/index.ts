import {MockUscfLookup} from './mock'
import type {UscfLookup} from './types'

export type {UscfLookup, UscfLookupResult} from './types'

export function getUscfLookup(): UscfLookup {
  // Real API implementation TBD once the USCF API shape is known.
  return new MockUscfLookup()
}
