import {db} from '@/db'
import {results} from '@/db/schema'
import {eq} from 'drizzle-orm'

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

export async function upsertResult(pairingId: number, outcome: ResultOutcome) {
  const existing = await db.query.results.findFirst({
    where: eq(results.pairingId, pairingId),
  })

  if (existing) {
    await db.update(results).set({outcome}).where(eq(results.pairingId, pairingId))
  } else {
    await db.insert(results).values({pairingId, outcome})
  }
}
