// Benchmarks RatingDiffMinimizerEngine.pair() across increasing player counts.
// Run with: npx tsx scripts/bench-rating-diff-minimizer.ts
//
// The engine brute-forces every perfect matching ((n-1)!! of them), so
// runtime grows super-exponentially. Sizes are stopped once a run exceeds
// MAX_MS, since larger sizes will only be slower.

import {RatingDiffMinimizerEngine} from '../lib/pairing/ratingDiffMinimizer'
import type {PairingInput} from '../lib/pairing/types'

const MAX_MS = 30_000
const SIZES = [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24]

function makeEntries(n: number): PairingInput[] {
  const entries: PairingInput[] = []
  for (let i = 0; i < n; i++) {
    entries.push({
      entryId: i + 1,
      uscfId: String(i + 1),
      name: `Player ${i + 1}`,
      rating: 500 + Math.floor(Math.random() * 2000),
      team: null,
    })
  }
  return entries
}

const engine = new RatingDiffMinimizerEngine()

for (const n of SIZES) {
  const entries = makeEntries(n)
  const start = performance.now()
  engine.pair(entries, {higherSeedColor: 'white'})
  const ms = performance.now() - start

  console.log(`n=${n.toString().padStart(2)}  ${ms.toFixed(1)} ms`)

  if (ms > MAX_MS) {
    console.log(`Stopping: exceeded ${MAX_MS}ms at n=${n}`)
    break
  }
}
