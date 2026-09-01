import {describe, expect, it} from 'vitest'
import {RatingOrderEngine} from './ratingOrder'
import type {PairingInput} from './types'

const engine = new RatingOrderEngine()

function entry(entryId: number, rating: number | null): PairingInput {
  return {entryId, name: `Player ${entryId}`, rating}
}

describe('RatingOrderEngine', () => {
  it('pairs the highest seed against the second highest, and so on', () => {
    const entries = [entry(1, 1200), entry(2, 1600), entry(3, 1400), entry(4, 1000)]

    const results = engine.pair(entries, {higherSeedColor: 'white'})

    expect(results).toEqual([
      {board: 1, whiteEntryId: 2, blackEntryId: 3},
      {board: 2, whiteEntryId: 4, blackEntryId: 1},
    ])
  })

  it('sends unrated players to the bottom of the seeding order', () => {
    const entries = [entry(1, null), entry(2, 1500), entry(3, 1300)]

    const results = engine.pair(entries, {higherSeedColor: 'white'})

    expect(results).toEqual([
      {board: 1, whiteEntryId: 2, blackEntryId: 3},
      {board: 2, whiteEntryId: null, blackEntryId: 1},
    ])
  })

  it('gives the odd player out a bye with the higher seed color', () => {
    const entries = [entry(1, 1000), entry(2, 2000), entry(3, 1500)]

    // Board 2 is even, so the higher seed color flips from white to black.
    const whiteBye = engine.pair(entries, {higherSeedColor: 'white'})
    expect(whiteBye[1]).toEqual({board: 2, whiteEntryId: null, blackEntryId: 1})

    // Board 2 flips from black to white.
    const blackBye = engine.pair(entries, {higherSeedColor: 'black'})
    expect(blackBye[1]).toEqual({board: 2, whiteEntryId: 1, blackEntryId: null})
  })

  it('alternates the higher seed color by board', () => {
    const entries = [
      entry(1, 2000),
      entry(2, 1900),
      entry(3, 1800),
      entry(4, 1700),
      entry(5, 1600),
      entry(6, 1500),
    ]

    const results = engine.pair(entries, {higherSeedColor: 'white'})

    // Board 1 (odd): higher seed (1) gets white.
    expect(results[0]).toEqual({board: 1, whiteEntryId: 1, blackEntryId: 2})
    // Board 2 (even): higher seed (3) gets black.
    expect(results[1]).toEqual({board: 2, whiteEntryId: 4, blackEntryId: 3})
    // Board 3 (odd): higher seed (5) gets white.
    expect(results[2]).toEqual({board: 3, whiteEntryId: 5, blackEntryId: 6})
  })

  it('honors higherSeedColor black on board 1', () => {
    const entries = [entry(1, 1200), entry(2, 1600)]

    const results = engine.pair(entries, {higherSeedColor: 'black'})

    expect(results).toEqual([{board: 1, whiteEntryId: 1, blackEntryId: 2}])
  })

  it('treats equal ratings as ties without erroring', () => {
    const entries = [entry(1, 1500), entry(2, 1500)]

    const results = engine.pair(entries, {higherSeedColor: 'white'})

    expect(results).toHaveLength(1)
    expect(new Set([results[0].whiteEntryId, results[0].blackEntryId])).toEqual(new Set([1, 2]))
  })

  it('returns no pairings for an empty entry list', () => {
    expect(engine.pair([], {higherSeedColor: 'white'})).toEqual([])
  })

  it('gives a single entry a bye', () => {
    const results = engine.pair([entry(1, 1500)], {higherSeedColor: 'white'})

    expect(results).toEqual([{board: 1, whiteEntryId: 1, blackEntryId: null}])
  })
})
