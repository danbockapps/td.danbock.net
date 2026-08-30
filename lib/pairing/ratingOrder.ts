import type {PairingEngine, PairingInput, PairingOptions, PairingResult} from './types'

// Unrated players (rating: null) sort to the bottom of the seeding order.
export class RatingOrderEngine implements PairingEngine {
  pair(entries: PairingInput[], options: PairingOptions): PairingResult[] {
    const sorted = [...entries].sort((a, b) => {
      if (a.rating === b.rating) return 0
      if (a.rating === null) return 1
      if (b.rating === null) return -1
      return b.rating - a.rating
    })

    const results: PairingResult[] = []
    let board = 1

    for (let i = 0; i < sorted.length; i += 2) {
      const higherSeed = sorted[i]
      const lowerSeed = sorted[i + 1]

      if (!lowerSeed) {
        // Odd player out gets a bye.
        results.push({
          board: board++,
          whiteEntryId: options.higherSeedColor === 'white' ? higherSeed.entryId : null,
          blackEntryId: options.higherSeedColor === 'black' ? higherSeed.entryId : null,
        })
        continue
      }

      const higherSeedGetsWhite = options.higherSeedColor === 'white'
      results.push({
        board: board++,
        whiteEntryId: higherSeedGetsWhite ? higherSeed.entryId : lowerSeed.entryId,
        blackEntryId: higherSeedGetsWhite ? lowerSeed.entryId : higherSeed.entryId,
      })
    }

    return results
  }
}
