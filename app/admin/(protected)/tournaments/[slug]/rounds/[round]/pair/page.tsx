import {db} from '@/db'
import {entries, pairings} from '@/db/schema'
import {PairingList} from '@/components/pairings/PairingList'
import {getPointsByUscfId} from '@/lib/results'
import {getTournamentOrNotFound} from '@/lib/tournament'
import {and, eq, lt} from 'drizzle-orm'
import {PairRoundForm} from './PairRoundForm'

export default async function PairRoundPage({
  params,
}: {
  params: Promise<{slug: string; round: string}>
}) {
  const {slug, round: roundParam} = await params
  const round = Number(roundParam)

  const tournament = await getTournamentOrNotFound(slug)

  const [existingPairings, points, roundEntries, priorPairings] = await Promise.all([
    db.query.pairings.findMany({
      where: and(eq(pairings.tournamentId, tournament.id), eq(pairings.round, round)),
      orderBy: (p, {asc}) => asc(p.board),
      with: {white: true, black: true, result: true},
    }),
    getPointsByUscfId(tournament.id, round),
    db.query.entries.findMany({
      where: and(eq(entries.tournamentId, tournament.id), eq(entries.round, round)),
    }),
    db.query.pairings.findMany({
      where: and(eq(pairings.tournamentId, tournament.id), lt(pairings.round, round)),
      with: {white: true, black: true},
    }),
  ])

  const manualEntries = roundEntries
    .map((e) => ({
      id: e.id,
      uscfId: e.uscfId,
      name: e.name,
      rating: e.rating,
      team: e.team,
      points: points.get(e.uscfId) ?? 0,
    }))
    .sort((a, b) => b.points - a.points || (b.rating ?? 0) - (a.rating ?? 0))

  const previousOpponents: Record<string, string[]> = {}
  for (const p of priorPairings) {
    if (p.white && p.black) {
      ;(previousOpponents[p.white.uscfId] ??= []).push(p.black.uscfId)
      ;(previousOpponents[p.black.uscfId] ??= []).push(p.white.uscfId)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-0">
      <h1 className="mb-6 text-xl font-bold sm:text-2xl">
        Pair Round {round} — {tournament.name}
      </h1>

      <div className="mb-6">
        <PairRoundForm
          slug={slug}
          round={round}
          alreadyPaired={existingPairings.length > 0}
          entries={manualEntries}
          previousOpponents={previousOpponents}
        />
      </div>

      {existingPairings.length > 0 && (
        <>
          <h2 className="mb-2 text-lg font-semibold">Current pairings</h2>
          <PairingList
            pairings={existingPairings.map((p) => ({
              board: p.board,
              white: p.white
                ? {
                    name: p.white.name,
                    rating: p.white.rating,
                    points: points.get(p.white.uscfId) ?? 0,
                  }
                : null,
              black: p.black
                ? {
                    name: p.black.name,
                    rating: p.black.rating,
                    points: points.get(p.black.uscfId) ?? 0,
                  }
                : null,
              outcome: p.result?.outcome,
            }))}
          />
        </>
      )}
    </div>
  )
}
