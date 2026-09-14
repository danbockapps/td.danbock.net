'use server'

import {db} from '@/db'
import {entries, pairings, results, tournaments} from '@/db/schema'
import {getPairingEngine, type PairingResult, type RoundHistoryEntry} from '@/lib/pairing'
import {upsertResult, type ResultOutcome} from '@/lib/results'
import {broadcastEntriesChanged, broadcastResultsChanged} from '@/lib/sse'
import {and, eq, lt, or} from 'drizzle-orm'
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
  data: {name: string; rating: number | null; team: string | null},
) {
  const [updated] = await db
    .update(entries)
    .set({name: data.name, rating: data.rating, team: data.team})
    .where(and(eq(entries.tournamentId, tournamentId), eq(entries.uscfId, uscfId)))
    .returning()

  if (updated) {
    const tournament = await db.query.tournaments.findFirst({
      where: eq(tournaments.id, tournamentId),
    })
    if (tournament) broadcastEntriesChanged(tournament.slug, updated.round)
  }

  revalidatePath('/admin/tournaments')
  revalidatePath('/t')
}

export async function deleteEntry(tournamentId: number, uscfId: string, round: number) {
  const entry = await db.query.entries.findFirst({
    where: and(
      eq(entries.tournamentId, tournamentId),
      eq(entries.uscfId, uscfId),
      eq(entries.round, round),
    ),
  })
  if (!entry) return

  const pairing = await db.query.pairings.findFirst({
    where: and(
      eq(pairings.tournamentId, tournamentId),
      eq(pairings.round, round),
      or(eq(pairings.whiteEntryId, entry.id), eq(pairings.blackEntryId, entry.id)),
    ),
  })
  if (pairing) throw new Error('Unpair this round before removing the player from it')

  await db.delete(entries).where(eq(entries.id, entry.id))

  const tournament = await db.query.tournaments.findFirst({
    where: eq(tournaments.id, tournamentId),
  })
  if (tournament) broadcastEntriesChanged(tournament.slug, round)

  revalidatePath('/admin/tournaments')
  revalidatePath('/t')
}

export async function pairRound(
  slug: string,
  round: number,
  options: {higherSeedColor: 'white' | 'black'; engine?: string; dryRun?: boolean},
) {
  const tournament = await requireTournament(slug)

  if (!options.dryRun) {
    const existing = await db.query.pairings.findFirst({
      where: and(eq(pairings.tournamentId, tournament.id), eq(pairings.round, round)),
    })
    if (existing) throw new Error('This round has already been paired')
  }

  const roundEntries = await db.query.entries.findMany({
    where: and(eq(entries.tournamentId, tournament.id), eq(entries.round, round)),
  })
  if (roundEntries.length === 0) throw new Error('No entries for this round yet')

  const priorPairings = await db.query.pairings.findMany({
    where: and(eq(pairings.tournamentId, tournament.id), lt(pairings.round, round)),
    with: {white: true, black: true},
  })
  const history: RoundHistoryEntry[] = priorPairings.flatMap((p) => {
    const rows: RoundHistoryEntry[] = []
    if (p.white) {
      rows.push({
        round: p.round,
        uscfId: p.white.uscfId,
        opponentUscfId: p.black?.uscfId ?? null,
        color: p.black ? 'white' : null,
      })
    }
    if (p.black) {
      rows.push({
        round: p.round,
        uscfId: p.black.uscfId,
        opponentUscfId: p.white?.uscfId ?? null,
        color: p.white ? 'black' : null,
      })
    }
    return rows
  })

  const engine = getPairingEngine(options.engine)
  const engineEntries = roundEntries.map((e) => ({
    entryId: e.id,
    uscfId: e.uscfId,
    name: e.name,
    rating: e.rating,
    team: e.team,
  }))
  const engineOptions = {higherSeedColor: options.higherSeedColor, history}

  let pairingResults: PairingResult[]
  let alternativeSheets: PairingResult[][] | undefined
  try {
    if (options.dryRun && engine.pairAlternatives) {
      alternativeSheets = engine.pairAlternatives(engineEntries, engineOptions)
      pairingResults = alternativeSheets[0]
    } else {
      pairingResults = engine.pair(engineEntries, engineOptions)
    }
  } catch (e) {
    console.error(`Pairing engine failed for ${slug} round ${round}:`, e)
    throw new Error(e instanceof Error ? e.message : 'Pairing engine failed')
  }

  if (options.dryRun) {
    const entriesById = new Map(roundEntries.map((e) => [e.id, e]))
    const toPreview = (sheet: typeof pairingResults) =>
      sheet.map((p) => ({
        board: p.board,
        white: p.whiteEntryId ? (entriesById.get(p.whiteEntryId) ?? null) : null,
        black: p.blackEntryId ? (entriesById.get(p.blackEntryId) ?? null) : null,
      }))

    return {
      best: toPreview(pairingResults),
      alternatives: (alternativeSheets ?? [pairingResults]).slice(1).map(toPreview),
    }
  }

  await db.insert(pairings).values(
    pairingResults.map((p) => ({
      tournamentId: tournament.id,
      round,
      board: p.board,
      whiteEntryId: p.whiteEntryId,
      blackEntryId: p.blackEntryId,
    })),
  )

  broadcastEntriesChanged(slug, round)
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
  options: {higherSeedColor: 'white' | 'black'; engine?: string},
) {
  const tournament = await requireTournament(slug)
  await deleteRoundPairings(tournament.id, round)
  await pairRound(slug, round, options)
}

export async function unpairRound(slug: string, round: number) {
  const tournament = await requireTournament(slug)
  await deleteRoundPairings(tournament.id, round)

  broadcastEntriesChanged(slug, round)
  revalidatePath(`/admin/tournaments/${slug}`)
  revalidatePath('/t')
}

export async function submitResult(pairingId: number, outcome: string) {
  const pairing = await db.query.pairings.findFirst({
    where: eq(pairings.id, pairingId),
    with: {tournament: true},
  })

  if (!outcome) {
    await db.delete(results).where(eq(results.pairingId, pairingId))
  } else {
    await upsertResult(pairingId, outcome as ResultOutcome)
  }

  if (pairing) broadcastResultsChanged(pairing.tournament.slug, pairing.round)

  revalidatePath('/admin/tournaments')
  revalidatePath('/t')
}
