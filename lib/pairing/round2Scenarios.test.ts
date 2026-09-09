import {describe, expect, it} from 'vitest'
import {RatingDiffMinimizerEngine} from './ratingDiffMinimizer'
import type {PairingInput, RoundHistoryEntry} from './types'

// Round 1 pairings from a real tournament, used as the basis for these
// round 2 scenarios:
//
// Board  White                        Black                      Result
// 1      JOHN HANNA (1906)             Dan Bock (1894)             —
// 2      Jason Turner (1700)           Benedikt Brandt (1834)      —
// 3      Ed Larson (1658)              Stephen Lee Carlson (1508)  —
// 4      Richard Gary Fox Jr. (1073)   PHIL HANNA (1269)           —

const engine = new RatingDiffMinimizerEngine()

const johnHanna: PairingInput = {
  entryId: 1,
  uscfId: '1',
  name: 'JOHN HANNA',
  rating: 1906,
  team: null,
}
const danBock: PairingInput = {entryId: 2, uscfId: '2', name: 'Dan Bock', rating: 1894, team: null}
const jasonTurner: PairingInput = {
  entryId: 3,
  uscfId: '3',
  name: 'Jason Turner',
  rating: 1700,
  team: null,
}
const benediktBrandt: PairingInput = {
  entryId: 4,
  uscfId: '4',
  name: 'Benedikt Brandt',
  rating: 1834,
  team: null,
}
const edLarson: PairingInput = {
  entryId: 5,
  uscfId: '5',
  name: 'Ed Larson',
  rating: 1658,
  team: null,
}
const stephenCarlson: PairingInput = {
  entryId: 6,
  uscfId: '6',
  name: 'Stephen Lee Carlson',
  rating: 1508,
  team: null,
}
const richardFox: PairingInput = {
  entryId: 7,
  uscfId: '7',
  name: 'Richard Gary Fox Jr.',
  rating: 1073,
  team: null,
}
const philHanna: PairingInput = {
  entryId: 8,
  uscfId: '8',
  name: 'PHIL HANNA',
  rating: 1269,
  team: null,
}

// Full round 1 history. A scenario only needs the entries for whichever
// players return — the engine looks up history by uscfId, so rows for
// players absent from `entries` are simply never matched.
function game(white: PairingInput, black: PairingInput): [RoundHistoryEntry, RoundHistoryEntry] {
  return [
    {round: 1, uscfId: white.uscfId, opponentUscfId: black.uscfId, color: 'white'},
    {round: 1, uscfId: black.uscfId, opponentUscfId: white.uscfId, color: 'black'},
  ]
}

const round1History: RoundHistoryEntry[] = [
  ...game(johnHanna, danBock),
  ...game(jasonTurner, benediktBrandt),
  ...game(edLarson, stephenCarlson),
  ...game(richardFox, philHanna),
]

function newPlayer(entryId: number, rating: number): PairingInput {
  return {entryId, uscfId: String(entryId), name: `New Player ${entryId}`, rating, team: null}
}

describe('round 2 pairings with players returning from a real round 1', () => {
  it('pairs 4 returning players plus 2 new players', () => {
    const p1800 = newPlayer(100, 1800)
    const p1750 = newPlayer(101, 1750)
    const entries = [johnHanna, danBock, jasonTurner, benediktBrandt, p1800, p1750]
    const results = engine.pair(entries, {higherSeedColor: 'white', history: round1History})

    expect(results).toEqual([
      {board: 1, whiteEntryId: benediktBrandt.entryId, blackEntryId: johnHanna.entryId},
      {board: 2, whiteEntryId: danBock.entryId, blackEntryId: p1800.entryId},
      {board: 3, whiteEntryId: p1750.entryId, blackEntryId: jasonTurner.entryId},
    ])
  })

  it('pairs 5 returning players plus 3 new players', () => {
    const p1650 = newPlayer(100, 1650)
    const p1500 = newPlayer(101, 1500)
    const p1400 = newPlayer(102, 1400)
    const entries = [johnHanna, danBock, jasonTurner, benediktBrandt, edLarson, p1650, p1500, p1400]
    const results = engine.pair(entries, {higherSeedColor: 'white', history: round1History})

    expect(results).toEqual([
      {board: 1, whiteEntryId: benediktBrandt.entryId, blackEntryId: johnHanna.entryId},
      {board: 2, whiteEntryId: danBock.entryId, blackEntryId: jasonTurner.entryId},
      {board: 3, whiteEntryId: p1650.entryId, blackEntryId: edLarson.entryId},
      {board: 4, whiteEntryId: p1400.entryId, blackEntryId: p1500.entryId},
    ])
  })

  it('pairs 6 returning players plus 4 new players', () => {
    const p1950 = newPlayer(100, 1950)
    const p1720 = newPlayer(101, 1720)
    const p1600 = newPlayer(102, 1600)
    const p1450 = newPlayer(103, 1450)
    const entries = [
      johnHanna,
      danBock,
      jasonTurner,
      benediktBrandt,
      edLarson,
      stephenCarlson,
      p1950,
      p1720,
      p1600,
      p1450,
    ]
    const results = engine.pair(entries, {higherSeedColor: 'white', history: round1History})

    expect(results).toEqual([
      {board: 1, whiteEntryId: p1950.entryId, blackEntryId: johnHanna.entryId},
      {board: 2, whiteEntryId: danBock.entryId, blackEntryId: benediktBrandt.entryId},
      {board: 3, whiteEntryId: p1720.entryId, blackEntryId: jasonTurner.entryId},
      {board: 4, whiteEntryId: p1600.entryId, blackEntryId: edLarson.entryId},
      {board: 5, whiteEntryId: stephenCarlson.entryId, blackEntryId: p1450.entryId},
    ])
  })

  it('pairs all 7 returning players plus 3 new players', () => {
    const p1300 = newPlayer(100, 1300)
    const p1150 = newPlayer(101, 1150)
    const p1000 = newPlayer(102, 1000)
    const entries = [
      johnHanna,
      danBock,
      jasonTurner,
      benediktBrandt,
      edLarson,
      stephenCarlson,
      richardFox,
      p1300,
      p1150,
      p1000,
    ]
    const results = engine.pair(entries, {higherSeedColor: 'white', history: round1History})

    expect(results).toEqual([
      {board: 1, whiteEntryId: benediktBrandt.entryId, blackEntryId: johnHanna.entryId},
      {board: 2, whiteEntryId: danBock.entryId, blackEntryId: edLarson.entryId},
      {board: 3, whiteEntryId: stephenCarlson.entryId, blackEntryId: jasonTurner.entryId},
      {board: 4, whiteEntryId: p1150.entryId, blackEntryId: p1300.entryId},
      {board: 5, whiteEntryId: p1000.entryId, blackEntryId: richardFox.entryId},
    ])
  })
})
