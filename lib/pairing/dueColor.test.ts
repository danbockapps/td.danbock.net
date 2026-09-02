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
    expect(getDueColor('A', [])).toEqual({color: null, strength: 0})
  })

  it('has no preference when only byes are in history', () => {
    const history = [game(1, 'A', null, null)]
    expect(getDueColor('A', history)).toEqual({color: null, strength: 0})
  })

  it('is due the opposite color with strength 1 after one game', () => {
    const history = [game(1, 'A', 'B', 'white')]
    expect(getDueColor('A', history)).toEqual({color: 'black', strength: 1})
  })

  it('is due the opposite color with strength 2 after two games with the same color', () => {
    const history = [game(1, 'A', 'B', 'white'), game(2, 'A', 'C', 'white')]
    expect(getDueColor('A', history)).toEqual({color: 'black', strength: 2})
  })

  it('is due the opposite of the most recent color with strength 1 after alternating games', () => {
    const history = [game(1, 'A', 'B', 'black'), game(2, 'A', 'C', 'white')]
    expect(getDueColor('A', history)).toEqual({color: 'black', strength: 1})
  })

  it('reports strength equal to the length of the current same-color streak', () => {
    const history = [
      game(1, 'A', 'B', 'white'),
      game(2, 'A', 'C', 'black'),
      game(3, 'A', 'D', 'black'),
      game(4, 'A', 'E', 'black'),
    ]
    expect(getDueColor('A', history)).toEqual({color: 'white', strength: 3})
  })

  it('ignores byes when looking at the most recent games', () => {
    const history = [
      game(1, 'A', 'B', 'white'),
      game(2, 'A', 'C', 'white'),
      game(3, 'A', null, null),
    ]
    expect(getDueColor('A', history)).toEqual({color: 'black', strength: 2})
  })

  it("only considers the given player's games", () => {
    const history = [game(1, 'B', 'C', 'white')]
    expect(getDueColor('A', history)).toEqual({color: null, strength: 0})
  })
})
