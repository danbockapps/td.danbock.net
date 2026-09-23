import {EntryList} from '@/components/entries/EntryList'
import {db} from '@/db'
import {entries} from '@/db/schema'
import {getPointsByUscfId} from '@/lib/results'
import {getTournamentOrNotFound} from '@/lib/tournament'
import {eq} from 'drizzle-orm'

export default async function AllEntriesPage({params}: {params: Promise<{slug: string}>}) {
  const {slug} = await params

  const tournament = await getTournamentOrNotFound(slug)

  const [allEntries, points] = await Promise.all([
    db.query.entries.findMany({
      where: eq(entries.tournamentId, tournament.id),
      orderBy: (e, {asc}) => [asc(e.round)],
    }),
    getPointsByUscfId(tournament.id),
  ])

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-2xl font-bold">{tournament.name} — Entries</h1>
      <EntryList
        showRound
        entries={allEntries.map((e) => ({
          round: e.round,
          name: e.name,
          uscfId: e.uscfId,
          rating: e.rating,
          points: points.get(e.uscfId) ?? 0,
        }))}
      />
    </div>
  )
}
