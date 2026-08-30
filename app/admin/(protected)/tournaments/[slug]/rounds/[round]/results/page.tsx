import {db} from '@/db'
import {pairings} from '@/db/schema'
import {and, eq} from 'drizzle-orm'
import {notFound} from 'next/navigation'
import {ResultRow} from './ResultRow'

export default async function ResultsPage({
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

  const roundPairings = await db.query.pairings.findMany({
    where: and(eq(pairings.tournamentId, tournament.id), eq(pairings.round, round)),
    orderBy: (p, {asc}) => asc(p.board),
    with: {white: true, black: true, result: true},
  })

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold">
        Enter Results — Round {round} — {tournament.name}
      </h1>

      {roundPairings.length === 0 ? (
        <p className="text-base-content/60">This round hasn&apos;t been paired yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Board</th>
                <th>White</th>
                <th>Black</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {roundPairings.map((p) => (
                <ResultRow
                  key={p.id}
                  pairingId={p.id}
                  board={p.board}
                  whiteLabel={p.white ? p.white.name : 'Bye'}
                  blackLabel={p.black ? p.black.name : 'Bye'}
                  initialOutcome={p.result?.outcome ?? null}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
