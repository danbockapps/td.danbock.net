import {describe, expect, it} from 'vitest'
import {SwissEngine} from './swiss'
import {SwissThresholdHybridEngine} from './swissThresholdHybrid'
import {boards, entry, game} from './testHelpers'
import type {RoundHistoryEntry} from './types'

describe('SwissThresholdHybridEngine', () => {
  it('returns no pairings for an empty entry list', () => {
    const engine = new SwissThresholdHybridEngine({threshold: 1})
    expect(engine.pair([], {higherSeedColor: 'white'})).toEqual([])
  })

  it('Swiss-pairs everyone within the threshold, rating-diff pairs everyone else', () => {
    const engine = new SwissThresholdHybridEngine({threshold: 1})

    const a = entry({entryId: 1, rating: 2200})
    const b = entry({entryId: 2, rating: 2100})
    const c = entry({entryId: 3, rating: 2000})
    const d = entry({entryId: 4, rating: 1900})
    const e = entry({entryId: 5, rating: 1400})
    const f = entry({entryId: 6, rating: 1300})
    const g = entry({entryId: 7, rating: 1200})
    const h = entry({entryId: 8, rating: 1100})

    // Leader score 3; threshold 1 -> cutoff 2. A,B,C,D (2-3 pts) are
    // Swiss-eligible; E,F,G,H (0-1 pts) are not.
    const history: RoundHistoryEntry[] = [
      game({round: 1, uscfId: '1', opponentUscfId: '90', color: 'white', points: 1}),
      game({round: 2, uscfId: '1', opponentUscfId: '91', color: 'black', points: 1}),
      game({round: 3, uscfId: '1', opponentUscfId: '92', color: 'white', points: 1}),
      game({round: 1, uscfId: '2', opponentUscfId: '93', color: 'white', points: 1}),
      game({round: 2, uscfId: '2', opponentUscfId: '94', color: 'black', points: 1}),
      game({round: 3, uscfId: '2', opponentUscfId: '95', color: 'white', points: 1}),
      game({round: 1, uscfId: '3', opponentUscfId: '96', color: 'white', points: 1}),
      game({round: 2, uscfId: '3', opponentUscfId: '97', color: 'black', points: 1}),
      game({round: 1, uscfId: '4', opponentUscfId: '98', color: 'white', points: 1}),
      game({round: 2, uscfId: '4', opponentUscfId: '99', color: 'black', points: 1}),
      game({round: 1, uscfId: '5', opponentUscfId: '80', color: 'white', points: 1}),
      game({round: 1, uscfId: '6', opponentUscfId: '81', color: 'white', points: 1}),
    ]

    const results = engine.pair([a, b, c, d, e, f, g, h], {higherSeedColor: 'white', history})
    expect(results).toHaveLength(4)

    const eligibleIds = new Set([1, 2, 3, 4])
    const ineligibleIds = new Set([5, 6, 7, 8])
    for (const board of results) {
      const ids = [board.whiteEntryId, board.blackEntryId]
      const bothEligible = ids.every((id) => id !== null && eligibleIds.has(id))
      const bothIneligible = ids.every((id) => id !== null && ineligibleIds.has(id))
      // Every board is either entirely within the eligible (Swiss) set or
      // entirely within the ineligible (rating-diff) set: none of the
      // eligible players' scores happens to require pulling in an
      // ineligible partner in this scenario.
      expect(bothEligible || bothIneligible).toBe(true)
    }
  })

  it('an odd Swiss-eligible group pulls in exactly one lower-scoring player via the float', () => {
    const engine = new SwissThresholdHybridEngine({threshold: 1})

    // Leader score 3 (alone); 2-pt group has two players -> 3 eligible
    // players total (odd), forcing one float down into the 1-pt group.
    const a = entry({entryId: 1, rating: 2200})
    const b = entry({entryId: 2, rating: 2000})
    const c = entry({entryId: 3, rating: 1900})
    const d = entry({entryId: 4, rating: 1400})
    const e = entry({entryId: 5, rating: 1300})
    const f = entry({entryId: 6, rating: 1200})

    const history: RoundHistoryEntry[] = [
      game({round: 1, uscfId: '1', opponentUscfId: '90', color: 'white', points: 1}),
      game({round: 2, uscfId: '1', opponentUscfId: '91', color: 'black', points: 1}),
      game({round: 3, uscfId: '1', opponentUscfId: '92', color: 'white', points: 1}),
      game({round: 1, uscfId: '2', opponentUscfId: '93', color: 'white', points: 1}),
      game({round: 2, uscfId: '2', opponentUscfId: '94', color: 'black', points: 1}),
      game({round: 1, uscfId: '3', opponentUscfId: '95', color: 'white', points: 1}),
      game({round: 2, uscfId: '3', opponentUscfId: '96', color: 'black', points: 1}),
      game({round: 1, uscfId: '4', opponentUscfId: '97', color: 'white', points: 1}),
      game({round: 1, uscfId: '5', opponentUscfId: '98', color: 'white', points: 1}),
      game({round: 1, uscfId: '6', opponentUscfId: '99', color: 'white', points: 1}),
    ]

    const results = engine.pair([a, b, c, d, e, f], {higherSeedColor: 'white', history})
    expect(results).toHaveLength(3)

    // A (the leader) must play B, the highest-rated legal candidate in the
    // next group down.
    expect(boards(results)).toContainEqual(new Set([1, 2]))

    // C, the odd one out in the eligible group, floats down and pulls in
    // exactly one lower-scoring player (D, the highest-rated in that group).
    expect(boards(results)).toContainEqual(new Set([3, 4]))

    // E and F, both below cutoff and untouched by the float, are paired by
    // the rating-diff minimizer between themselves.
    expect(boards(results)).toContainEqual(new Set([5, 6]))
  })

  it('a rematch forces the eligible player to cascade further down, pulling in whoever it lands on', () => {
    const engine = new SwissThresholdHybridEngine({threshold: 0})

    // Only A (score 3) is Swiss-eligible with threshold 0. A already played
    // B (the only 2-pt player), so A must float past B and pair with
    // whoever it legally lands on next.
    const a = entry({entryId: 1, rating: 2200})
    const b = entry({entryId: 2, rating: 2000})
    const c = entry({entryId: 3, rating: 1400})
    const d = entry({entryId: 4, rating: 1300})

    const history: RoundHistoryEntry[] = [
      game({round: 1, uscfId: '1', opponentUscfId: '2', color: 'white', points: 1}),
      game({round: 1, uscfId: '2', opponentUscfId: '1', color: 'black', points: 0}),
      game({round: 2, uscfId: '1', opponentUscfId: '90', color: 'white', points: 1}),
      game({round: 3, uscfId: '1', opponentUscfId: '91', color: 'black', points: 1}),
      game({round: 2, uscfId: '2', opponentUscfId: '92', color: 'white', points: 1}),
    ]

    const results = engine.pair([a, b, c, d], {higherSeedColor: 'white', history})
    expect(results).toHaveLength(2)

    // A and B never end up on the same board (they already played).
    const sharesBoard = results.some(
      (r) =>
        (r.whiteEntryId === 1 && r.blackEntryId === 2) ||
        (r.whiteEntryId === 2 && r.blackEntryId === 1),
    )
    expect(sharesBoard).toBe(false)

    // A's board, whoever it's with, is preserved intact rather than split
    // apart and handed to the rating-diff engine.
    const aBoard = results.find((r) => r.whiteEntryId === 1 || r.blackEntryId === 1)
    expect(aBoard).toBeDefined()
  })

  it('matches a full SwissEngine run when the threshold covers the whole field', () => {
    const a = entry({entryId: 1, rating: 2000})
    const b = entry({entryId: 2, rating: 1800})
    const c = entry({entryId: 3, rating: 1600})
    const d = entry({entryId: 4, rating: 1400})
    const options = {higherSeedColor: 'white' as const}

    const hybrid = new SwissThresholdHybridEngine({threshold: 1000})
    const swiss = new SwissEngine()

    const hybridResults = hybrid.pair([a, b, c, d], options)
    const swissResults = swiss.pair([a, b, c, d], options)

    expect(boards(hybridResults)).toEqual(boards(swissResults))
  })

  it('never repeats an opponent from history, across both the Swiss and rating-diff portions', () => {
    const engine = new SwissThresholdHybridEngine({threshold: 1})

    const a = entry({entryId: 1, rating: 2200})
    const b = entry({entryId: 2, rating: 2100})
    const c = entry({entryId: 3, rating: 2000})
    const d = entry({entryId: 4, rating: 1900})
    const e = entry({entryId: 5, rating: 1400})
    const f = entry({entryId: 6, rating: 1300})

    const history: RoundHistoryEntry[] = [
      game({round: 1, uscfId: '1', opponentUscfId: '3', color: 'white', points: 1}),
      game({round: 1, uscfId: '3', opponentUscfId: '1', color: 'black', points: 0}),
      game({round: 1, uscfId: '2', opponentUscfId: '4', color: 'white', points: 1}),
      game({round: 1, uscfId: '4', opponentUscfId: '2', color: 'black', points: 0}),
      game({round: 1, uscfId: '5', opponentUscfId: '6', color: 'white', points: 1}),
      game({round: 1, uscfId: '6', opponentUscfId: '5', color: 'black', points: 0}),
      game({round: 2, uscfId: '1', opponentUscfId: '90', color: 'white', points: 1}),
      game({round: 2, uscfId: '2', opponentUscfId: '91', color: 'white', points: 1}),
    ]

    const results = engine.pair([a, b, c, d, e, f], {higherSeedColor: 'white', history})

    const previouslyPaired = new Set(
      history
        .filter((h) => h.opponentUscfId !== null)
        .map((h) => [h.uscfId, h.opponentUscfId as string].sort().join('|')),
    )
    const uscfById = new Map([a, b, c, d, e, f].map((p) => [p.entryId, p.uscfId]))

    for (const board of results) {
      if (board.whiteEntryId === null || board.blackEntryId === null) continue
      const key = [uscfById.get(board.whiteEntryId), uscfById.get(board.blackEntryId)]
        .sort()
        .join('|')
      expect(previouslyPaired.has(key)).toBe(false)
    }
  })

  it('gives exactly one bye and an otherwise even split when the total is odd', () => {
    const engine = new SwissThresholdHybridEngine({threshold: 1})

    const a = entry({entryId: 1, rating: 2000})
    const b = entry({entryId: 2, rating: 1900})
    const c = entry({entryId: 3, rating: 1500})
    const d = entry({entryId: 4, rating: 1400})
    const e = entry({entryId: 5, rating: 1300})

    const results = engine.pair([a, b, c, d, e], {higherSeedColor: 'white'})

    const byeBoards = results.filter((r) => r.whiteEntryId === null || r.blackEntryId === null)
    expect(byeBoards).toHaveLength(1)
    expect(results).toHaveLength(3)
  })
})
