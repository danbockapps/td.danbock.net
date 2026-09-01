import {describe, expect, it} from 'vitest'
import {getDueColor} from './dueColor'
import type {RoundHistoryEntry} from './types'

function game(
  round: number,
  uscfId: string,
  opponentUscfId: string | null,
  color: 'white' | 'black' | null,
): RoundHistoryEntry {
  return {round, uscfId, opponentUscfId, color}
}

describe('getDueColor', () => {
  it('has no preference with no history', () => {
    expect(getDueColor('A', [])).toEqual({color: null, strength: 'none'})
  })

  it('has no preference when only byes are in history', () => {
    const history = [game(1, 'A', null, null)]
    expect(getDueColor('A', history)).toEqual({color: null, strength: 'none'})
  })

  it('is strongly due the opposite color after one game', () => {
    const history = [game(1, 'A', 'B', 'white')]
    expect(getDueColor('A', history)).toEqual({color: 'black', strength: 'strong'})
  })

  it('is absolutely due the opposite color after two games with the same color', () => {
    const history = [game(1, 'A', 'B', 'white'), game(2, 'A', 'C', 'white')]
    expect(getDueColor('A', history)).toEqual({color: 'black', strength: 'absolute'})
  })

  it('is weakly due the opposite of the most recent color after alternating games', () => {
    const history = [game(1, 'A', 'B', 'black'), game(2, 'A', 'C', 'white')]
    expect(getDueColor('A', history)).toEqual({color: 'black', strength: 'weak'})
  })

  it('ignores byes when looking at the most recent games', () => {
    const history = [
      game(1, 'A', 'B', 'white'),
      game(2, 'A', 'C', 'white'),
      game(3, 'A', null, null),
    ]
    expect(getDueColor('A', history)).toEqual({color: 'black', strength: 'absolute'})
  })

  it("only considers the given player's games", () => {
    const history = [game(1, 'B', 'C', 'white')]
    expect(getDueColor('A', history)).toEqual({color: null, strength: 'none'})
  })
})
