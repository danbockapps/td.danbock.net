import {db} from '@/db'
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
