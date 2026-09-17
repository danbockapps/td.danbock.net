import {afterEach, describe, expect, it, vi} from 'vitest'
import {SwissEngine} from './swiss'
import type {PairingInput, RoundHistoryEntry} from './types'

interface EntryProps {
  entryId: number
  rating: number | null
  opts?: {team?: string | null; uscfId?: string}
}

function entry({entryId, rating, opts = {}}: EntryProps): PairingInput {
  return {
    entryId,
    uscfId: opts.uscfId ?? String(entryId),
    name: `Player ${entryId}`,
    rating,
    team: opts.team ?? null,
  }
}

interface GameProps {
  round: number
  uscfId: string
  opponentUscfId: string | null
  color: 'white' | 'black' | null
  points?: number
}

function game({round, uscfId, opponentUscfId, color, points}: GameProps): RoundHistoryEntry {
  return {round, uscfId, opponentUscfId, color, points}
}

function boards(
  results: {board: number; whiteEntryId: number | null; blackEntryId: number | null}[],
) {
  return results.map((r) => new Set([r.whiteEntryId, r.blackEntryId]))
}

describe('SwissEngine', () => {
  it('returns no pairings for an empty entry list', () => {
    const engine = new SwissEngine()
    expect(engine.pair([], {higherSeedColor: 'white'})).toEqual([])
  })

  it('round 1 with no history: one score group, pairs top half vs bottom half by rating', () => {
    const engine = new SwissEngine()
    const a = entry({entryId: 1, rating: 2000})
    const b = entry({entryId: 2, rating: 1800})
    const c = entry({entryId: 3, rating: 1600})
    const d = entry({entryId: 4, rating: 1400})

    const results = engine.pair([a, b, c, d], {higherSeedColor: 'white'})

    expect(boards(results)).toEqual(expect.arrayContaining([new Set([1, 3]), new Set([2, 4])]))
    expect(results).toHaveLength(2)
    expect(engine.log.some((l) => l.includes('score 0'))).toBe(true)
    expect(engine.log.some((l) => l.includes('Formed 1 score group'))).toBe(true)
  })

  it('pairs within score groups before mixing scores', () => {
    const engine = new SwissEngine()
    const a = entry({entryId: 1, rating: 2000})
    const b = entry({entryId: 2, rating: 1800})
    const c = entry({entryId: 3, rating: 1600})
    const d = entry({entryId: 4, rating: 1400})

    // A and B have a win under their belt (score 1); C and D have none.
    const history = [
      game({round: 1, uscfId: '1', opponentUscfId: '9', color: 'white', points: 1}),
      game({round: 1, uscfId: '2', opponentUscfId: '8', color: 'black', points: 1}),
    ]

    const results = engine.pair([a, b, c, d], {higherSeedColor: 'white', history})

    expect(boards(results)).toEqual(expect.arrayContaining([new Set([1, 2]), new Set([3, 4])]))
    expect(engine.log.some((l) => l.includes('Formed 2 score group'))).toBe(true)
  })

  it('avoids a rematch by swapping within the score group instead of floating', () => {
    const engine = new SwissEngine()
    const w = entry({entryId: 1, rating: 2000})
    const x = entry({entryId: 2, rating: 1800})
    const y = entry({entryId: 3, rating: 1600})
    const z = entry({entryId: 4, rating: 1400})

    // W already played Y; the naive top-vs-bottom pairing (W-Y, X-Z) is illegal.
    const history = [
      game({round: 1, uscfId: '1', opponentUscfId: '3', color: 'white'}),
      game({round: 1, uscfId: '3', opponentUscfId: '1', color: 'black'}),
    ]

    const results = engine.pair([w, x, y, z], {higherSeedColor: 'white', history})

    expect(boards(results)).toEqual(expect.arrayContaining([new Set([1, 4]), new Set([2, 3])]))
    expect(engine.log.some((l) => l.includes('swapped'))).toBe(true)
  })

  it('floats a player down a score group when no legal opponent remains in-group', () => {
    const engine = new SwissEngine()
    const w = entry({entryId: 1, rating: 2000})
    const x = entry({entryId: 2, rating: 1800})
    const y = entry({entryId: 3, rating: 1600})
    const z = entry({entryId: 4, rating: 1400})
    const p = entry({entryId: 5, rating: 1500})
    const q = entry({entryId: 6, rating: 1300})

    // W and X/Y/Z all have a win (score 1); P and Q have none (score 0).
    // W has already played both Y and Z, so W can't be legally paired
    // within the top score group at all and must float down.
    const history = [
      game({round: 1, uscfId: '1', opponentUscfId: '9', color: 'white', points: 1}),
      game({round: 1, uscfId: '3', opponentUscfId: '1', color: 'black'}),
      game({round: 2, uscfId: '1', opponentUscfId: '4', color: 'white'}),
      game({round: 2, uscfId: '4', opponentUscfId: '1', color: 'black'}),
      game({round: 1, uscfId: '2', opponentUscfId: '8', color: 'white', points: 1}),
      game({round: 1, uscfId: '3', opponentUscfId: '7', color: 'black', points: 1}),
      game({round: 1, uscfId: '4', opponentUscfId: '6', color: 'black', points: 1}),
    ]

    const results = engine.pair([w, x, y, z, p, q], {higherSeedColor: 'white', history})

    // X pairs with Y in the top group; W and Z both float down and end up
    // paired with P and Q respectively (not with each other, since W and Z
    // already played each other).
    expect(boards(results)).toEqual(
      expect.arrayContaining([new Set([2, 3]), new Set([1, 6]), new Set([5, 4])]),
    )
    expect(engine.log.some((l) => l.includes('floating') || l.includes('float'))).toBe(true)
  })

  it('floats down to play the highest-rated legal opponent in the next score group', () => {
    const engine = new SwissEngine()
    const w = entry({entryId: 1, rating: 2000})
    const x = entry({entryId: 2, rating: 1800})
    const y = entry({entryId: 3, rating: 1600})
    const p = entry({entryId: 4, rating: 1500})
    const q = entry({entryId: 5, rating: 1300})
    const r = entry({entryId: 6, rating: 1100})

    // W, X and Y have a win (score 1, odd group); P, Q and R have none.
    const history = [
      game({round: 1, uscfId: '1', opponentUscfId: '9', color: 'white', points: 1}),
      game({round: 1, uscfId: '2', opponentUscfId: '8', color: 'white', points: 1}),
      game({round: 1, uscfId: '3', opponentUscfId: '7', color: 'black', points: 1}),
    ]

    const results = engine.pair([w, x, y, p, q, r], {higherSeedColor: 'white', history})

    // W pairs with X in the top group; Y (lowest-rated of the three) floats
    // down and plays P, the highest-rated player in the 0 pt group, since
    // they haven't played before. Q and R then pair with each other.
    expect(boards(results)).toEqual(
      expect.arrayContaining([new Set([1, 2]), new Set([3, 4]), new Set([5, 6])]),
    )
    expect(engine.log.some((l) => l.includes('floats down') && l.includes('highest-rated'))).toBe(
      true,
    )
  })

  it('gives the bye to the lowest-scoring, lowest-rated player when the pool is odd', () => {
    const engine = new SwissEngine()
    const a = entry({entryId: 1, rating: 2000})
    const b = entry({entryId: 2, rating: 1800})
    const c = entry({entryId: 3, rating: 1600})

    const results = engine.pair([a, b, c], {higherSeedColor: 'white'})

    expect(results).toHaveLength(2)
    const bye = results.find((r) => r.whiteEntryId === null || r.blackEntryId === null)
    expect(bye).toBeDefined()
    expect(new Set([bye?.whiteEntryId, bye?.blackEntryId])).toEqual(new Set([3, null]))
  })

  it('avoids pairing same-team players by swapping within the group', () => {
    const engine = new SwissEngine()
    const a = entry({entryId: 1, rating: 2000, opts: {team: 'Red'}})
    const b = entry({entryId: 2, rating: 1800})
    const c = entry({entryId: 3, rating: 1600, opts: {team: 'Red'}})
    const d = entry({entryId: 4, rating: 1400})

    // Naive top-vs-bottom would pair A-C, but they share a team.
    const results = engine.pair([a, b, c, d], {higherSeedColor: 'white'})

    expect(boards(results)).toEqual(expect.arrayContaining([new Set([1, 4]), new Set([2, 3])]))
  })

  it('transposes bottom-half partners to increase the number of players getting their due color', () => {
    const engine = new SwissEngine()
    const a = entry({entryId: 1, rating: 2000})
    const b = entry({entryId: 2, rating: 1800})
    const c = entry({entryId: 3, rating: 1600})
    const d = entry({entryId: 4, rating: 1400})

    // A and C are both due black (played white last time); B and D are
    // both due white (played black last time). The naive pairing (A-C,
    // B-D) gives only one player per board their due color; transposing
    // to (A-D, B-C) satisfies everyone.
    const history = [
      game({round: 1, uscfId: '1', opponentUscfId: '91', color: 'white'}),
      game({round: 1, uscfId: '3', opponentUscfId: '92', color: 'white'}),
      game({round: 1, uscfId: '2', opponentUscfId: '93', color: 'black'}),
      game({round: 1, uscfId: '4', opponentUscfId: '94', color: 'black'}),
    ]

    const results = engine.pair([a, b, c, d], {higherSeedColor: 'white', history})

    expect(boards(results)).toEqual(expect.arrayContaining([new Set([1, 4]), new Set([2, 3])]))
    expect(engine.log.some((l) => l.includes('transposing') && l.includes('applying'))).toBe(true)

    const boardAD = results.find((r) => new Set([r.whiteEntryId, r.blackEntryId]).has(1))
    expect(boardAD).toEqual({board: boardAD?.board, whiteEntryId: 4, blackEntryId: 1})
    const boardBC = results.find((r) => new Set([r.whiteEntryId, r.blackEntryId]).has(2))
    expect(boardBC).toEqual({board: boardBC?.board, whiteEntryId: 2, blackEntryId: 3})
  })

  it('pairs the second round when 2 of 8 players are new and the lowest-rated player won round 1', () => {
    const engine = new SwissEngine()
    const p1 = entry({entryId: 1, rating: 2000})
    const p2 = entry({entryId: 2, rating: 1800})
    const p3 = entry({entryId: 3, rating: 1600})
    const p4 = entry({entryId: 4, rating: 1400})
    const p5 = entry({entryId: 5, rating: 1200})
    const p6 = entry({entryId: 6, rating: 1000})
    const p7 = entry({entryId: 7, rating: 1300})
    const p8 = entry({entryId: 8, rating: 1100})

    // P1 and P2 are new entrants joining in round 2 (score 0, no history).
    // Of the 6 who played round 1: P3 and P4 drew, P7 and P8 drew, and P6
    // (the lowest-rated of all six) beat P5.
    const history = [
      game({round: 1, uscfId: '3', opponentUscfId: '4', color: 'white', points: 0.5}),
      game({round: 1, uscfId: '4', opponentUscfId: '3', color: 'black', points: 0.5}),
      game({round: 1, uscfId: '5', opponentUscfId: '6', color: 'white', points: 0}),
      game({round: 1, uscfId: '6', opponentUscfId: '5', color: 'black', points: 1}),
      game({round: 1, uscfId: '7', opponentUscfId: '8', color: 'white', points: 0.5}),
      game({round: 1, uscfId: '8', opponentUscfId: '7', color: 'black', points: 0.5}),
    ]

    const results = engine.pair([p1, p2, p3, p4, p5, p6, p7, p8], {
      higherSeedColor: 'white',
      history,
    })

    // P6 (1 pt) has no same-score peer, so floats down into the 0.5 pt
    // group and plays P3, the highest-rated player there (they haven't
    // played before). That leaves P4, P7 and P8 in the 0.5 pt group; P8
    // (lowest-scoring, lowest-rated) floats further into the 0 pt group and
    // plays P1, the highest-rated player there, while P4 pairs with P7 and
    // P2 pairs with P5.
    expect(boards(results)).toEqual(
      expect.arrayContaining([new Set([3, 6]), new Set([4, 7]), new Set([1, 8]), new Set([2, 5])]),
    )
    expect(results).toHaveLength(4)
  })

  describe('debug flag', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('does not write to the console when debug is off', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const engine = new SwissEngine()

      engine.pair([entry({entryId: 1, rating: 1000}), entry({entryId: 2, rating: 1100})], {
        higherSeedColor: 'white',
      })

      expect(spy).not.toHaveBeenCalled()
      expect(engine.log.length).toBeGreaterThan(0)
    })

    it('writes every logged decision to the console when debug is on', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const engine = new SwissEngine({debug: true})

      engine.pair([entry({entryId: 1, rating: 1000}), entry({entryId: 2, rating: 1100})], {
        higherSeedColor: 'white',
      })

      expect(spy).toHaveBeenCalledTimes(engine.log.length)
    })
  })
})
