import {PairingList} from '@/components/pairings/PairingList'
import {db} from '@/db'
import {pairings} from '@/db/schema'
import {getPointsByUscfId} from '@/lib/results'
import {getTournamentOrNotFound} from '@/lib/tournament'
import {eq} from 'drizzle-orm'

export default async function AllPairingsPage({params}: {params: Promise<{slug: string}>}) {
  const {slug} = await params

  const tournament = await getTournamentOrNotFound(slug)

  const allPairings = await db.query.pairings.findMany({
    where: eq(pairings.tournamentId, tournament.id),
    orderBy: (p, {asc}) => [asc(p.round), asc(p.board)],
    with: {white: true, black: true, result: true},
  })

  const rounds = Array.from(new Set(allPairings.map((p) => p.round)))
  const pointsByRound = new Map(
    await Promise.all(
      rounds.map(async (round) => [round, await getPointsByUscfId(tournament.id, round)] as const),
    ),
  )

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-2xl font-bold">{tournament.name} — Pairings</h1>
      <PairingList
        showRound
        pairings={allPairings.map((p) => {
          const points = pointsByRound.get(p.round)
          return {
            round: p.round,
            board: p.board,
            white: p.white
              ? {
                  name: p.white.name,
                  rating: p.white.rating,
                  points: points?.get(p.white.uscfId) ?? 0,
                }
              : null,
            black: p.black
              ? {
                  name: p.black.name,
                  rating: p.black.rating,
                  points: points?.get(p.black.uscfId) ?? 0,
                }
              : null,
            outcome: p.result?.outcome,
          }
        })}
      />
    </div>
  )
}
