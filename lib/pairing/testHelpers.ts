import type {PairingInput, RoundHistoryEntry} from './types'

interface EntryProps {
  entryId: number
  rating: number | null
  opts?: {team?: string | null; uscfId?: string}
}

export function entry({entryId, rating, opts = {}}: EntryProps): PairingInput {
  return {
    entryId,
    uscfId: opts.uscfId ?? String(entryId),
    name: `Player ${entryId}`,
    rating,
    team: opts.team ?? null,
  }
}

interface GameProps {
  round: number
  uscfId: string
  opponentUscfId: string | null
  color: 'white' | 'black' | null
  points?: number
}

export function game({round, uscfId, opponentUscfId, color, points}: GameProps): RoundHistoryEntry {
  return {round, uscfId, opponentUscfId, color, points}
}

export function boards(
  results: {board: number; whiteEntryId: number | null; blackEntryId: number | null}[],
) {
  return results.map((r) => new Set([r.whiteEntryId, r.blackEntryId]))
}
