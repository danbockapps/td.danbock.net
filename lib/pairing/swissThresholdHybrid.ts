import {RatingDiffMinimizerEngine} from './ratingDiffMinimizer'
import {SwissEngine} from './swiss'
import type {PairingEngine, PairingInput, PairingOptions, PairingResult} from './types'

interface SwissThresholdHybridEngineOptions {
  // How many points below the tournament leader a player can be and still
  // require a Swiss pairing. E.g. a leader on 3 points with threshold 1
  // means everyone on 2+ points is Swiss-eligible.
  threshold: number

  // When true, every logged decision is also written to the console as it
  // happens, in addition to being collected in `log`.
  debug?: boolean
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
  // Every decision made by the most recent call to `pair`, in order. Cleared
  // at the start of each call, so it always reflects the last run.
  log: string[] = []

  private threshold: number
  private debug: boolean

  constructor(options: SwissThresholdHybridEngineOptions) {
    this.threshold = options.threshold
    this.debug = options.debug ?? false
  }

  private note(line: string): void {
    this.log.push(line)
    if (this.debug) console.log(line)
  }

  pair(entries: PairingInput[], options: PairingOptions): PairingResult[] {
    this.log = []
    if (entries.length === 0) return []

    const history = options.history ?? []
    const scoreOf = (entry: PairingInput): number =>
      history.filter((h) => h.uscfId === entry.uscfId).reduce((sum, h) => sum + (h.points ?? 0), 0)

    const scoreByUscfId = new Map(entries.map((e) => [e.uscfId, scoreOf(e)]))
    const leaderScore = Math.max(...entries.map((e) => scoreByUscfId.get(e.uscfId) ?? 0))
    const cutoff = leaderScore - this.threshold
    this.note(
      `Leader score is ${leaderScore}; threshold ${this.threshold} means players scoring ${cutoff}+ are Swiss-eligible`,
    )

    const swissEngine = new SwissEngine({debug: this.debug})
    const fullSheet = swissEngine.pair(entries, options)
    this.log.push(...swissEngine.log.map((line) => `[swiss] ${line}`))
    const entryById = new Map(entries.map((e) => [e.entryId, e]))

    const swissBoards: PairingResult[] = []
    const remaining: PairingInput[] = []

    for (const result of fullSheet) {
      if (result.whiteEntryId === null || result.blackEntryId === null) {
        // Byes aren't subject to the cutoff; always keep them.
        const byeEntry = entryById.get(result.whiteEntryId ?? result.blackEntryId ?? -1)
        this.note(`Keeping ${byeEntry?.name ?? 'unknown player'}'s bye as-is`)
        swissBoards.push(result)
        continue
      }

      const white = entryById.get(result.whiteEntryId)
      const black = entryById.get(result.blackEntryId)
      const eligible =
        (white && (scoreByUscfId.get(white.uscfId) ?? 0) >= cutoff) ||
        (black && (scoreByUscfId.get(black.uscfId) ?? 0) >= cutoff)

      if (eligible) {
        this.note(
          `Keeping Swiss pairing ${white?.name} vs ${black?.name} (score ${scoreByUscfId.get(white?.uscfId ?? '')} vs ${scoreByUscfId.get(black?.uscfId ?? '')})`,
        )
        swissBoards.push(result)
      } else {
        this.note(
          `${white?.name} vs ${black?.name} (score ${scoreByUscfId.get(white?.uscfId ?? '')} vs ${scoreByUscfId.get(black?.uscfId ?? '')}) is below cutoff; sending both to the rating-diff pool`,
        )
        if (white) remaining.push(white)
        if (black) remaining.push(black)
      }
    }

    let ratingDiffBoards: PairingResult[] = []
    if (remaining.length > 0) {
      this.note(
        `Rating-diff pairing ${remaining.length} player(s) below the Swiss cutoff: ${remaining.map((e) => e.name).join(', ')}`,
      )
      ratingDiffBoards = new RatingDiffMinimizerEngine().pair(remaining, options)
    }

    return [...swissBoards, ...ratingDiffBoards].map((result, index) => ({
      ...result,
      board: index + 1,
    }))
  }
}
