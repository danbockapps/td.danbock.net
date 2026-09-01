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
}

export interface PairingOptions {
  higherSeedColor: 'white' | 'black'
  history?: RoundHistoryEntry[]
}

export interface PairingEngine {
  pair(entries: PairingInput[], options: PairingOptions): PairingResult[]
}
