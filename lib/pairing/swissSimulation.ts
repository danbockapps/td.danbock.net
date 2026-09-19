import {game} from './testHelpers'
import type {PairingResult, RoundHistoryEntry} from './types'

// A small seeded PRNG (mulberry32) so the "random" results in tournament
// simulation tests are reproducible: the same seed always produces the same
// sequence of game outcomes, so the expected pairings in each round are
// stable.
export function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Decides one game's result: 60% the higher-rated player wins, 25% draw,
// 15% the lower-rated player wins. Returns history entries for both sides.
export function playGame(
  rng: () => number,
  ratingOf: Map<string, number>,
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
export function playRound(
  rng: () => number,
  ratingOf: Map<string, number>,
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
    entries.push(...playGame(rng, ratingOf, round, String(r.whiteEntryId), String(r.blackEntryId)))
  }
  return entries
}

// Replays every round up to (but not including) the round being paired, from
// a fresh RNG each time, so a test's result never depends on how many random
// draws an earlier test in this file happened to make.
export function historyThroughRound(
  seed: number,
  ratingOf: Map<string, number>,
  roundsSoFar: PairingResult[][],
): RoundHistoryEntry[] {
  const rng = mulberry32(seed)
  return roundsSoFar.flatMap((results, index) => playRound(rng, ratingOf, index + 1, results))
}
