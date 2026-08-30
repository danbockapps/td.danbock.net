export function formatRating(rating: number | null): string {
  return rating === null ? 'Unrated' : String(rating)
}

const OUTCOME_LABELS: Record<string, string> = {
  white: '1-0',
  black: '0-1',
  draw: '½-½',
  white_forfeit: '0-1 (forfeit)',
  black_forfeit: '1-0 (forfeit)',
  double_forfeit: '0-0 (double forfeit)',
}

export function formatResult(outcome: string | null | undefined): string {
  if (!outcome) return '—'
  return OUTCOME_LABELS[outcome] ?? outcome
}
