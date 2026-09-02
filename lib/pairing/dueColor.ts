import type {RoundHistoryEntry} from './types'

export interface DueColor {
  color: 'white' | 'black' | null
  // Length of the player's current same-color streak. Higher means a
  // stronger claim to the opposite color: someone with 3 blacks in a row
  // is more due for white than someone with 2 blacks in a row.
  strength: number
}

const opposite = (color: 'white' | 'black'): 'white' | 'black' =>
  color === 'white' ? 'black' : 'white'

// Byes don't count as games played for color-history purposes.
export function getDueColor(uscfId: string, history: RoundHistoryEntry[]): DueColor {
  const games = history
    .filter((h) => h.uscfId === uscfId && h.color !== null)
    .sort((a, b) => a.round - b.round)

  if (games.length === 0) return {color: null, strength: 0}

  const mostRecent = games[games.length - 1].color as 'white' | 'black'
  const dueColor = opposite(mostRecent)

  let streak = 0
  for (let i = games.length - 1; i >= 0; i--) {
    if (games[i].color !== mostRecent) break
    streak++
  }

  return {color: dueColor, strength: streak}
}
