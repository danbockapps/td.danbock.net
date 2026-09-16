import {db} from '@/db'
import {results} from '@/db/schema'
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
