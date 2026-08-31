'use server'

import {db} from '@/db'
import {entries, pairings, results, tournaments} from '@/db/schema'
import {getPairingEngine} from '@/lib/pairing'
import {and, eq} from 'drizzle-orm'
import {revalidatePath} from 'next/cache'

async function requireTournament(slug: string) {
  const tournament = await db.query.tournaments.findFirst({
    where: eq(tournaments.slug, slug),
  })
  if (!tournament) throw new Error('Tournament not found')
  return tournament
}

export async function updateEntry(
  tournamentId: number,
  uscfId: string,
  data: {name: string; rating: number | null},
) {
  await db
    .update(entries)
    .set({name: data.name, rating: data.rating})
    .where(and(eq(entries.tournamentId, tournamentId), eq(entries.uscfId, uscfId)))
  revalidatePath('/admin/tournaments')
  revalidatePath('/t')
}

export async function pairRound(
  slug: string,
  round: number,
  options: {higherSeedColor: 'white' | 'black'},
) {
  const tournament = await requireTournament(slug)

  const existing = await db.query.pairings.findFirst({
    where: and(eq(pairings.tournamentId, tournament.id), eq(pairings.round, round)),
  })
  if (existing) throw new Error('This round has already been paired')

  const roundEntries = await db.query.entries.findMany({
    where: and(eq(entries.tournamentId, tournament.id), eq(entries.round, round)),
  })
  if (roundEntries.length === 0) throw new Error('No entries for this round yet')

  const engine = getPairingEngine()
  const pairingResults = engine.pair(
    roundEntries.map((e) => ({entryId: e.id, name: e.name, rating: e.rating})),
    options,
  )

  await db.insert(pairings).values(
    pairingResults.map((p) => ({
      tournamentId: tournament.id,
      round,
      board: p.board,
      whiteEntryId: p.whiteEntryId,
      blackEntryId: p.blackEntryId,
    })),
  )

  revalidatePath(`/admin/tournaments/${slug}`)
  revalidatePath('/t')
}

async function deleteRoundPairings(tournamentId: number, round: number) {
  const existingPairings = await db.query.pairings.findMany({
    where: and(eq(pairings.tournamentId, tournamentId), eq(pairings.round, round)),
  })
  for (const p of existingPairings) {
    await db.delete(results).where(eq(results.pairingId, p.id))
  }
  await db
    .delete(pairings)
    .where(and(eq(pairings.tournamentId, tournamentId), eq(pairings.round, round)))
}

export async function repairRound(
  slug: string,
  round: number,
  options: {higherSeedColor: 'white' | 'black'},
) {
  const tournament = await requireTournament(slug)
  await deleteRoundPairings(tournament.id, round)
  await pairRound(slug, round, options)
}

export async function unpairRound(slug: string, round: number) {
  const tournament = await requireTournament(slug)
  await deleteRoundPairings(tournament.id, round)

  revalidatePath(`/admin/tournaments/${slug}`)
  revalidatePath('/t')
}

export async function submitResult(pairingId: number, outcome: string) {
  const existing = await db.query.results.findFirst({
    where: eq(results.pairingId, pairingId),
  })

  if (existing) {
    await db
      .update(results)
      .set({outcome: outcome as (typeof results.$inferInsert)['outcome']})
      .where(eq(results.pairingId, pairingId))
  } else {
    await db.insert(results).values({
      pairingId,
      outcome: outcome as (typeof results.$inferInsert)['outcome'],
    })
  }

  revalidatePath('/admin/tournaments')
  revalidatePath('/t')
}
