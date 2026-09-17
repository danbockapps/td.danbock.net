import {getDueColor} from './dueColor'
import type {
  PairingEngine,
  PairingInput,
  PairingOptions,
  PairingResult,
  RoundHistoryEntry,
} from './types'

const UNRATED_DEFAULT = 100

const ratingOf = (entry: PairingInput): number => entry.rating ?? UNRATED_DEFAULT

const pairKey = (a: string, b: string): string => [a, b].sort().join('|')

function opposite(color: 'white' | 'black'): 'white' | 'black' {
  return color === 'white' ? 'black' : 'white'
}

interface SwissEngineOptions {
  // When true, every logged decision is also written to the console as it
  // happens, in addition to being collected in `log`.
  debug?: boolean
}

type Pair = {a: PairingInput; b: PairingInput}

// A basic Swiss pairing engine: groups players by score, pairs top half vs
// bottom half within each score group, avoids rematches and same-team
// pairings (floating players to the next score group when unavoidable), and
// nudges players toward their due color where it doesn't cost legality.
// This intentionally does not implement the full FIDE/USCF Swiss pairing
// rules (acceleration, complex float bookkeeping across many rounds, etc.).
export class SwissEngine implements PairingEngine {
  // Every decision made by the most recent call to `pair`, in order. Cleared
  // at the start of each call, so it always reflects the last run.
  log: string[] = []

  private debug: boolean

  constructor(options: SwissEngineOptions = {}) {
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

    const scores = new Map(entries.map((e) => [e.uscfId, scoreOf(e)]))
    for (const entry of entries) {
      this.note(`${entry.name} (${entry.uscfId}): score ${scores.get(entry.uscfId)}`)
    }

    let pool = [...entries]

    let byeEntry: PairingInput | null = null
    if (pool.length % 2 !== 0) {
      byeEntry = this.pickByeCandidate(pool, scores, history)
      this.note(`Odd number of players: ${byeEntry.name} receives the bye this round`)
      pool = pool.filter((e) => e !== byeEntry)
    }

    // Group the (now even) pool by score, descending.
    const groupsByScore = new Map<number, PairingInput[]>()
    for (const entry of pool) {
      const score = scores.get(entry.uscfId) ?? 0
      const group = groupsByScore.get(score) ?? []
      group.push(entry)
      groupsByScore.set(score, group)
    }
    const orderedScores = [...groupsByScore.keys()].sort((a, b) => b - a)
    this.note(
      `Formed ${orderedScores.length} score group(s): ` +
        orderedScores.map((s) => `${s} pt (${groupsByScore.get(s)?.length})`).join(', '),
    )

    const previouslyPaired = new Set(
      history
        .filter((h) => h.opponentUscfId !== null)
        .map((h) => pairKey(h.uscfId, h.opponentUscfId as string)),
    )
    const isLegalPair = (a: PairingInput, b: PairingInput): boolean => {
      if (a.team !== null && b.team !== null && a.team === b.team) return false
      if (previouslyPaired.has(pairKey(a.uscfId, b.uscfId))) return false
      return true
    }

    const allPairs: Pair[] = []
    let carryover: PairingInput[] = []

    for (const score of orderedScores) {
      const group = groupsByScore.get(score) ?? []
      const working = [...carryover, ...group].sort((a, b) => ratingOf(b) - ratingOf(a))
      carryover = []

      if (carryover.length === 0 && (group.length > 0 || working.length > 0)) {
        this.note(
          `Score group ${score}: pairing ${working.length} player(s)` +
            (group.length !== working.length
              ? ` (including ${working.length - group.length} floated down from a higher group)`
              : ''),
        )
      }

      if (working.length % 2 !== 0) {
        // Float by actual score first (ties broken by rating) so a player
        // who already floated in from a higher score group isn't floated
        // again just because their rating happens to be low.
        const [floated] = [...working].sort((a, b) => {
          const scoreDiff = (scores.get(a.uscfId) ?? 0) - (scores.get(b.uscfId) ?? 0)
          return scoreDiff !== 0 ? scoreDiff : ratingOf(a) - ratingOf(b)
        })
        this.note(
          `Score group ${score}: odd number of players (${working.length}); floating lowest-scoring, lowest-rated ${floated.name} down to the next group`,
        )
        working.splice(working.indexOf(floated), 1)
        carryover.push(floated)
      }

      const half = working.length / 2
      const top = working.slice(0, half)
      const bottom = working.slice(half)
      const bottomUsed = new Array(bottom.length).fill(false)
      const groupPairs: Pair[] = []

      for (let i = 0; i < top.length; i++) {
        const a = top[i]
        let matchedIndex = -1
        for (let j = 0; j < bottom.length; j++) {
          if (bottomUsed[j]) continue
          if (isLegalPair(a, bottom[j])) {
            matchedIndex = j
            break
          }
        }

        if (matchedIndex === -1) {
          this.note(
            `Score group ${score}: no legal opponent remains for ${a.name} in this group (rematch or same-team conflict with everyone left); floating down to the next group`,
          )
          carryover.push(a)
          continue
        }

        if (matchedIndex !== i) {
          this.note(
            `Score group ${score}: ${a.name} vs board-position opponent was illegal; swapped to pair with ${bottom[matchedIndex].name} instead`,
          )
        }
        bottomUsed[matchedIndex] = true
        groupPairs.push({a, b: bottom[matchedIndex]})
      }

      for (let j = 0; j < bottom.length; j++) {
        if (!bottomUsed[j]) {
          this.note(
            `Score group ${score}: ${bottom[j].name} was left without a legal opponent; floating down to the next group`,
          )
          carryover.push(bottom[j])
        }
      }

      this.applyColorTransposition(groupPairs, history, score, isLegalPair)
      allPairs.push(...groupPairs)
    }

    if (carryover.length > 0) {
      // Extremely rare: floats cascaded all the way through without
      // resolving (e.g. heavy team clustering). Give the leftover player a
      // bye rather than leaving them unpaired.
      for (const leftover of carryover) {
        this.note(
          `${leftover.name} could not be legally paired after all floats; awarding a bye as a last resort`,
        )
      }
      if (!byeEntry) byeEntry = carryover[0]
    }

    const orderedPairs = [...allPairs].sort(
      (x, y) => Math.max(ratingOf(y.a), ratingOf(y.b)) - Math.max(ratingOf(x.a), ratingOf(x.b)),
    )

    const results = orderedPairs.map((pair, index) =>
      this.assignColors(pair, options, history, index + 1),
    )

    if (byeEntry) {
      const board = results.length + 1
      const due = getDueColor(byeEntry.uscfId, history)
      const color = due.color ?? options.higherSeedColor
      this.note(`Assigning board ${board} as ${byeEntry.name}'s bye`)
      results.push({
        board,
        whiteEntryId: color === 'white' ? byeEntry.entryId : null,
        blackEntryId: color === 'black' ? byeEntry.entryId : null,
      })
    }

    return results
  }

  // Picks who sits out when the pool is odd: the lowest-scoring player who
  // hasn't already had a bye, preferring the lowest rating to break ties.
  // Falls back to the lowest-scoring/lowest-rated player overall if
  // everyone in the bottom score group has already had one.
  private pickByeCandidate(
    pool: PairingInput[],
    scores: Map<string, number>,
    history: RoundHistoryEntry[],
  ): PairingInput {
    const hadBye = (uscfId: string): boolean =>
      history.some((h) => h.uscfId === uscfId && h.opponentUscfId === null)

    const byScoreThenRating = [...pool].sort((a, b) => {
      const scoreDiff = (scores.get(a.uscfId) ?? 0) - (scores.get(b.uscfId) ?? 0)
      if (scoreDiff !== 0) return scoreDiff
      return ratingOf(a) - ratingOf(b)
    })

    const withoutPriorBye = byScoreThenRating.find((e) => !hadBye(e.uscfId))
    return withoutPriorBye ?? byScoreThenRating[0]
  }

  // Tries swapping bottom-half partners between pairs of boards within the
  // same score group, keeping a swap only when it's still legal and it
  // increases the number of players who get their due color. Greedy and
  // exhaustive over this (small) group; runs until no improving swap remains.
  private applyColorTransposition(
    groupPairs: Pair[],
    history: RoundHistoryEntry[],
    score: number,
    isLegalPair: (a: PairingInput, b: PairingInput) => boolean,
  ): void {
    const satisfiedCount = (pair: Pair): number => {
      const dueA = getDueColor(pair.a.uscfId, history).color
      const dueB = getDueColor(pair.b.uscfId, history).color
      if (dueA === null && dueB === null) return 0
      if (dueA === null || dueB === null) return 1
      return dueA !== dueB ? 2 : 1
    }

    let improved = true
    while (improved) {
      improved = false

      for (let i = 0; i < groupPairs.length; i++) {
        for (let j = i + 1; j < groupPairs.length; j++) {
          const pairI = groupPairs[i]
          const pairJ = groupPairs[j]
          const swappedI = {a: pairI.a, b: pairJ.b}
          const swappedJ = {a: pairJ.a, b: pairI.b}

          if (!isLegalPair(swappedI.a, swappedI.b) || !isLegalPair(swappedJ.a, swappedJ.b)) {
            this.note(
              `Score group ${score}: considered transposing ${pairI.b.name} and ${pairJ.b.name} for color balance, but it would create an illegal pairing; rejected`,
            )
            continue
          }

          const before = satisfiedCount(pairI) + satisfiedCount(pairJ)
          const after = satisfiedCount(swappedI) + satisfiedCount(swappedJ)

          if (after > before) {
            this.note(
              `Score group ${score}: transposing ${pairI.b.name} and ${pairJ.b.name} raises due-color satisfaction from ${before} to ${after}; applying`,
            )
            groupPairs[i] = swappedI
            groupPairs[j] = swappedJ
            improved = true
          } else {
            this.note(
              `Score group ${score}: considered transposing ${pairI.b.name} and ${pairJ.b.name} for color balance (${before} -> ${after}); no improvement, rejected`,
            )
          }
        }
      }
    }
  }

  private assignColors(
    {a: p1, b: p2}: Pair,
    options: PairingOptions,
    history: RoundHistoryEntry[],
    board: number,
  ): PairingResult {
    const due1 = getDueColor(p1.uscfId, history)
    const due2 = getDueColor(p2.uscfId, history)

    let p1Color: 'white' | 'black'

    if (due1.color === null && due2.color === null) {
      const higherSeedColor =
        board % 2 === 1 ? options.higherSeedColor : opposite(options.higherSeedColor)
      const p1IsHigher = ratingOf(p1) >= ratingOf(p2)
      p1Color = p1IsHigher ? higherSeedColor : opposite(higherSeedColor)
      this.note(
        `Board ${board}: neither ${p1.name} nor ${p2.name} has a due color; ${p1IsHigher ? p1.name : p2.name} (higher rated) gets ${higherSeedColor}`,
      )
    } else if (due1.color === null) {
      p1Color = opposite(due2.color as 'white' | 'black')
      this.note(`Board ${board}: ${p2.name} is due ${due2.color}; ${p1.name} takes ${p1Color}`)
    } else if (due2.color === null) {
      p1Color = due1.color
      this.note(`Board ${board}: ${p1.name} is due ${due1.color}; no conflict`)
    } else if (due1.color !== due2.color) {
      p1Color = due1.color
      this.note(
        `Board ${board}: ${p1.name} due ${due1.color}, ${p2.name} due ${due2.color}; both get their due color`,
      )
    } else {
      const p1GetsDue =
        due1.strength !== due2.strength
          ? due1.strength > due2.strength
          : ratingOf(p1) >= ratingOf(p2)
      p1Color = p1GetsDue ? due1.color : opposite(due1.color)
      this.note(
        `Board ${board}: ${p1.name} and ${p2.name} are both due ${due1.color}; ` +
          `${p1GetsDue ? p1.name : p2.name} wins the conflict (${due1.strength !== due2.strength ? 'longer streak' : 'higher rating tiebreak'})`,
      )
    }

    return {
      board,
      whiteEntryId: p1Color === 'white' ? p1.entryId : p2.entryId,
      blackEntryId: p1Color === 'black' ? p1.entryId : p2.entryId,
    }
  }
}
