import {RatingOrderEngine} from './ratingOrder'
import type {PairingEngine} from './types'

export type {PairingEngine, PairingInput, PairingOptions, PairingResult} from './types'

export function getPairingEngine(_name?: string): PairingEngine {
  // Registry for future engines (e.g. Swiss); rating-order is the only one for now.
  return new RatingOrderEngine()
}
