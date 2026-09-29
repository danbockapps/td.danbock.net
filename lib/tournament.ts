import {db} from '@/db'
import {requireTournamentAccess} from '@/lib/auth/authorize'
import {notFound} from 'next/navigation'

export async function getTournamentOrNotFound(slug: string) {
  const tournament = await db.query.tournaments.findFirst({
    where: (t, {eq}) => eq(t.slug, slug),
  })
  if (!tournament) notFound()
  return tournament
}

export async function getTournamentForRoundOrNotFound(slug: string, round: number) {
  const tournament = await getTournamentOrNotFound(slug)
  if (round < 1 || round > tournament.numRounds) notFound()
  return tournament
}

export async function getTournamentForAdminOrNotFound(slug: string) {
  const tournament = await getTournamentOrNotFound(slug)
  await requireTournamentAccess(tournament.id)
  return tournament
}

export async function getTournamentForAdminRoundOrNotFound(slug: string, round: number) {
  const tournament = await getTournamentForRoundOrNotFound(slug, round)
  await requireTournamentAccess(tournament.id)
  return tournament
}
