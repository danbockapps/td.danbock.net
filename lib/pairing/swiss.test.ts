import {afterEach, describe, expect, it, vi} from 'vitest'
import {SwissEngine} from './swiss'
import type {PairingInput, RoundHistoryEntry} from './types'

function entry(
  entryId: number,
  rating: number | null,
  opts: {team?: string | null; uscfId?: string} = {},
): PairingInput {
  return {
    entryId,
    uscfId: opts.uscfId ?? String(entryId),
    name: `Player ${entryId}`,
    rating,
    team: opts.team ?? null,
  }
}

function game(
  round: number,
  uscfId: string,
  opponentUscfId: string | null,
  color: 'white' | 'black' | null,
  points?: number,
): RoundHistoryEntry {
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
    const a = entry(1, 2000)
    const b = entry(2, 1800)
    const c = entry(3, 1600)
    const d = entry(4, 1400)

    const results = engine.pair([a, b, c, d], {higherSeedColor: 'white'})

    expect(boards(results)).toEqual(expect.arrayContaining([new Set([1, 3]), new Set([2, 4])]))
    expect(results).toHaveLength(2)
    expect(engine.log.some((l) => l.includes('score 0'))).toBe(true)
    expect(engine.log.some((l) => l.includes('Formed 1 score group'))).toBe(true)
  })

  it('pairs within score groups before mixing scores', () => {
    const engine = new SwissEngine()
    const a = entry(1, 2000)
    const b = entry(2, 1800)
    const c = entry(3, 1600)
    const d = entry(4, 1400)

    // A and B have a win under their belt (score 1); C and D have none.
    const history = [game(1, '1', '9', 'white', 1), game(1, '2', '8', 'black', 1)]

    const results = engine.pair([a, b, c, d], {higherSeedColor: 'white', history})

    expect(boards(results)).toEqual(expect.arrayContaining([new Set([1, 2]), new Set([3, 4])]))
    expect(engine.log.some((l) => l.includes('Formed 2 score group'))).toBe(true)
  })

  it('avoids a rematch by swapping within the score group instead of floating', () => {
    const engine = new SwissEngine()
    const w = entry(1, 2000)
    const x = entry(2, 1800)
    const y = entry(3, 1600)
    const z = entry(4, 1400)

    // W already played Y; the naive top-vs-bottom pairing (W-Y, X-Z) is illegal.
    const history = [game(1, '1', '3', 'white'), game(1, '3', '1', 'black')]

    const results = engine.pair([w, x, y, z], {higherSeedColor: 'white', history})

    expect(boards(results)).toEqual(expect.arrayContaining([new Set([1, 4]), new Set([2, 3])]))
    expect(engine.log.some((l) => l.includes('swapped'))).toBe(true)
  })

  it('floats a player down a score group when no legal opponent remains in-group', () => {
    const engine = new SwissEngine()
    const w = entry(1, 2000)
    const x = entry(2, 1800)
    const y = entry(3, 1600)
    const z = entry(4, 1400)
    const p = entry(5, 1500)
    const q = entry(6, 1300)

    // W and X/Y/Z all have a win (score 1); P and Q have none (score 0).
    // W has already played both Y and Z, so W can't be legally paired
    // within the top score group at all and must float down.
    const history = [
      game(1, '1', '9', 'white', 1),
      game(1, '3', '1', 'black'),
      game(2, '1', '4', 'white'),
      game(2, '4', '1', 'black'),
      game(1, '2', '8', 'white', 1),
      game(1, '3', '7', 'black', 1),
      game(1, '4', '6', 'black', 1),
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

  it('gives the bye to the lowest-scoring, lowest-rated player when the pool is odd', () => {
    const engine = new SwissEngine()
    const a = entry(1, 2000)
    const b = entry(2, 1800)
    const c = entry(3, 1600)

    const results = engine.pair([a, b, c], {higherSeedColor: 'white'})

    expect(results).toHaveLength(2)
    const bye = results.find((r) => r.whiteEntryId === null || r.blackEntryId === null)
    expect(bye).toBeDefined()
    expect(new Set([bye?.whiteEntryId, bye?.blackEntryId])).toEqual(new Set([3, null]))
  })

  it('avoids pairing same-team players by swapping within the group', () => {
    const engine = new SwissEngine()
    const a = entry(1, 2000, {team: 'Red'})
    const b = entry(2, 1800)
    const c = entry(3, 1600, {team: 'Red'})
    const d = entry(4, 1400)

    // Naive top-vs-bottom would pair A-C, but they share a team.
    const results = engine.pair([a, b, c, d], {higherSeedColor: 'white'})

    expect(boards(results)).toEqual(expect.arrayContaining([new Set([1, 4]), new Set([2, 3])]))
  })

  it('transposes bottom-half partners to increase the number of players getting their due color', () => {
    const engine = new SwissEngine()
    const a = entry(1, 2000)
    const b = entry(2, 1800)
    const c = entry(3, 1600)
    const d = entry(4, 1400)

    // A and C are both due black (played white last time); B and D are
    // both due white (played black last time). The naive pairing (A-C,
    // B-D) gives only one player per board their due color; transposing
    // to (A-D, B-C) satisfies everyone.
    const history = [
      game(1, '1', '91', 'white'),
      game(1, '3', '92', 'white'),
      game(1, '2', '93', 'black'),
      game(1, '4', '94', 'black'),
    ]

    const results = engine.pair([a, b, c, d], {higherSeedColor: 'white', history})

    expect(boards(results)).toEqual(expect.arrayContaining([new Set([1, 4]), new Set([2, 3])]))
    expect(engine.log.some((l) => l.includes('transposing') && l.includes('applying'))).toBe(true)

    const boardAD = results.find((r) => new Set([r.whiteEntryId, r.blackEntryId]).has(1))
    expect(boardAD).toEqual({board: boardAD?.board, whiteEntryId: 4, blackEntryId: 1})
    const boardBC = results.find((r) => new Set([r.whiteEntryId, r.blackEntryId]).has(2))
    expect(boardBC).toEqual({board: boardBC?.board, whiteEntryId: 2, blackEntryId: 3})
  })

  describe('debug flag', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('does not write to the console when debug is off', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const engine = new SwissEngine()

      engine.pair([entry(1, 1000), entry(2, 1100)], {higherSeedColor: 'white'})

      expect(spy).not.toHaveBeenCalled()
      expect(engine.log.length).toBeGreaterThan(0)
    })

    it('writes every logged decision to the console when debug is on', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const engine = new SwissEngine({debug: true})

      engine.pair([entry(1, 1000), entry(2, 1100)], {higherSeedColor: 'white'})

      expect(spy).toHaveBeenCalledTimes(engine.log.length)
    })
  })
})
