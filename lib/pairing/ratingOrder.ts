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

      // The higher seed alternates color board to board: the admin's chosen
      // color on board 1, the opposite on board 2, back to the chosen color
      // on board 3, and so on.
      const higherSeedColor =
        board % 2 === 1
          ? options.higherSeedColor
          : options.higherSeedColor === 'white'
            ? 'black'
            : 'white'

      if (!lowerSeed) {
        // Odd player out gets a bye.
        results.push({
          board: board++,
          whiteEntryId: higherSeedColor === 'white' ? higherSeed.entryId : null,
          blackEntryId: higherSeedColor === 'black' ? higherSeed.entryId : null,
        })
        continue
      }

      const higherSeedGetsWhite = higherSeedColor === 'white'
      results.push({
        board: board++,
        whiteEntryId: higherSeedGetsWhite ? higherSeed.entryId : lowerSeed.entryId,
        blackEntryId: higherSeedGetsWhite ? lowerSeed.entryId : higherSeed.entryId,
      })
    }

    return results
  }
}
