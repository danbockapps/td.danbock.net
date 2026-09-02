import {getDueColor} from './dueColor'
import type {
  PairingEngine,
  PairingInput,
  PairingOptions,
  PairingResult,
  RoundHistoryEntry,
} from './types'

const UNRATED_DEFAULT = 100

// How many of the lowest-scoring legal pairing sheets to retain, in case a
// future feature wants to show alternatives beyond just the best one.
const TOP_SHEETS_TO_KEEP = 10

type Pair = [PairingInput, PairingInput]

const ratingOf = (entry: PairingInput): number => entry.rating ?? UNRATED_DEFAULT

const pairKey = (a: string, b: string): string => [a, b].sort().join('|')

// All color-agnostic perfect matchings of `entries`, yielded one at a time
// rather than materialized as a list — the number of matchings grows as
// (n-1)!!, so holding them all in memory is infeasible past ~16 entries.
// Fixes the first remaining entry and tries every possible partner for it,
// recursing on the rest.
function* generatePairingSheets(entries: PairingInput[]): Generator<Pair[]> {
  if (entries.length === 0) {
    yield []
    return
  }

  const [first, ...rest] = entries

  for (let i = 0; i < rest.length; i++) {
    const partner = rest[i]
    const remaining = [...rest.slice(0, i), ...rest.slice(i + 1)]
    for (const sheet of generatePairingSheets(remaining)) {
      yield [[first, partner], ...sheet]
    }
  }
}

export class RatingDiffMinimizerEngine implements PairingEngine {
  pair(entries: PairingInput[], options: PairingOptions): PairingResult[] {
    if (entries.length % 2 !== 0) {
      throw new Error('Rating difference minimizer requires an even number of entries')
    }
    if (entries.length === 0) return []

    const history = options.history ?? []
    const previouslyPaired = new Set(
      history
        .filter((h) => h.opponentUscfId !== null)
        .map((h) => pairKey(h.uscfId, h.opponentUscfId as string)),
    )

    const isLegal = (sheet: Pair[]): boolean =>
      sheet.every(([a, b]) => {
        if (a.team !== null && b.team !== null && a.team === b.team) return false
        if (previouslyPaired.has(pairKey(a.uscfId, b.uscfId))) return false
        return true
      })

    const scoreOf = (sheet: Pair[]): number =>
      sheet.reduce((sum, [a, b]) => sum + (ratingOf(a) - ratingOf(b)) ** 2, 0)

    // Keep only the best TOP_SHEETS_TO_KEEP legal sheets seen so far, sorted
    // ascending by score, instead of materializing every legal sheet.
    const topSheets: {sheet: Pair[]; score: number}[] = []

    for (const sheet of generatePairingSheets(entries)) {
      if (!isLegal(sheet)) continue

      const score = scoreOf(sheet)
      if (
        topSheets.length === TOP_SHEETS_TO_KEEP &&
        score >= topSheets[topSheets.length - 1].score
      ) {
        continue
      }

      const insertAt = topSheets.findIndex((entry) => score < entry.score)
      topSheets.splice(insertAt === -1 ? topSheets.length : insertAt, 0, {sheet, score})
      if (topSheets.length > TOP_SHEETS_TO_KEEP) topSheets.pop()
    }

    if (topSheets.length === 0) {
      throw new Error('No legal pairing sheet found for this round')
    }

    const bestSheet = topSheets[0].sheet

    const orderedPairs = [...bestSheet].sort(
      (a, b) => Math.max(ratingOf(b[0]), ratingOf(b[1])) - Math.max(ratingOf(a[0]), ratingOf(a[1])),
    )

    return orderedPairs.map((pair, index) => this.assignColors(pair, options, history, index + 1))
  }

  private assignColors(
    [p1, p2]: Pair,
    options: PairingOptions,
    history: RoundHistoryEntry[],
    board: number,
  ): PairingResult {
    const due1 = getDueColor(p1.uscfId, history)
    const due2 = getDueColor(p2.uscfId, history)

    let p1Color: 'white' | 'black'

    if (due1.color === null && due2.color === null) {
      // Neither player has a preference: higher-rated player gets the
      // admin's chosen color, alternating board to board, mirroring
      // RatingOrderEngine's default.
      const higherSeedColor =
        board % 2 === 1 ? options.higherSeedColor : opposite(options.higherSeedColor)
      const p1IsHigher = ratingOf(p1) >= ratingOf(p2)
      p1Color = p1IsHigher ? higherSeedColor : opposite(higherSeedColor)
    } else if (due1.color === null) {
      p1Color = opposite(due2.color as 'white' | 'black')
    } else if (due2.color === null) {
      p1Color = due1.color
    } else if (due1.color !== due2.color) {
      // No conflict: each gets their due color.
      p1Color = due1.color
    } else {
      // Conflict: same due color for both. Stronger preference wins; ties
      // go to the higher-rated player.
      const p1GetsDue =
        due1.strength !== due2.strength
          ? due1.strength > due2.strength
          : ratingOf(p1) >= ratingOf(p2)
      p1Color = p1GetsDue ? due1.color : opposite(due1.color)
    }

    return {
      board,
      whiteEntryId: p1Color === 'white' ? p1.entryId : p2.entryId,
      blackEntryId: p1Color === 'black' ? p1.entryId : p2.entryId,
    }
  }
}

function opposite(color: 'white' | 'black'): 'white' | 'black' {
  return color === 'white' ? 'black' : 'white'
}
