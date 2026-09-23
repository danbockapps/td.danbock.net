import {RatingDiffMinimizerEngine} from './ratingDiffMinimizer'
import {RatingOrderEngine} from './ratingOrder'
import {SwissEngine} from './swiss'
import {SwissThresholdHybridEngine} from './swissThresholdHybrid'
import type {PairingEngine} from './types'

export {getDueColor} from './dueColor'
export type {DueColor} from './dueColor'
export {SwissEngine} from './swiss'
export {SwissThresholdHybridEngine} from './swissThresholdHybrid'
export type {
  PairingEngine,
  PairingInput,
  PairingOptions,
  PairingResult,
  RoundHistoryEntry,
} from './types'

interface PairingEngineConfig {
  // Points within the tournament leader a player can be and still require a
  // Swiss pairing, used by the 'swissHybrid' engine.
  swissThreshold?: number
}

const engines: Record<string, (config?: PairingEngineConfig) => PairingEngine> = {
  ratingOrder: () => new RatingOrderEngine(),
  ratingDiffMinimizer: () => new RatingDiffMinimizerEngine(),
  swiss: () => new SwissEngine({debug: process.env.LOG_LEVEL === '1'}),
  swissHybrid: (config) =>
    new SwissThresholdHybridEngine({
      threshold: config?.swissThreshold ?? 0,
      debug: process.env.LOG_LEVEL === '1',
    }),
}

export function getPairingEngine(
  name: string = 'ratingDiffMinimizer',
  config?: PairingEngineConfig,
): PairingEngine {
  const factory = engines[name]
  if (!factory) throw new Error(`Unknown pairing engine: ${name}`)
  return factory(config)
}
