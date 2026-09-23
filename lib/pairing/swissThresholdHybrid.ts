import {RatingDiffMinimizerEngine} from './ratingDiffMinimizer'
import {SwissEngine} from './swiss'
import type {PairingEngine, PairingInput, PairingOptions, PairingResult} from './types'

interface SwissThresholdHybridEngineOptions {
  // How many points below the tournament leader a player can be and still
  // require a Swiss pairing. E.g. a leader on 3 points with threshold 1
  // means everyone on 2+ points is Swiss-eligible.
  threshold: number
}

// Pairs the top of the field (players within `threshold` points of the
// leader) with SwissEngine, for tournament fairness, and everyone else with
// RatingDiffMinimizerEngine, for closer games without caring about
// standings. Reuses both engines unmodified: it runs a full Swiss pairing
// over the entire field first (Swiss is cheap; the discarded portion of its
// output is fine to throw away), keeps whichever boards involve at least one
// Swiss-eligible player, and re-pairs everyone else with the rating
// difference minimizer. This naturally reproduces the "pull in extra
// players" behavior the threshold rule requires: if Swiss had to float an
// eligible player down several score groups to avoid a rematch, that
// player's board - and whoever they ended up paired with - stays intact.
export class SwissThresholdHybridEngine implements PairingEngine {
  private threshold: number

  constructor(options: SwissThresholdHybridEngineOptions) {
    this.threshold = options.threshold
  }

  pair(entries: PairingInput[], options: PairingOptions): PairingResult[] {
    if (entries.length === 0) return []

    const history = options.history ?? []
    const scoreOf = (entry: PairingInput): number =>
      history.filter((h) => h.uscfId === entry.uscfId).reduce((sum, h) => sum + (h.points ?? 0), 0)

    const scoreByUscfId = new Map(entries.map((e) => [e.uscfId, scoreOf(e)]))
    const leaderScore = Math.max(...entries.map((e) => scoreByUscfId.get(e.uscfId) ?? 0))
    const cutoff = leaderScore - this.threshold

    const fullSheet = new SwissEngine().pair(entries, options)
    const entryById = new Map(entries.map((e) => [e.entryId, e]))

    const swissBoards: PairingResult[] = []
    const remaining: PairingInput[] = []

    for (const result of fullSheet) {
      if (result.whiteEntryId === null || result.blackEntryId === null) {
        // Byes aren't subject to the cutoff; always keep them.
        swissBoards.push(result)
        continue
      }

      const white = entryById.get(result.whiteEntryId)
      const black = entryById.get(result.blackEntryId)
      const eligible =
        (white && (scoreByUscfId.get(white.uscfId) ?? 0) >= cutoff) ||
        (black && (scoreByUscfId.get(black.uscfId) ?? 0) >= cutoff)

      if (eligible) {
        swissBoards.push(result)
      } else {
        if (white) remaining.push(white)
        if (black) remaining.push(black)
      }
    }

    const ratingDiffBoards =
      remaining.length > 0 ? new RatingDiffMinimizerEngine().pair(remaining, options) : []

    return [...swissBoards, ...ratingDiffBoards].map((result, index) => ({
      ...result,
      board: index + 1,
    }))
  }
}
