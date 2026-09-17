import {RatingDiffMinimizerEngine} from './ratingDiffMinimizer'
import {RatingOrderEngine} from './ratingOrder'
import {SwissEngine} from './swiss'
import type {PairingEngine} from './types'

export {getDueColor} from './dueColor'
export type {DueColor} from './dueColor'
export {SwissEngine} from './swiss'
export type {
  PairingEngine,
  PairingInput,
  PairingOptions,
  PairingResult,
  RoundHistoryEntry,
} from './types'

const engines: Record<string, () => PairingEngine> = {
  ratingOrder: () => new RatingOrderEngine(),
  ratingDiffMinimizer: () => new RatingDiffMinimizerEngine(),
  swiss: () => new SwissEngine({debug: process.env.LOG_LEVEL === '1'}),
}

export function getPairingEngine(name: string = 'ratingDiffMinimizer'): PairingEngine {
  const factory = engines[name]
  if (!factory) throw new Error(`Unknown pairing engine: ${name}`)
  return factory()
}
