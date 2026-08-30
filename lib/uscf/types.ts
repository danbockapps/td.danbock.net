export interface UscfLookupResult {
  name: string
  rating: number | null
}

export interface UscfLookup {
  lookup(uscfId: string): Promise<UscfLookupResult>
}
