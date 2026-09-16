import {RESULT_OUTCOME_LABELS, type ResultOutcome} from '@/lib/result-outcomes'

export function formatRating(rating: number | null): string {
  return rating === null ? 'Unrated' : String(rating)
}

export function formatResult(outcome: string | null | undefined): string {
  if (!outcome) return '—'
  return RESULT_OUTCOME_LABELS[outcome as ResultOutcome] ?? outcome
}
