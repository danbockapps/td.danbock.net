import {db} from '@/db'
import {pairings, results} from '@/db/schema'
import {eq} from 'drizzle-orm'
import type {ResultOutcome} from '@/lib/result-outcomes'

export * from '@/lib/result-outcomes'

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

// This whole function exists to translate the `results.outcome` enum (stored
// relative to color) into a per-player point value. If results stored
// whitePoints/blackPoints directly, this conversion — and the risk of a
// caller forgetting to do it (see the round-2-scores-all-zero bug this fixed) —
// would go away.
export function outcomeToPoints(
  outcome: ResultOutcome | undefined,
  side: 'white' | 'black',
): number | undefined {
  if (!outcome) return undefined
  switch (outcome) {
    case 'white':
      return side === 'white' ? 1 : 0
    case 'black':
      return side === 'black' ? 1 : 0
    case 'draw':
      return 0.5
    case 'white_forfeit':
      return side === 'white' ? 0 : 1
    case 'black_forfeit':
      return side === 'black' ? 0 : 1
    case 'double_forfeit':
      return 0
  }
}

// Total points for each player (keyed by USCF ID) across all completed
// pairings in a tournament, optionally only counting rounds before `beforeRound`.
export async function getPointsByUscfId(
  tournamentId: number,
  beforeRound?: number,
): Promise<Map<string, number>> {
  const tournamentPairings = await db.query.pairings.findMany({
    where: eq(pairings.tournamentId, tournamentId),
    with: {white: true, black: true, result: true},
  })

  const points = new Map<string, number>()
  for (const p of tournamentPairings) {
    if (beforeRound !== undefined && p.round >= beforeRound) continue
    const outcome = p.result?.outcome
    if (p.white) {
      const value = outcomeToPoints(outcome, 'white')
      if (value !== undefined) points.set(p.white.uscfId, (points.get(p.white.uscfId) ?? 0) + value)
    }
    if (p.black) {
      const value = outcomeToPoints(outcome, 'black')
      if (value !== undefined) points.set(p.black.uscfId, (points.get(p.black.uscfId) ?? 0) + value)
    }
  }
  return points
}
