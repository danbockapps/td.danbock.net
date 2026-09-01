import {RatingDiffMinimizerEngine} from './ratingDiffMinimizer'
import {RatingOrderEngine} from './ratingOrder'
import type {PairingEngine} from './types'

export type {
  PairingEngine,
  PairingInput,
  PairingOptions,
  PairingResult,
  RoundHistoryEntry,
} from './types'
export {getDueColor} from './dueColor'
export type {DueColor, DueColorStrength} from './dueColor'

const engines: Record<string, () => PairingEngine> = {
  ratingOrder: () => new RatingOrderEngine(),
  ratingDiffMinimizer: () => new RatingDiffMinimizerEngine(),
}

export function getPairingEngine(name: string = 'ratingDiffMinimizer'): PairingEngine {
  const factory = engines[name]
  if (!factory) throw new Error(`Unknown pairing engine: ${name}`)
  return factory()
}
