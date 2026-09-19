import {describe, expect, it} from 'vitest'
import {SwissEngine} from './swiss'
import {historyThroughRound} from './swissSimulation'
import {entry} from './testHelpers'
import type {PairingResult} from './types'

// Simulates a full five-round Swiss tournament with thirty players, verifying
// pairing, board number, and color assignment for every round. Like the
// eight-player tournament (see swiss.tournament8.test.ts), game results
// aren't hand-picked: each game is decided by a seeded random number
// generator, giving the higher-rated player a 60% chance to win, a 25%
// chance of a draw, and a 15% chance the lower-rated player upsets them. The
// seed is fixed, so the sequence of outcomes below - and therefore every
// pairing that follows from it - is reproducible.
//
// Players (entryId/uscfId, rating): entry N has rating 2000 - (N - 1) * 50,
// so player 1 is rated 2000 and player 30 is rated 550.

const N = 30
const players = Array.from({length: N}, (_, i) => entry({entryId: i + 1, rating: 2000 - i * 50}))
const ratingOf = new Map(players.map((p) => [p.uscfId, p.rating as number]))
const SEED = 20260918

describe('SwissEngine: thirty-player, five-round tournament with randomized results', () => {
  it('round 1: no standings yet, so one score group paired by rating (top half vs bottom half)', () => {
    const engine = new SwissEngine()

    const results = engine.pair(players, {higherSeedColor: 'white'})

    expect(results).toEqual([
      {board: 1, whiteEntryId: 1, blackEntryId: 16}, // 2000 / 0 / 1250 / 0
      {board: 2, whiteEntryId: 17, blackEntryId: 2}, // 1200 / 0 / 1950 / 0
      {board: 3, whiteEntryId: 3, blackEntryId: 18}, // 1900 / 0 / 1150 / 0
      {board: 4, whiteEntryId: 19, blackEntryId: 4}, // 1100 / 0 / 1850 / 0
      {board: 5, whiteEntryId: 5, blackEntryId: 20}, // 1800 / 0 / 1050 / 0
      {board: 6, whiteEntryId: 21, blackEntryId: 6}, // 1000 / 0 / 1750 / 0
      {board: 7, whiteEntryId: 7, blackEntryId: 22}, // 1700 / 0 / 950 / 0
      {board: 8, whiteEntryId: 23, blackEntryId: 8}, // 900 / 0 / 1650 / 0
      {board: 9, whiteEntryId: 9, blackEntryId: 24}, // 1600 / 0 / 850 / 0
      {board: 10, whiteEntryId: 25, blackEntryId: 10}, // 800 / 0 / 1550 / 0
      {board: 11, whiteEntryId: 11, blackEntryId: 26}, // 1500 / 0 / 750 / 0
      {board: 12, whiteEntryId: 27, blackEntryId: 12}, // 700 / 0 / 1450 / 0
      {board: 13, whiteEntryId: 13, blackEntryId: 28}, // 1400 / 0 / 650 / 0
      {board: 14, whiteEntryId: 29, blackEntryId: 14}, // 600 / 0 / 1350 / 0
      {board: 15, whiteEntryId: 15, blackEntryId: 30}, // 1300 / 0 / 550 / 0
    ])
  })

  it('round 2: round 1 results split the field into score groups', () => {
    const round1: PairingResult[] = [
      {board: 1, whiteEntryId: 1, blackEntryId: 16},
      {board: 2, whiteEntryId: 17, blackEntryId: 2},
      {board: 3, whiteEntryId: 3, blackEntryId: 18},
      {board: 4, whiteEntryId: 19, blackEntryId: 4},
      {board: 5, whiteEntryId: 5, blackEntryId: 20},
      {board: 6, whiteEntryId: 21, blackEntryId: 6},
      {board: 7, whiteEntryId: 7, blackEntryId: 22},
      {board: 8, whiteEntryId: 23, blackEntryId: 8},
      {board: 9, whiteEntryId: 9, blackEntryId: 24},
      {board: 10, whiteEntryId: 25, blackEntryId: 10},
      {board: 11, whiteEntryId: 11, blackEntryId: 26},
      {board: 12, whiteEntryId: 27, blackEntryId: 12},
      {board: 13, whiteEntryId: 13, blackEntryId: 28},
      {board: 14, whiteEntryId: 29, blackEntryId: 14},
      {board: 15, whiteEntryId: 15, blackEntryId: 30},
    ]
    const history = historyThroughRound(SEED, ratingOf, [round1])

    const engine = new SwissEngine()
    const results = engine.pair(players, {higherSeedColor: 'white', history})

    expect(results).toEqual([
      {board: 1, whiteEntryId: 10, blackEntryId: 1}, // 1550 / 1 / 2000 / 1
      {board: 2, whiteEntryId: 2, blackEntryId: 12}, // 1950 / 1 / 1450 / 1
      {board: 3, whiteEntryId: 4, blackEntryId: 18}, // 1850 / 1 / 1150 / 1
      {board: 4, whiteEntryId: 26, blackEntryId: 5}, // 750 / 1 / 1800 / 1
      {board: 5, whiteEntryId: 6, blackEntryId: 29}, // 1750 / 1 / 600 / 1
      {board: 6, whiteEntryId: 28, blackEntryId: 7}, // 650 / 1 / 1700 / 1
      {board: 7, whiteEntryId: 30, blackEntryId: 23}, // 550 / 1 / 900 / 0.5
      {board: 8, whiteEntryId: 8, blackEntryId: 9}, // 1650 / 0.5 / 1600 / 0.5
      {board: 9, whiteEntryId: 24, blackEntryId: 3}, // 850 / 0.5 / 1900 / 0
      {board: 10, whiteEntryId: 19, blackEntryId: 11}, // 1100 / 0 / 1500 / 0
      {board: 11, whiteEntryId: 20, blackEntryId: 13}, // 1050 / 0 / 1400 / 0
      {board: 12, whiteEntryId: 14, blackEntryId: 21}, // 1350 / 0 / 1000 / 0
      {board: 13, whiteEntryId: 22, blackEntryId: 15}, // 950 / 0 / 1300 / 0
      {board: 14, whiteEntryId: 16, blackEntryId: 25}, // 1250 / 0 / 800 / 0
      {board: 15, whiteEntryId: 27, blackEntryId: 17}, // 700 / 0 / 1200 / 0
    ])
  })

  it('round 3: round 2 results reshuffle the score groups again; a score group of four with two blocked opponent pairs still finds a legal internal pairing', () => {
    const round1: PairingResult[] = [
      {board: 1, whiteEntryId: 1, blackEntryId: 16},
      {board: 2, whiteEntryId: 17, blackEntryId: 2},
      {board: 3, whiteEntryId: 3, blackEntryId: 18},
      {board: 4, whiteEntryId: 19, blackEntryId: 4},
      {board: 5, whiteEntryId: 5, blackEntryId: 20},
      {board: 6, whiteEntryId: 21, blackEntryId: 6},
      {board: 7, whiteEntryId: 7, blackEntryId: 22},
      {board: 8, whiteEntryId: 23, blackEntryId: 8},
      {board: 9, whiteEntryId: 9, blackEntryId: 24},
      {board: 10, whiteEntryId: 25, blackEntryId: 10},
      {board: 11, whiteEntryId: 11, blackEntryId: 26},
      {board: 12, whiteEntryId: 27, blackEntryId: 12},
      {board: 13, whiteEntryId: 13, blackEntryId: 28},
      {board: 14, whiteEntryId: 29, blackEntryId: 14},
      {board: 15, whiteEntryId: 15, blackEntryId: 30},
    ]
    const round2: PairingResult[] = [
      {board: 1, whiteEntryId: 10, blackEntryId: 1},
      {board: 2, whiteEntryId: 2, blackEntryId: 12},
      {board: 3, whiteEntryId: 4, blackEntryId: 18},
      {board: 4, whiteEntryId: 26, blackEntryId: 5},
      {board: 5, whiteEntryId: 6, blackEntryId: 29},
      {board: 6, whiteEntryId: 28, blackEntryId: 7},
      {board: 7, whiteEntryId: 30, blackEntryId: 23},
      {board: 8, whiteEntryId: 8, blackEntryId: 9},
      {board: 9, whiteEntryId: 24, blackEntryId: 3},
      {board: 10, whiteEntryId: 19, blackEntryId: 11},
      {board: 11, whiteEntryId: 20, blackEntryId: 13},
      {board: 12, whiteEntryId: 14, blackEntryId: 21},
      {board: 13, whiteEntryId: 22, blackEntryId: 15},
      {board: 14, whiteEntryId: 16, blackEntryId: 25},
      {board: 15, whiteEntryId: 27, blackEntryId: 17},
    ]
    const history = historyThroughRound(SEED, ratingOf, [round1, round2])

    const engine = new SwissEngine()
    const results = engine.pair(players, {higherSeedColor: 'white', history})

    // The 0.5 pt group is {9, 14, 21, 24}, with player 29 (1 pt) floating
    // down to fill it out to 5. 9 and 24 already played in round 1, and 14
    // and 21 already played in round 2, so no floater choice can avoid a
    // further float - one of these five must always float on. Floating the
    // lowest-rated player (24) would strand 14 and 21 with each other as
    // their only remaining option, an illegal rematch, cascading into two
    // extra floats instead of one. So player 21 floats instead, leaving 14
    // and 24 to pair legally on board 12 - the best achievable outcome.
    expect(results).toEqual([
      {board: 1, whiteEntryId: 1, blackEntryId: 6}, // 2000 / 2 / 1750 / 2
      {board: 2, whiteEntryId: 7, blackEntryId: 2}, // 1700 / 2 / 1950 / 1.5
      {board: 3, whiteEntryId: 12, blackEntryId: 4}, // 1450 / 1.5 / 1850 / 1.5
      {board: 4, whiteEntryId: 18, blackEntryId: 5}, // 1150 / 1.5 / 1800 / 1.5
      {board: 5, whiteEntryId: 26, blackEntryId: 8}, // 750 / 1.5 / 1650 / 1.5
      {board: 6, whiteEntryId: 3, blackEntryId: 30}, // 1900 / 1 / 550 / 1.5
      {board: 7, whiteEntryId: 23, blackEntryId: 10}, // 900 / 1 / 1550 / 1
      {board: 8, whiteEntryId: 13, blackEntryId: 19}, // 1400 / 1 / 1100 / 1
      {board: 9, whiteEntryId: 15, blackEntryId: 27}, // 1300 / 1 / 700 / 1
      {board: 10, whiteEntryId: 28, blackEntryId: 16}, // 650 / 1 / 1250 / 1
      {board: 11, whiteEntryId: 29, blackEntryId: 24}, // 600 / 1 / 850 / 0.5
      {board: 12, whiteEntryId: 9, blackEntryId: 14}, // 1600 / 0.5 / 1350 / 0.5
      {board: 13, whiteEntryId: 11, blackEntryId: 21}, // 1500 / 0 / 1000 / 0.5
      {board: 14, whiteEntryId: 17, blackEntryId: 22}, // 1200 / 0 / 950 / 0
      {board: 15, whiteEntryId: 25, blackEntryId: 20}, // 800 / 0 / 1050 / 0
    ])
  })

  it('round 4: round 3 results reshuffle the score groups again', () => {
    const round1: PairingResult[] = [
      {board: 1, whiteEntryId: 1, blackEntryId: 16},
      {board: 2, whiteEntryId: 17, blackEntryId: 2},
      {board: 3, whiteEntryId: 3, blackEntryId: 18},
      {board: 4, whiteEntryId: 19, blackEntryId: 4},
      {board: 5, whiteEntryId: 5, blackEntryId: 20},
      {board: 6, whiteEntryId: 21, blackEntryId: 6},
      {board: 7, whiteEntryId: 7, blackEntryId: 22},
      {board: 8, whiteEntryId: 23, blackEntryId: 8},
      {board: 9, whiteEntryId: 9, blackEntryId: 24},
      {board: 10, whiteEntryId: 25, blackEntryId: 10},
      {board: 11, whiteEntryId: 11, blackEntryId: 26},
      {board: 12, whiteEntryId: 27, blackEntryId: 12},
      {board: 13, whiteEntryId: 13, blackEntryId: 28},
      {board: 14, whiteEntryId: 29, blackEntryId: 14},
      {board: 15, whiteEntryId: 15, blackEntryId: 30},
    ]
    const round2: PairingResult[] = [
      {board: 1, whiteEntryId: 10, blackEntryId: 1},
      {board: 2, whiteEntryId: 2, blackEntryId: 12},
      {board: 3, whiteEntryId: 4, blackEntryId: 18},
      {board: 4, whiteEntryId: 26, blackEntryId: 5},
      {board: 5, whiteEntryId: 6, blackEntryId: 29},
      {board: 6, whiteEntryId: 28, blackEntryId: 7},
      {board: 7, whiteEntryId: 30, blackEntryId: 23},
      {board: 8, whiteEntryId: 8, blackEntryId: 9},
      {board: 9, whiteEntryId: 24, blackEntryId: 3},
      {board: 10, whiteEntryId: 19, blackEntryId: 11},
      {board: 11, whiteEntryId: 20, blackEntryId: 13},
      {board: 12, whiteEntryId: 14, blackEntryId: 21},
      {board: 13, whiteEntryId: 22, blackEntryId: 15},
      {board: 14, whiteEntryId: 16, blackEntryId: 25},
      {board: 15, whiteEntryId: 27, blackEntryId: 17},
    ]
    const round3: PairingResult[] = [
      {board: 1, whiteEntryId: 1, blackEntryId: 6},
      {board: 2, whiteEntryId: 7, blackEntryId: 2},
      {board: 3, whiteEntryId: 12, blackEntryId: 4},
      {board: 4, whiteEntryId: 18, blackEntryId: 5},
      {board: 5, whiteEntryId: 26, blackEntryId: 8},
      {board: 6, whiteEntryId: 3, blackEntryId: 30},
      {board: 7, whiteEntryId: 23, blackEntryId: 10},
      {board: 8, whiteEntryId: 13, blackEntryId: 19},
      {board: 9, whiteEntryId: 15, blackEntryId: 27},
      {board: 10, whiteEntryId: 28, blackEntryId: 16},
      {board: 11, whiteEntryId: 29, blackEntryId: 24},
      {board: 12, whiteEntryId: 9, blackEntryId: 14},
      {board: 13, whiteEntryId: 11, blackEntryId: 21},
      {board: 14, whiteEntryId: 17, blackEntryId: 22},
      {board: 15, whiteEntryId: 25, blackEntryId: 20},
    ]
    const history = historyThroughRound(SEED, ratingOf, [round1, round2, round3])

    const engine = new SwissEngine()
    const results = engine.pair(players, {higherSeedColor: 'white', history})

    expect(results).toEqual([
      {board: 1, whiteEntryId: 4, blackEntryId: 1}, // 1850 / 2.5 / 2000 / 3
      {board: 2, whiteEntryId: 5, blackEntryId: 7}, // 1800 / 2.5 / 1700 / 2.5
      {board: 3, whiteEntryId: 2, blackEntryId: 15}, // 1950 / 2 / 1300 / 2
      {board: 4, whiteEntryId: 10, blackEntryId: 3}, // 1550 / 2 / 1900 / 2
      {board: 5, whiteEntryId: 6, blackEntryId: 26}, // 1750 / 2 / 750 / 2
      {board: 6, whiteEntryId: 8, blackEntryId: 28}, // 1650 / 2 / 650 / 2
      {board: 7, whiteEntryId: 18, blackEntryId: 9}, // 1150 / 1.5 / 1600 / 1.5
      {board: 8, whiteEntryId: 19, blackEntryId: 12}, // 1100 / 1.5 / 1450 / 1.5
      {board: 9, whiteEntryId: 24, blackEntryId: 13}, // 850 / 1.5 / 1400 / 1.5
      {board: 10, whiteEntryId: 30, blackEntryId: 11}, // 550 / 1.5 / 1500 / 1
      {board: 11, whiteEntryId: 16, blackEntryId: 27}, // 1250 / 1 / 700 / 1
      {board: 12, whiteEntryId: 23, blackEntryId: 17}, // 900 / 1 / 1200 / 1
      {board: 13, whiteEntryId: 20, blackEntryId: 29}, // 1050 / 0.5 / 600 / 1
      {board: 14, whiteEntryId: 14, blackEntryId: 25}, // 1350 / 0.5 / 800 / 0.5
      {board: 15, whiteEntryId: 21, blackEntryId: 22}, // 1000 / 0.5 / 950 / 0
    ])
  })

  it('round 5: round 4 results reshuffle the score groups again', () => {
    const round1: PairingResult[] = [
      {board: 1, whiteEntryId: 1, blackEntryId: 16},
      {board: 2, whiteEntryId: 17, blackEntryId: 2},
      {board: 3, whiteEntryId: 3, blackEntryId: 18},
      {board: 4, whiteEntryId: 19, blackEntryId: 4},
      {board: 5, whiteEntryId: 5, blackEntryId: 20},
      {board: 6, whiteEntryId: 21, blackEntryId: 6},
      {board: 7, whiteEntryId: 7, blackEntryId: 22},
      {board: 8, whiteEntryId: 23, blackEntryId: 8},
      {board: 9, whiteEntryId: 9, blackEntryId: 24},
      {board: 10, whiteEntryId: 25, blackEntryId: 10},
      {board: 11, whiteEntryId: 11, blackEntryId: 26},
      {board: 12, whiteEntryId: 27, blackEntryId: 12},
      {board: 13, whiteEntryId: 13, blackEntryId: 28},
      {board: 14, whiteEntryId: 29, blackEntryId: 14},
      {board: 15, whiteEntryId: 15, blackEntryId: 30},
    ]
    const round2: PairingResult[] = [
      {board: 1, whiteEntryId: 10, blackEntryId: 1},
      {board: 2, whiteEntryId: 2, blackEntryId: 12},
      {board: 3, whiteEntryId: 4, blackEntryId: 18},
      {board: 4, whiteEntryId: 26, blackEntryId: 5},
      {board: 5, whiteEntryId: 6, blackEntryId: 29},
      {board: 6, whiteEntryId: 28, blackEntryId: 7},
      {board: 7, whiteEntryId: 30, blackEntryId: 23},
      {board: 8, whiteEntryId: 8, blackEntryId: 9},
      {board: 9, whiteEntryId: 24, blackEntryId: 3},
      {board: 10, whiteEntryId: 19, blackEntryId: 11},
      {board: 11, whiteEntryId: 20, blackEntryId: 13},
      {board: 12, whiteEntryId: 14, blackEntryId: 21},
      {board: 13, whiteEntryId: 22, blackEntryId: 15},
      {board: 14, whiteEntryId: 16, blackEntryId: 25},
      {board: 15, whiteEntryId: 27, blackEntryId: 17},
    ]
    const round3: PairingResult[] = [
      {board: 1, whiteEntryId: 1, blackEntryId: 6},
      {board: 2, whiteEntryId: 7, blackEntryId: 2},
      {board: 3, whiteEntryId: 12, blackEntryId: 4},
      {board: 4, whiteEntryId: 18, blackEntryId: 5},
      {board: 5, whiteEntryId: 26, blackEntryId: 8},
      {board: 6, whiteEntryId: 3, blackEntryId: 30},
      {board: 7, whiteEntryId: 23, blackEntryId: 10},
      {board: 8, whiteEntryId: 13, blackEntryId: 19},
      {board: 9, whiteEntryId: 15, blackEntryId: 27},
      {board: 10, whiteEntryId: 28, blackEntryId: 16},
      {board: 11, whiteEntryId: 29, blackEntryId: 24},
      {board: 12, whiteEntryId: 9, blackEntryId: 14},
      {board: 13, whiteEntryId: 11, blackEntryId: 21},
      {board: 14, whiteEntryId: 17, blackEntryId: 22},
      {board: 15, whiteEntryId: 25, blackEntryId: 20},
    ]
    const round4: PairingResult[] = [
      {board: 1, whiteEntryId: 4, blackEntryId: 1},
      {board: 2, whiteEntryId: 5, blackEntryId: 7},
      {board: 3, whiteEntryId: 2, blackEntryId: 15},
      {board: 4, whiteEntryId: 10, blackEntryId: 3},
      {board: 5, whiteEntryId: 6, blackEntryId: 26},
      {board: 6, whiteEntryId: 8, blackEntryId: 28},
      {board: 7, whiteEntryId: 18, blackEntryId: 9},
      {board: 8, whiteEntryId: 19, blackEntryId: 12},
      {board: 9, whiteEntryId: 24, blackEntryId: 13},
      {board: 10, whiteEntryId: 30, blackEntryId: 11},
      {board: 11, whiteEntryId: 16, blackEntryId: 27},
      {board: 12, whiteEntryId: 23, blackEntryId: 17},
      {board: 13, whiteEntryId: 20, blackEntryId: 29},
      {board: 14, whiteEntryId: 14, blackEntryId: 25},
      {board: 15, whiteEntryId: 21, blackEntryId: 22},
    ]
    const history = historyThroughRound(SEED, ratingOf, [round1, round2, round3, round4])

    const engine = new SwissEngine()
    const results = engine.pair(players, {higherSeedColor: 'white', history})

    expect(results).toEqual([
      {board: 1, whiteEntryId: 1, blackEntryId: 7}, // 2000 / 4 / 1700 / 3.5
      {board: 2, whiteEntryId: 3, blackEntryId: 6}, // 1900 / 3 / 1750 / 3
      {board: 3, whiteEntryId: 28, blackEntryId: 2}, // 650 / 2.5 / 1950 / 2.5
      {board: 4, whiteEntryId: 15, blackEntryId: 4}, // 1300 / 2.5 / 1850 / 2.5
      {board: 5, whiteEntryId: 13, blackEntryId: 5}, // 1400 / 2.5 / 1800 / 2.5
      {board: 6, whiteEntryId: 12, blackEntryId: 8}, // 1450 / 2.5 / 1650 / 2.5
      {board: 7, whiteEntryId: 9, blackEntryId: 30}, // 1600 / 2 / 550 / 2
      {board: 8, whiteEntryId: 10, blackEntryId: 18}, // 1550 / 2 / 1150 / 2
      {board: 9, whiteEntryId: 26, blackEntryId: 16}, // 750 / 2 / 1250 / 2
      {board: 10, whiteEntryId: 11, blackEntryId: 23}, // 1500 / 1.5 / 900 / 1.5
      {board: 11, whiteEntryId: 17, blackEntryId: 21}, // 1200 / 1.5 / 1000 / 1.5
      {board: 12, whiteEntryId: 24, blackEntryId: 19}, // 850 / 1.5 / 1100 / 1.5
      {board: 13, whiteEntryId: 25, blackEntryId: 29}, // 800 / 1 / 600 / 1.5
      {board: 14, whiteEntryId: 20, blackEntryId: 14}, // 1050 / 1 / 1350 / 1
      {board: 15, whiteEntryId: 22, blackEntryId: 27}, // 950 / 0 / 700 / 1
    ])
  })
})
