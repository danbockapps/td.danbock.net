'use server'

import {db} from '@/db'
import {entries, pairings, results, tournaments} from '@/db/schema'
import {getPairingEngine, type PairingResult, type RoundHistoryEntry} from '@/lib/pairing'
import {getPointsByUscfId, outcomeToPoints, upsertResult, type ResultOutcome} from '@/lib/results'
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

async function buildHistory(tournamentId: number, round: number): Promise<RoundHistoryEntry[]> {
  const priorPairings = await db.query.pairings.findMany({
    where: and(eq(pairings.tournamentId, tournamentId), lt(pairings.round, round)),
    with: {white: true, black: true, result: true},
  })
  return priorPairings.flatMap((p) => {
    const rows: RoundHistoryEntry[] = []
    const outcome = p.result?.outcome
    if (p.white) {
      rows.push({
        round: p.round,
        uscfId: p.white.uscfId,
        opponentUscfId: p.black?.uscfId ?? null,
        color: p.black ? 'white' : null,
        points: outcomeToPoints(outcome, 'white'),
      })
    }
    if (p.black) {
      rows.push({
        round: p.round,
        uscfId: p.black.uscfId,
        opponentUscfId: p.white?.uscfId ?? null,
        color: p.white ? 'black' : null,
        points: outcomeToPoints(outcome, 'black'),
      })
    }
    return rows
  })
}

export async function pairRound(
  slug: string,
  round: number,
  options: {
    higherSeedColor: 'white' | 'black'
    engine?: string
    swissThreshold?: number
    dryRun?: boolean
  },
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

  const history = await buildHistory(tournament.id, round)

  const engine = getPairingEngine(options.engine, {swissThreshold: options.swissThreshold})
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
    const points = await getPointsByUscfId(tournament.id, round)
    const toPreview = (sheet: typeof pairingResults) =>
      sheet.map((p) => {
        const white = p.whiteEntryId ? (entriesById.get(p.whiteEntryId) ?? null) : null
        const black = p.blackEntryId ? (entriesById.get(p.blackEntryId) ?? null) : null
        return {
          board: p.board,
          white: white ? {...white, points: points.get(white.uscfId) ?? 0} : null,
          black: black ? {...black, points: points.get(black.uscfId) ?? 0} : null,
        }
      })

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

export async function saveManualPairings(
  slug: string,
  round: number,
  sheets: {whiteEntryId: number | null; blackEntryId: number | null}[],
  options: {overwrite?: boolean; confirmWarnings?: boolean} = {},
): Promise<{warnings?: string[]}> {
  const tournament = await requireTournament(slug)

  const roundEntries = await db.query.entries.findMany({
    where: and(eq(entries.tournamentId, tournament.id), eq(entries.round, round)),
  })
  if (roundEntries.length === 0) throw new Error('No entries for this round yet')
  const entriesById = new Map(roundEntries.map((e) => [e.id, e]))

  const existing = await db.query.pairings.findFirst({
    where: and(eq(pairings.tournamentId, tournament.id), eq(pairings.round, round)),
  })
  if (existing && !options.overwrite) {
    throw new Error('This round has already been paired')
  }

  // Structural validation: no empty rows, no unknown or duplicated players.
  const used = new Set<number>()
  for (const [i, sheet] of sheets.entries()) {
    if (sheet.whiteEntryId === null && sheet.blackEntryId === null) {
      throw new Error(`Row ${i + 1} has no players`)
    }
    for (const id of [sheet.whiteEntryId, sheet.blackEntryId]) {
      if (id === null) continue
      if (!entriesById.has(id)) throw new Error('A pairing includes a player not in this round')
      if (used.has(id)) throw new Error('A player appears in more than one pairing')
      used.add(id)
    }
  }

  // Warn (but allow) rematches and same-team pairings.
  const history = await buildHistory(tournament.id, round)
  const previousOpponents = new Map<string, Set<string>>()
  for (const h of history) {
    if (!h.opponentUscfId) continue
    let opponents = previousOpponents.get(h.uscfId)
    if (!opponents) previousOpponents.set(h.uscfId, (opponents = new Set()))
    opponents.add(h.opponentUscfId)
  }

  const warnings: string[] = []
  for (const [i, sheet] of sheets.entries()) {
    const white = sheet.whiteEntryId ? entriesById.get(sheet.whiteEntryId) : null
    const black = sheet.blackEntryId ? entriesById.get(sheet.blackEntryId) : null
    if (!white || !black) continue
    const label = `Board ${i + 1} (${white.name} vs ${black.name})`
    if (white.team && black.team && white.team === black.team) {
      warnings.push(`${label}: players are on the same team`)
    }
    if (previousOpponents.get(white.uscfId)?.has(black.uscfId)) {
      warnings.push(`${label}: these players have already played each other`)
    }
  }

  if (warnings.length > 0 && !options.confirmWarnings) {
    return {warnings}
  }

  if (existing) await deleteRoundPairings(tournament.id, round)

  await db.insert(pairings).values(
    sheets.map((s, i) => ({
      tournamentId: tournament.id,
      round,
      board: i + 1,
      whiteEntryId: s.whiteEntryId,
      blackEntryId: s.blackEntryId,
    })),
  )

  broadcastEntriesChanged(slug, round)
  revalidatePath(`/admin/tournaments/${slug}`)
  revalidatePath('/t')

  return {}
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
  options: {higherSeedColor: 'white' | 'black'; engine?: string; swissThreshold?: number},
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
