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
// pairings, and nudges players toward their due color where it doesn't cost
// legality. When a score group has an odd number of players, its
// lowest-scoring/lowest-rated player floats down and plays the
// highest-rated legal opponent in the next group down (rather than being
// merged into that group and re-split), so a float still plays someone near
// the top of their new group instead of drifting toward its bottom half.
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
      let working = [...group].sort((a, b) => ratingOf(b) - ratingOf(a))
      const groupPairs: Pair[] = []

      if (carryover.length > 0) {
        const {pairs: floatPairs, unmatched} = this.matchFloaters(carryover, working, isLegalPair)
        for (const {a: floater, b: opponent} of floatPairs) {
          this.note(
            `${floater.name} floats down from a higher score group and plays ${opponent.name}, the highest-rated available opponent in the ${score} pt group`,
          )
        }
        for (const floater of unmatched) {
          this.note(
            `${floater.name} floated down to the ${score} pt group but has no legal opponent here; floating further`,
          )
        }
        groupPairs.push(...floatPairs)
        const claimed = new Set(floatPairs.map((p) => p.b))
        working = working.filter((p) => !claimed.has(p))
        carryover = unmatched
      }

      if (working.length > 0) {
        this.note(
          `Score group ${score}: pairing ${working.length} remaining player(s) within the group`,
        )
      }

      if (working.length % 2 !== 0) {
        // Float by actual score first (ties broken by rating) so a player
        // who already floated in from a higher score group isn't floated
        // again just because their rating happens to be low. But skip past
        // a candidate whose departure would leave the rest of the group
        // without any legal way to pair off (e.g. the only two players left
        // already played each other), since that just trades one float for
        // a worse cascade of floats once pairing is attempted below.
        const byPriority = [...working].sort((a, b) => {
          const scoreDiff = (scores.get(a.uscfId) ?? 0) - (scores.get(b.uscfId) ?? 0)
          return scoreDiff !== 0 ? scoreDiff : ratingOf(a) - ratingOf(b)
        })
        const floated =
          byPriority.find((candidate) =>
            this.hasPerfectMatching(
              working.filter((p) => p !== candidate),
              isLegalPair,
            ),
          ) ?? byPriority[0]

        if (floated === byPriority[0]) {
          this.note(
            `Score group ${score}: odd number of players (${working.length}); floating lowest-scoring, lowest-rated ${floated.name} down to the next group`,
          )
        } else {
          this.note(
            `Score group ${score}: odd number of players (${working.length}); floating lowest-scoring, lowest-rated ${byPriority[0].name} would leave the rest of the group unable to pair off legally, so floating ${floated.name} instead`,
          )
        }
        working.splice(working.indexOf(floated), 1)
        carryover.push(floated)
      }

      const half = working.length / 2
      const top = working.slice(0, half)
      const bottom = working.slice(half)

      // Maximize the number of pairs formed between top and bottom halves,
      // rather than greedily matching each top player to the first legal
      // bottom player in array order: a greedy first-fit can grab a
      // candidate that was the only legal option for someone else, causing
      // both to float when a different pairing of the same players would
      // have paired everyone off (see matchTopAndBottom).
      const {
        pairs: groupInternalPairs,
        unmatchedTop,
        unmatchedBottom,
      } = this.matchTopAndBottom(top, bottom, isLegalPair)

      for (const {a, b} of groupInternalPairs) {
        if (top.indexOf(a) !== bottom.indexOf(b)) {
          this.note(
            `Score group ${score}: ${a.name} vs board-position opponent was illegal; swapped to pair with ${b.name} instead`,
          )
        }
        groupPairs.push({a, b})
      }

      for (const a of unmatchedTop) {
        this.note(
          `Score group ${score}: no legal opponent remains for ${a.name} in this group (rematch or same-team conflict with everyone left); floating down to the next group`,
        )
        carryover.push(a)
      }

      for (const b of unmatchedBottom) {
        this.note(
          `Score group ${score}: ${b.name} was left without a legal opponent; floating down to the next group`,
        )
        carryover.push(b)
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

    const pairScore = (pair: Pair): number =>
      (scores.get(pair.a.uscfId) ?? 0) + (scores.get(pair.b.uscfId) ?? 0)

    const orderedPairs = [...allPairs].sort((x, y) => {
      const scoreDiff = pairScore(y) - pairScore(x)
      if (scoreDiff !== 0) return scoreDiff
      return Math.max(ratingOf(y.a), ratingOf(y.b)) - Math.max(ratingOf(x.a), ratingOf(x.b))
    })

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

  // Matches players floating down from a higher score group against the
  // destination group, preferring the highest-rated legal (no rematch, no
  // same-team) opponent for each floater. Since floaters can compete for
  // the same top candidate, this searches jointly across all floaters
  // (backtracking over opponent choice) rather than deciding one floater at
  // a time, so an earlier floater doesn't grab the only legal opponent left
  // for a later one. Maximizes how many floaters get matched; any left
  // over float further down to the next group.
  private matchFloaters(
    floaters: PairingInput[],
    group: PairingInput[],
    isLegalPair: (a: PairingInput, b: PairingInput) => boolean,
  ): {pairs: Pair[]; unmatched: PairingInput[]} {
    let best: {pairs: Pair[]; unmatched: PairingInput[]} | null = null

    const search = (
      index: number,
      avail: PairingInput[],
      pairs: Pair[],
      unmatched: PairingInput[],
    ): void => {
      if (index >= floaters.length) {
        if (!best || pairs.length > best.pairs.length) {
          best = {pairs: [...pairs], unmatched: [...unmatched]}
        }
        return
      }

      const floater = floaters[index]
      const candidates = [...avail]
        .filter((p) => isLegalPair(floater, p))
        .sort((a, b) => ratingOf(b) - ratingOf(a))

      for (const candidate of candidates) {
        pairs.push({a: floater, b: candidate})
        search(
          index + 1,
          avail.filter((p) => p !== candidate),
          pairs,
          unmatched,
        )
        pairs.pop()
      }

      unmatched.push(floater)
      search(index + 1, avail, pairs, unmatched)
      unmatched.pop()
    }

    search(0, group, [], [])
    return best ?? {pairs: [], unmatched: [...floaters]}
  }

  // Pairs a score group's top half against its bottom half (both already
  // rating-sorted, descending), maximizing the number of legal pairs formed
  // rather than greedily matching each top player to the first legal bottom
  // player in array order. A greedy first-fit can claim a bottom player who
  // was the only legal option left for someone else, floating both when a
  // different pairing of the same players would have paired everyone off.
  //
  // Runs a plain greedy first-fit pass first (identical to, and as fast as,
  // the original top-vs-bottom loop), then, only for whichever top players
  // that pass left unmatched, searches for a Kuhn's-algorithm augmenting
  // path - reassigning an already-matched bottom player to free up a legal
  // opponent - to rescue pairings the greedy pass's fixed left-to-right
  // order alone would strand. Restricting the augmenting search to only the
  // players greedy couldn't match keeps the common case (everyone pairs off
  // without any reshuffling) byte-for-byte identical to the old behavior,
  // and keeps this polynomial time - unlike matchFloaters' exhaustive
  // search, top and bottom halves can each run to a dozen-plus players,
  // where exhaustive search over every possible matching is intractable.
  private matchTopAndBottom(
    top: PairingInput[],
    bottom: PairingInput[],
    isLegalPair: (a: PairingInput, b: PairingInput) => boolean,
  ): {pairs: Pair[]; unmatchedTop: PairingInput[]; unmatchedBottom: PairingInput[]} {
    const matchedTopFor = new Map<PairingInput, PairingInput>()
    const matchedTop = new Set<PairingInput>()

    const assign = (b: PairingInput, a: PairingInput): void => {
      matchedTopFor.set(b, a)
      matchedTop.add(a)
    }

    for (const a of top) {
      const b = bottom.find(
        (candidate) => isLegalPair(a, candidate) && !matchedTopFor.has(candidate),
      )
      if (b) assign(b, a)
    }

    const tryAssign = (a: PairingInput, visited: Set<PairingInput>): boolean => {
      for (const b of bottom) {
        if (!isLegalPair(a, b) || visited.has(b)) continue
        visited.add(b)
        const currentTop = matchedTopFor.get(b)
        if (currentTop === undefined || tryAssign(currentTop, visited)) {
          assign(b, a)
          return true
        }
      }
      return false
    }

    for (const a of top) {
      if (!matchedTop.has(a)) tryAssign(a, new Set())
    }

    const pairs: Pair[] = []
    for (const [b, a] of matchedTopFor) pairs.push({a, b})
    pairs.sort((x, y) => top.indexOf(x.a) - top.indexOf(y.a))

    const unmatchedTop = top.filter((a) => !matchedTop.has(a))
    const unmatchedBottom = bottom.filter((b) => !matchedTopFor.has(b))

    return {pairs, unmatchedTop, unmatchedBottom}
  }

  // Whether every player in the (even-sized) list can be paired off with
  // some other player in the list, all pairs legal. Used to check, before
  // committing to a float, that doing so won't strand the rest of a group
  // with no legal way to pair off. Exhaustive backtracking search; fine for
  // the small group sizes a single score group has in practice.
  private hasPerfectMatching(
    players: PairingInput[],
    isLegalPair: (a: PairingInput, b: PairingInput) => boolean,
  ): boolean {
    if (players.length === 0) return true
    const [first, ...rest] = players
    for (let i = 0; i < rest.length; i++) {
      if (
        isLegalPair(first, rest[i]) &&
        this.hasPerfectMatching([...rest.slice(0, i), ...rest.slice(i + 1)], isLegalPair)
      ) {
        return true
      }
    }
    return false
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
    this.note(
      `Score group ${score}: candidate pairing sheet before color transposition:\n` +
        groupPairs.map((p, i) => `  ${i + 1}. ${p.a.name} vs ${p.b.name}`).join('\n'),
    )

    const satisfiedCount = (pair: Pair): number => {
      const dueA = getDueColor(pair.a.uscfId, history).color
      const dueB = getDueColor(pair.b.uscfId, history).color
      if (dueA === null && dueB === null) return 0
      if (dueA === null || dueB === null) return 1
      return dueA !== dueB ? 2 : 1
    }

    // Try swaps between adjacent boards first, then boards two apart, and so
    // on, so that when a swap does improve color balance it disturbs the
    // fewest boards possible. Restart from the smallest distance after every
    // applied swap, since a nearby improving swap may now be available.
    let improved = true
    while (improved) {
      improved = false

      outer: for (let distance = 1; distance < groupPairs.length; distance++) {
        for (let i = 0; i + distance < groupPairs.length; i++) {
          const j = i + distance
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
            break outer
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
