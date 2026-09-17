import {describe, expect, it} from 'vitest'
import {SwissEngine} from './swiss'
import {entry, game} from './testHelpers'
import type {RoundHistoryEntry} from './types'

// Simulates a full three-round Swiss tournament with the same six players
// throughout, verifying pairing, board number, and color assignment for
// every round. Each test re-derives the round's expected pairings from the
// standings (shown in a comment) going into that round, and then hard-codes
// the game results that feed the next round.
//
// Players (entryId/uscfId, rating):
//   1: 2000   2: 1800   3: 1600   4: 1400   5: 1200   6: 1000

const p1 = entry({entryId: 1, rating: 2000})
const p2 = entry({entryId: 2, rating: 1800})
const p3 = entry({entryId: 3, rating: 1600})
const p4 = entry({entryId: 4, rating: 1400})
const p5 = entry({entryId: 5, rating: 1200})
const p6 = entry({entryId: 6, rating: 1000})
const players = [p1, p2, p3, p4, p5, p6]

describe('SwissEngine: six-player, three-round tournament', () => {
  it('round 1: no standings yet, so one score group paired by rating (top half vs bottom half)', () => {
    // Standings before round 1: everyone at 0 points (no history).
    const engine = new SwissEngine()

    const results = engine.pair(players, {higherSeedColor: 'white'})

    // Result of this round (fed into round 2 below): 1 beats 4, 2 beats 5,
    // 3 beats 6 - the higher-rated player wins every board.
    expect(results).toEqual([
      {board: 1, whiteEntryId: 1, blackEntryId: 4},
      {board: 2, whiteEntryId: 5, blackEntryId: 2},
      {board: 3, whiteEntryId: 3, blackEntryId: 6},
    ])
  })

  it('round 2: standings from round 1 form a 1pt and a 0pt group, each odd, so one player floats', () => {
    // Standings before round 2: 1pt - Player 1, Player 2, Player 3;
    //                            0pt - Player 4, Player 5, Player 6.
    const history: RoundHistoryEntry[] = [
      game({round: 1, uscfId: '1', opponentUscfId: '4', color: 'white', points: 1}),
      game({round: 1, uscfId: '4', opponentUscfId: '1', color: 'black', points: 0}),
      game({round: 1, uscfId: '2', opponentUscfId: '5', color: 'black', points: 1}),
      game({round: 1, uscfId: '5', opponentUscfId: '2', color: 'white', points: 0}),
      game({round: 1, uscfId: '3', opponentUscfId: '6', color: 'white', points: 1}),
      game({round: 1, uscfId: '6', opponentUscfId: '3', color: 'black', points: 0}),
    ]

    const engine = new SwissEngine()
    const results = engine.pair(players, {higherSeedColor: 'white', history})

    // In the 1pt group, Player 3 (lowest-rated of the three tied players)
    // floats down and plays Player 4, the highest-rated player in the 0pt
    // group. Players 1 and 2 pair off in the 1pt group; Players 5 and 6
    // pair off in what's left of the 0pt group.
    //
    // Result of this round (fed into round 3 below): Player 1 beats
    // Player 2, Player 3 beats Player 4, Player 5 beats Player 6.
    expect(results).toEqual([
      {board: 1, whiteEntryId: 2, blackEntryId: 1},
      {board: 2, whiteEntryId: 4, blackEntryId: 3},
      {board: 3, whiteEntryId: 6, blackEntryId: 5},
    ])
  })

  it('round 3: two players in the same score group already played each other in round 1, forcing a float', () => {
    // Standings before round 3: 2pt - Player 1, Player 3;
    //                            1pt - Player 2, Player 5;
    //                            0pt - Player 4, Player 6.
    const history: RoundHistoryEntry[] = [
      game({round: 1, uscfId: '1', opponentUscfId: '4', color: 'white', points: 1}),
      game({round: 1, uscfId: '4', opponentUscfId: '1', color: 'black', points: 0}),
      game({round: 1, uscfId: '2', opponentUscfId: '5', color: 'black', points: 1}),
      game({round: 1, uscfId: '5', opponentUscfId: '2', color: 'white', points: 0}),
      game({round: 1, uscfId: '3', opponentUscfId: '6', color: 'white', points: 1}),
      game({round: 1, uscfId: '6', opponentUscfId: '3', color: 'black', points: 0}),
      game({round: 2, uscfId: '2', opponentUscfId: '1', color: 'white', points: 0}),
      game({round: 2, uscfId: '1', opponentUscfId: '2', color: 'black', points: 1}),
      game({round: 2, uscfId: '4', opponentUscfId: '3', color: 'white', points: 0}),
      game({round: 2, uscfId: '3', opponentUscfId: '4', color: 'black', points: 1}),
      game({round: 2, uscfId: '6', opponentUscfId: '5', color: 'white', points: 0}),
      game({round: 2, uscfId: '5', opponentUscfId: '6', color: 'black', points: 1}),
    ]

    const engine = new SwissEngine()
    const results = engine.pair(players, {higherSeedColor: 'white', history})

    // The 2pt group (Players 1 and 3) hasn't played each other, so it
    // pairs directly. The 1pt group (Players 2 and 5) already played each
    // other in round 1, so neither can pair within the group: both float
    // down to the 0pt group, which matches Player 2 with Player 6 and
    // Player 5 with Player 4 (the pairing that matches both floaters,
    // rather than leaving one unmatched).
    //
    // Colors go to whoever is due: Players 1 and 3 are both due white
    // (each played black last round), so the higher-rated Player 1 wins
    // the conflict and gets white. Players 2 and 6 are both due black, so
    // higher-rated Player 2 wins that conflict and gets black. Players 5
    // and 4 are due opposite colors (white and black respectively), so
    // each simply gets their due color.
    expect(results).toEqual([
      {board: 1, whiteEntryId: 1, blackEntryId: 3},
      {board: 2, whiteEntryId: 6, blackEntryId: 2},
      {board: 3, whiteEntryId: 5, blackEntryId: 4},
    ])
  })
})
