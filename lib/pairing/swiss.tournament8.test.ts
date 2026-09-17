import {describe, expect, it} from 'vitest'
import {SwissEngine} from './swiss'
import {entry, game} from './testHelpers'
import type {PairingResult, RoundHistoryEntry} from './types'

// Simulates a full three-round Swiss tournament with eight players,
// verifying pairing, board number, and color assignment for every round.
// Unlike the six-player tournament (see swiss.tournament.test.ts), game
// results aren't hand-picked: each game is decided by a seeded random
// number generator, giving the higher-rated player a 60% chance to win, a
// 25% chance of a draw, and a 15% chance the lower-rated player upsets
// them. The seed is fixed, so the sequence of outcomes below - and
// therefore every pairing that follows from it - is reproducible.
//
// Players (entryId/uscfId, rating):
//   1: 2000   2: 1850   3: 1700   4: 1550
//   5: 1400   6: 1250   7: 1100   8: 950

const p1 = entry({entryId: 1, rating: 2000})
const p2 = entry({entryId: 2, rating: 1850})
const p3 = entry({entryId: 3, rating: 1700})
const p4 = entry({entryId: 4, rating: 1550})
const p5 = entry({entryId: 5, rating: 1400})
const p6 = entry({entryId: 6, rating: 1250})
const p7 = entry({entryId: 7, rating: 1100})
const p8 = entry({entryId: 8, rating: 950})
const players = [p1, p2, p3, p4, p5, p6, p7, p8]
const ratingOf = new Map(players.map((p) => [p.uscfId, p.rating as number]))

// A small seeded PRNG (mulberry32) so the "random" results below are
// reproducible: the same seed always produces the same sequence of game
// outcomes, so the expected pairings in each round are stable.
function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const SEED = 20260917

// Decides one game's result: 60% the higher-rated player wins, 25% draw,
// 15% the lower-rated player wins. Returns history entries for both sides.
function playGame(
  rng: () => number,
  round: number,
  whiteUscfId: string,
  blackUscfId: string,
): RoundHistoryEntry[] {
  const whiteRating = ratingOf.get(whiteUscfId) ?? 0
  const blackRating = ratingOf.get(blackUscfId) ?? 0
  const higherIsWhite = whiteRating >= blackRating
  const roll = rng()

  let whitePoints: number
  if (roll < 0.6) {
    whitePoints = higherIsWhite ? 1 : 0
  } else if (roll < 0.85) {
    whitePoints = 0.5
  } else {
    whitePoints = higherIsWhite ? 0 : 1
  }

  return [
    game({
      round,
      uscfId: whiteUscfId,
      opponentUscfId: blackUscfId,
      color: 'white',
      points: whitePoints,
    }),
    game({
      round,
      uscfId: blackUscfId,
      opponentUscfId: whiteUscfId,
      color: 'black',
      points: 1 - whitePoints,
    }),
  ]
}

// Plays every board of a round (a bye, if any, earns a full point with no
// color/opponent) and returns the round's history entries.
function playRound(
  rng: () => number,
  round: number,
  results: PairingResult[],
): RoundHistoryEntry[] {
  const entries: RoundHistoryEntry[] = []
  for (const r of results) {
    if (r.whiteEntryId === null || r.blackEntryId === null) {
      const byeId = r.whiteEntryId ?? r.blackEntryId
      entries.push(
        game({round, uscfId: String(byeId), opponentUscfId: null, color: null, points: 1}),
      )
      continue
    }
    entries.push(...playGame(rng, round, String(r.whiteEntryId), String(r.blackEntryId)))
  }
  return entries
}

// Replays every round up to (but not including) the round being paired,
// from a fresh RNG each time, so a test's result never depends on how many
// random draws an earlier test in this file happened to make.
function historyThroughRound(roundsSoFar: PairingResult[][]): RoundHistoryEntry[] {
  const rng = mulberry32(SEED)
  return roundsSoFar.flatMap((results, index) => playRound(rng, index + 1, results))
}

describe('SwissEngine: eight-player, three-round tournament with randomized results', () => {
  it('round 1: no standings yet, so one score group paired by rating (top half vs bottom half)', () => {
    // Standings before round 1: everyone at 0 points (no history).
    const engine = new SwissEngine()

    const results = engine.pair(players, {higherSeedColor: 'white'})

    expect(results).toEqual([
      {board: 1, whiteEntryId: 1, blackEntryId: 5},
      {board: 2, whiteEntryId: 6, blackEntryId: 2},
      {board: 3, whiteEntryId: 3, blackEntryId: 7},
      {board: 4, whiteEntryId: 8, blackEntryId: 4},
    ])
  })

  it('round 2: round 1 results split the field into 1pt, 0.5pt, and 0pt groups', () => {
    // Round 1 results (seeded RNG): Player 1 and Player 5 drew, Player 2
    // beat Player 6, Player 3 beat Player 7, Player 4 beat Player 8.
    //
    // Standings before round 2: 1pt - Player 2, Player 3, Player 4;
    //                           0.5pt - Player 1, Player 5;
    //                           0pt - Player 6, Player 7, Player 8.
    const round1: PairingResult[] = [
      {board: 1, whiteEntryId: 1, blackEntryId: 5},
      {board: 2, whiteEntryId: 6, blackEntryId: 2},
      {board: 3, whiteEntryId: 3, blackEntryId: 7},
      {board: 4, whiteEntryId: 8, blackEntryId: 4},
    ]
    const history = historyThroughRound([round1])

    const engine = new SwissEngine()
    const results = engine.pair(players, {higherSeedColor: 'white', history})

    // The 1pt group has 3 players; Player 4 (lowest-rated of the tied
    // three) floats down and plays Player 1, the highest-rated player in
    // the 0.5pt group. That leaves Player 5 alone in the 0.5pt group, so
    // it floats further and plays Player 6, the highest-rated player in
    // the 0pt group. Players 2/3 and 7/8 pair off within their own groups.
    expect(results).toEqual([
      {board: 1, whiteEntryId: 2, blackEntryId: 3},
      {board: 2, whiteEntryId: 4, blackEntryId: 1},
      {board: 3, whiteEntryId: 5, blackEntryId: 6},
      {board: 4, whiteEntryId: 7, blackEntryId: 8},
    ])
  })

  it('round 3: round 2 results reshuffle the score groups again', () => {
    const round1: PairingResult[] = [
      {board: 1, whiteEntryId: 1, blackEntryId: 5},
      {board: 2, whiteEntryId: 6, blackEntryId: 2},
      {board: 3, whiteEntryId: 3, blackEntryId: 7},
      {board: 4, whiteEntryId: 8, blackEntryId: 4},
    ]
    const round2: PairingResult[] = [
      {board: 1, whiteEntryId: 2, blackEntryId: 3},
      {board: 2, whiteEntryId: 4, blackEntryId: 1},
      {board: 3, whiteEntryId: 5, blackEntryId: 6},
      {board: 4, whiteEntryId: 7, blackEntryId: 8},
    ]
    const history = historyThroughRound([round1, round2])

    // Round 2 results (seeded RNG): Player 3 beat Player 2, Player 1 and
    // Player 4 drew, Player 5 beat Player 6, Player 7 and Player 8 drew.
    //
    // Standings before round 3: 2pt - Player 3;
    //                         1.5pt - Player 1, Player 5;
    //                           1pt - Player 2, Player 4;
    //                         0.5pt - Player 7, Player 8;
    //                           0pt - Player 6.
    const engine = new SwissEngine()
    const results = engine.pair(players, {higherSeedColor: 'white', history})

    // Every group is a singleton or has an odd remainder once its floater
    // is placed, so the floats cascade all the way down: Player 3 (2pt,
    // alone) floats and plays Player 1, the highest-rated player in the
    // 1.5pt group; that leaves Player 5 alone there, so it floats and
    // plays Player 2, the highest-rated player in the 1pt group; that
    // leaves Player 4 alone there, so it floats and plays Player 7, the
    // highest-rated player in the 0.5pt group; that leaves Player 8 alone
    // there, so it floats down to play Player 6, the only player in the
    // 0pt group. Boards are ordered by the pair's combined score (3.5,
    // 2.5, 1.5, 0.5).
    expect(results).toEqual([
      {board: 1, whiteEntryId: 1, blackEntryId: 3},
      {board: 2, whiteEntryId: 5, blackEntryId: 2},
      {board: 3, whiteEntryId: 7, blackEntryId: 4},
      {board: 4, whiteEntryId: 6, blackEntryId: 8},
    ])
  })
})
