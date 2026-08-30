'use server'

import {db} from '@/db'
import {entries, tournaments} from '@/db/schema'
import {getUscfLookup} from '@/lib/uscf'
import {and, eq} from 'drizzle-orm'
import {revalidatePath} from 'next/cache'

export async function lookupUscf(slug: string, uscfId: string) {
  if (!/^\d{8}$/.test(uscfId)) {
    return {error: 'USCF ID must be an 8-digit number'}
  }

  const tournament = await db.query.tournaments.findFirst({
    where: eq(tournaments.slug, slug),
  })
  if (!tournament) return {error: 'Tournament not found'}

  const priorEntry = await db.query.entries.findFirst({
    where: and(eq(entries.tournamentId, tournament.id), eq(entries.uscfId, uscfId)),
  })
  if (priorEntry) {
    return {data: {name: priorEntry.name, rating: priorEntry.rating}}
  }

  const result = await getUscfLookup().lookup(uscfId)
  return {data: result}
}

export async function confirmRegistration(
  slug: string,
  round: number,
  uscfId: string,
  name: string,
  rating: number | null,
) {
  const tournament = await db.query.tournaments.findFirst({
    where: eq(tournaments.slug, slug),
  })
  if (!tournament) return {error: 'Tournament not found'}
  if (round < 1 || round > tournament.numRounds) return {error: 'Invalid round'}

  const existing = await db.query.entries.findFirst({
    where: and(
      eq(entries.tournamentId, tournament.id),
      eq(entries.round, round),
      eq(entries.uscfId, uscfId),
    ),
  })
  if (existing) return {error: 'This USCF ID is already registered for this round'}

  await db.insert(entries).values({
    tournamentId: tournament.id,
    round,
    uscfId,
    name,
    rating,
  })

  revalidatePath(`/t/${slug}`)
  return {success: true}
}
