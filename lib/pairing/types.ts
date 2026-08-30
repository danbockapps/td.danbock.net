export interface PairingInput {
  entryId: number
  name: string
  rating: number | null
}

export interface PairingResult {
  board: number
  whiteEntryId: number | null
  blackEntryId: number | null
}

export interface PairingOptions {
  higherSeedColor: 'white' | 'black'
}

export interface PairingEngine {
  pair(entries: PairingInput[], options: PairingOptions): PairingResult[]
}
