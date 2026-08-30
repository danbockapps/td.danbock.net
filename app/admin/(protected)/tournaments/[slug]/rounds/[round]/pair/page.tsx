import {db} from '@/db'
import {pairings} from '@/db/schema'
import {PairingList} from '@/components/pairings/PairingList'
import {and, eq} from 'drizzle-orm'
import {notFound} from 'next/navigation'
import {PairRoundForm} from './PairRoundForm'

export default async function PairRoundPage({
  params,
}: {
  params: Promise<{slug: string; round: string}>
}) {
  const {slug, round: roundParam} = await params
  const round = Number(roundParam)

  const tournament = await db.query.tournaments.findFirst({
    where: (t, {eq}) => eq(t.slug, slug),
  })
  if (!tournament) notFound()

  const existingPairings = await db.query.pairings.findMany({
    where: and(eq(pairings.tournamentId, tournament.id), eq(pairings.round, round)),
    orderBy: (p, {asc}) => asc(p.board),
    with: {white: true, black: true, result: true},
  })

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold">
        Pair Round {round} — {tournament.name}
      </h1>

      <div className="mb-6">
        <PairRoundForm slug={slug} round={round} alreadyPaired={existingPairings.length > 0} />
      </div>

      {existingPairings.length > 0 && (
        <>
          <h2 className="mb-2 text-lg font-semibold">Current pairings</h2>
          <PairingList
            pairings={existingPairings.map((p) => ({
              board: p.board,
              white: p.white ? {name: p.white.name, rating: p.white.rating} : null,
              black: p.black ? {name: p.black.name, rating: p.black.rating} : null,
              outcome: p.result?.outcome,
            }))}
          />
        </>
      )}
    </div>
  )
}
