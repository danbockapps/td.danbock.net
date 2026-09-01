import {describe, expect, it} from 'vitest'
import {RatingDiffMinimizerEngine} from './ratingDiffMinimizer'
import type {PairingInput, RoundHistoryEntry} from './types'

const engine = new RatingDiffMinimizerEngine()

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
): RoundHistoryEntry {
  return {round, uscfId, opponentUscfId, color}
}

function boards(
  results: {board: number; whiteEntryId: number | null; blackEntryId: number | null}[],
) {
  return results.map((r) => new Set([r.whiteEntryId, r.blackEntryId]))
}

describe('RatingDiffMinimizerEngine', () => {
  it('throws on an odd number of entries', () => {
    const entries = [entry(1, 1000), entry(2, 1000), entry(3, 1000)]
    expect(() => engine.pair(entries, {higherSeedColor: 'white'})).toThrow(/even number/)
  })

  it('returns no pairings for an empty entry list', () => {
    expect(engine.pair([], {higherSeedColor: 'white'})).toEqual([])
  })

  it('picks the pairing sheet with the lowest sum of squared rating differences', () => {
    // A=1000, B=1200, C=1300, D=2000
    // A-B,C-D: (200)^2 + (700)^2 = 40000 + 490000 = 530000
    // A-C,B-D: (300)^2 + (800)^2 = 90000 + 640000 = 730000
    // A-D,B-C: (1000)^2 + (100)^2 = 1000000 + 10000 = 1010000
    // Lowest is A-B, C-D.
    const a = entry(1, 1000)
    const b = entry(2, 1200)
    const c = entry(3, 1300)
    const d = entry(4, 2000)
    const results = engine.pair([a, b, c, d], {higherSeedColor: 'white'})

    expect(boards(results)).toEqual(expect.arrayContaining([new Set([1, 2]), new Set([3, 4])]))
    expect(results).toHaveLength(2)
  })

  it('excludes a pairing sheet where two players share a team, even if it scores lowest', () => {
    // A=1000, B=1010 (same team), C=1300, D=2000.
    // A-B,C-D would score lowest but A/B share a team, so it's illegal.
    // Next best legal sheet is A-C,B-D vs A-D,B-C:
    // A-C,B-D: (300)^2 + (990)^2 = 90000 + 980100 = 1070100
    // A-D,B-C: (1000)^2 + (290)^2 = 1000000 + 84100 = 1084100
    // So A-C,B-D wins among legal sheets.
    const a = entry(1, 1000, {team: 'Red'})
    const b = entry(2, 1010, {team: 'Red'})
    const c = entry(3, 1300)
    const d = entry(4, 2000)
    const results = engine.pair([a, b, c, d], {higherSeedColor: 'white'})

    expect(boards(results)).toEqual(expect.arrayContaining([new Set([1, 3]), new Set([2, 4])]))
  })

  it('excludes a pairing sheet where two players met in a previous round', () => {
    // A vs B already played; A-B,C-D would score lowest but is illegal.
    const a = entry(1, 1000)
    const b = entry(2, 1200)
    const c = entry(3, 1300)
    const d = entry(4, 2000)
    const history = [game(1, '1', '2', 'white'), game(1, '2', '1', 'black')]

    const results = engine.pair([a, b, c, d], {higherSeedColor: 'white', history})

    expect(boards(results)).toEqual(expect.arrayContaining([new Set([1, 3]), new Set([2, 4])]))
  })

  it('throws when every pairing sheet is illegal', () => {
    const a = entry(1, 1000, {team: 'Red'})
    const b = entry(2, 1200, {team: 'Red'})
    const c = entry(3, 1300, {team: 'Red'})
    const d = entry(4, 2000, {team: 'Red'})
    expect(() => engine.pair([a, b, c, d], {higherSeedColor: 'white'})).toThrow(/no legal/i)
  })

  it('treats unrated players as rating 100 when scoring', () => {
    // A=null(100), B=150, C=1000, D=1100.
    // A-B,C-D: (50)^2 + (100)^2 = 2500 + 10000 = 12500
    // A-C,B-D: (900)^2 + (950)^2 = huge
    // A-D,B-C: (1000)^2 + (850)^2 = huge
    // Lowest is A-B, C-D.
    const a = entry(1, null)
    const b = entry(2, 150)
    const c = entry(3, 1000)
    const d = entry(4, 1100)
    const results = engine.pair([a, b, c, d], {higherSeedColor: 'white'})

    expect(boards(results)).toEqual(expect.arrayContaining([new Set([1, 2]), new Set([3, 4])]))
  })

  it('orders boards with the higher-rated pair on board 1', () => {
    const a = entry(1, 1000)
    const b = entry(2, 1010)
    const c = entry(3, 2000)
    const d = entry(4, 2010)
    const results = engine.pair([a, b, c, d], {higherSeedColor: 'white'})

    const board1 = results.find((r) => r.board === 1)
    expect(new Set([board1?.whiteEntryId, board1?.blackEntryId])).toEqual(new Set([3, 4]))
  })

  it('gives a player their due color when there is no conflict', () => {
    // A is due black (played white last round), B has no history.
    const a = entry(1, 1000)
    const b = entry(2, 1010)
    const history = [game(1, '1', '9', 'white')]

    const results = engine.pair([a, b], {higherSeedColor: 'white', history})

    expect(results).toEqual([{board: 1, whiteEntryId: 2, blackEntryId: 1}])
  })

  it('resolves a color conflict in favor of the stronger preference', () => {
    // A has an absolute preference for black (white twice in a row).
    // B has only a strong preference for black (white once).
    const a = entry(1, 1000)
    const b = entry(2, 1010)
    const history = [
      game(1, '1', '8', 'white'),
      game(2, '1', '9', 'white'),
      game(1, '2', '7', 'white'),
    ]

    const results = engine.pair([a, b], {higherSeedColor: 'white', history})

    expect(results).toEqual([{board: 1, whiteEntryId: 2, blackEntryId: 1}])
  })

  it('resolves an equal-strength color conflict in favor of the higher-rated player', () => {
    // Both due black with a strong (one-game) preference; A is higher rated.
    const a = entry(1, 2000)
    const b = entry(2, 1000)
    const history = [game(1, '1', '8', 'white'), game(1, '2', '9', 'white')]

    const results = engine.pair([a, b], {higherSeedColor: 'white', history})

    expect(results).toEqual([{board: 1, whiteEntryId: 2, blackEntryId: 1}])
  })

  it('pairs six players in round 1 with no history', () => {
    const a = entry(1, 1913)
    const b = entry(2, 1880)
    const c = entry(3, 1822)
    const d = entry(4, 1607)
    const e = entry(5, 1435)
    const f = entry(6, 1007)

    const results = engine.pair([a, b, c, d, e, f], {higherSeedColor: 'white'})

    expect(boards(results)).toEqual(
      expect.arrayContaining([new Set([1, 2]), new Set([3, 4]), new Set([5, 6])]),
    )
    expect(results).toHaveLength(3)
  })

  it('pairs the same six players in round 2, avoiding round 1 rematches', () => {
    const a = entry(1, 1913)
    const b = entry(2, 1880)
    const c = entry(3, 1822)
    const d = entry(4, 1607)
    const e = entry(5, 1435)
    const f = entry(6, 1007)

    const history = [
      game(1, '1', '2', 'white'),
      game(1, '2', '1', 'black'),
      game(1, '3', '4', 'white'),
      game(1, '4', '3', 'black'),
      game(1, '5', '6', 'white'),
      game(1, '6', '5', 'black'),
    ]

    const results = engine.pair([a, b, c, d, e, f], {higherSeedColor: 'white', history})

    expect(boards(results)).toEqual(
      expect.arrayContaining([new Set([3, 1]), new Set([2, 5]), new Set([4, 6])]),
    )
    expect(results).toHaveLength(3)
  })

  it('falls back to higherSeedColor for the higher-rated player when neither has a preference', () => {
    const a = entry(1, 2000)
    const b = entry(2, 1000)

    expect(engine.pair([a, b], {higherSeedColor: 'white'})).toEqual([
      {board: 1, whiteEntryId: 1, blackEntryId: 2},
    ])
    expect(engine.pair([a, b], {higherSeedColor: 'black'})).toEqual([
      {board: 1, whiteEntryId: 2, blackEntryId: 1},
    ])
  })
})
