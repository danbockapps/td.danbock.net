import type {RoundHistoryEntry} from './types'

export type DueColorStrength = 'none' | 'weak' | 'strong' | 'absolute'

export interface DueColor {
  color: 'white' | 'black' | null
  strength: DueColorStrength
}

const opposite = (color: 'white' | 'black'): 'white' | 'black' =>
  color === 'white' ? 'black' : 'white'

// Byes don't count as games played for color-history purposes.
export function getDueColor(uscfId: string, history: RoundHistoryEntry[]): DueColor {
  const games = history
    .filter((h) => h.uscfId === uscfId && h.color !== null)
    .sort((a, b) => a.round - b.round)

  if (games.length === 0) return {color: null, strength: 'none'}

  const mostRecent = games[games.length - 1].color as 'white' | 'black'
  const dueColor = opposite(mostRecent)

  if (games.length === 1) return {color: dueColor, strength: 'strong'}

  const secondMostRecent = games[games.length - 2].color as 'white' | 'black'
  return {
    color: dueColor,
    strength: secondMostRecent === mostRecent ? 'absolute' : 'weak',
  }
}
