'use server'

import {db} from '@/db'
import {entries, pairings, tournaments} from '@/db/schema'
import {broadcastEntriesChanged} from '@/lib/sse'
import {getUscfLookup} from '@/lib/uscf'
import {and, eq} from 'drizzle-orm'
import {revalidatePath} from 'next/cache'
import {USCF_ID_COOKIE} from '@/lib/uscf-cookie'
import {cookies} from 'next/headers'

export async function getRoundEntries(slug: string, round: number) {
  const tournament = await db.query.tournaments.findFirst({
    where: eq(tournaments.slug, slug),
  })
  if (!tournament) return {error: 'Tournament not found'}

  const roundEntries = await db.query.entries.findMany({
    where: and(eq(entries.tournamentId, tournament.id), eq(entries.round, round)),
  })
  return {data: roundEntries.map((e) => ({name: e.name, rating: e.rating}))}
}

export async function getRoundPairings(slug: string, round: number) {
  const tournament = await db.query.tournaments.findFirst({
    where: eq(tournaments.slug, slug),
  })
  if (!tournament) return {error: 'Tournament not found'}

  const roundPairings = await db.query.pairings.findMany({
    where: and(eq(pairings.tournamentId, tournament.id), eq(pairings.round, round)),
    orderBy: (p, {asc}) => asc(p.board),
    with: {white: true, black: true, result: true},
  })
  return {
    data: roundPairings.map((p) => ({
      board: p.board,
      white: p.white ? {name: p.white.name, rating: p.white.rating} : null,
      black: p.black ? {name: p.black.name, rating: p.black.rating} : null,
      outcome: p.result?.outcome,
    })),
  }
}

export async function lookupUscf(slug: string, uscfId: string) {
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

  broadcastEntriesChanged(slug, round)
  revalidatePath(`/t/${slug}`)
  ;(await cookies()).set(USCF_ID_COOKIE, uscfId, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })
  return {success: true}
}

export async function forgetSavedUscfId() {
  ;(await cookies()).delete(USCF_ID_COOKIE)
}
