export const RESULT_OUTCOMES = [
  'white',
  'black',
  'draw',
  'white_forfeit',
  'black_forfeit',
  'double_forfeit',
] as const

export type ResultOutcome = (typeof RESULT_OUTCOMES)[number]

export const RESULT_OUTCOME_LABELS: Record<ResultOutcome, string> = {
  white: '1-0',
  black: '0-1',
  draw: '½-½',
  white_forfeit: '0-1 (forfeit)',
  black_forfeit: '1-0 (forfeit)',
  double_forfeit: '0-0 (double forfeit)',
}
