export interface PairingInput {
  entryId: number
  uscfId: string
  name: string
  rating: number | null
  team: string | null
}

export interface PairingResult {
  board: number
  whiteEntryId: number | null
  blackEntryId: number | null
}

// One row per player per prior round. A bye is represented by a null
// opponent/color.
export interface RoundHistoryEntry {
  round: number
  uscfId: string
  opponentUscfId: string | null
  color: 'white' | 'black' | null
  // Points earned that round (1 win, 0.5 draw, 0 loss; a bye is usually 1).
  // Optional so callers that don't track scores yet can omit it; missing
  // entries are treated as 0 points for score-group pairing.
  points?: number
}

export interface PairingOptions {
  higherSeedColor: 'white' | 'black'
  history?: RoundHistoryEntry[]
}

export interface PairingEngine {
  pair(entries: PairingInput[], options: PairingOptions): PairingResult[]

  // Optional: the best sheet plus the next-best alternatives (index 0 is
  // the same sheet `pair` returns), for engines that can rank more than one
  // legal pairing sheet.
  pairAlternatives?(entries: PairingInput[], options: PairingOptions): PairingResult[][]
}
