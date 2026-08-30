import {PairingList} from '@/components/pairings/PairingList'
import {db} from '@/db'
import {pairings} from '@/db/schema'
import {eq} from 'drizzle-orm'
import {notFound} from 'next/navigation'

export default async function AllPairingsPage({params}: {params: Promise<{slug: string}>}) {
  const {slug} = await params

  const tournament = await db.query.tournaments.findFirst({
    where: (t, {eq}) => eq(t.slug, slug),
  })
  if (!tournament) notFound()

  const allPairings = await db.query.pairings.findMany({
    where: eq(pairings.tournamentId, tournament.id),
    orderBy: (p, {asc}) => [asc(p.round), asc(p.board)],
    with: {white: true, black: true, result: true},
  })

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-2xl font-bold">{tournament.name} — Pairings</h1>
      <PairingList
        showRound
        pairings={allPairings.map((p) => ({
          round: p.round,
          board: p.board,
          white: p.white ? {name: p.white.name, rating: p.white.rating} : null,
          black: p.black ? {name: p.black.name, rating: p.black.rating} : null,
          outcome: p.result?.outcome,
        }))}
      />
    </div>
  )
}
