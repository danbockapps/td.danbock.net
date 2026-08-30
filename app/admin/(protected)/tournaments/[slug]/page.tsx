import {db} from '@/db'
import {entries as entriesTable, pairings as pairingsTable} from '@/db/schema'
import {and, eq} from 'drizzle-orm'
import Link from 'next/link'
import {notFound} from 'next/navigation'

export default async function TournamentAdminPage({params}: {params: Promise<{slug: string}>}) {
  const {slug} = await params

  const tournament = await db.query.tournaments.findFirst({
    where: (t, {eq}) => eq(t.slug, slug),
  })
  if (!tournament) notFound()

  const rounds = Array.from({length: tournament.numRounds}, (_, i) => i + 1)

  const roundInfo = await Promise.all(
    rounds.map(async (round) => {
      const entryCount = (
        await db
          .select()
          .from(entriesTable)
          .where(and(eq(entriesTable.tournamentId, tournament.id), eq(entriesTable.round, round)))
      ).length
      const pairingCount = (
        await db
          .select()
          .from(pairingsTable)
          .where(and(eq(pairingsTable.tournamentId, tournament.id), eq(pairingsTable.round, round)))
      ).length
      return {round, entryCount, pairingCount}
    }),
  )

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold">{tournament.name}</h1>
      <p className="mb-6 text-base-content/60">
        /{tournament.slug} · {tournament.numRounds} rounds
      </p>

      <div className="mb-6 flex gap-2">
        <Link href={`/admin/tournaments/${slug}/entries`} className="btn btn-sm">
          Edit entries
        </Link>
        <Link href={`/t/${slug}/pairings`} className="btn btn-sm" target="_blank">
          View pairings
        </Link>
        <Link href={`/t/${slug}/entries`} className="btn btn-sm" target="_blank">
          View entries
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Round</th>
              <th>Entries</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {roundInfo.map(({round, entryCount, pairingCount}) => (
              <tr key={round}>
                <td>{round}</td>
                <td>{entryCount}</td>
                <td>{pairingCount > 0 ? 'Paired' : 'Not paired'}</td>
                <td className="flex gap-2">
                  <Link
                    href={`/admin/tournaments/${slug}/rounds/${round}/pair`}
                    className="btn btn-xs"
                  >
                    Pair
                  </Link>
                  <Link
                    href={`/admin/tournaments/${slug}/rounds/${round}/results`}
                    className="btn btn-xs"
                  >
                    Results
                  </Link>
                  <Link
                    href={`/t/${slug}/round/${round}/info`}
                    className="btn btn-xs"
                    target="_blank"
                  >
                    Info screen
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
