import {db} from '@/db'
import {entries} from '@/db/schema'
import {eq} from 'drizzle-orm'
import {notFound} from 'next/navigation'
import {EntryEditRow} from './EntryEditRow'

export default async function EditEntriesPage({params}: {params: Promise<{slug: string}>}) {
  const {slug} = await params

  const tournament = await db.query.tournaments.findFirst({
    where: (t, {eq}) => eq(t.slug, slug),
  })
  if (!tournament) notFound()

  const allEntries = await db.query.entries.findMany({
    where: eq(entries.tournamentId, tournament.id),
    orderBy: (e, {asc}) => [asc(e.round), asc(e.name)],
  })

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold">Edit Entries — {tournament.name}</h1>

      {allEntries.length === 0 ? (
        <p className="text-base-content/60">No entries yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Round</th>
                <th>Name</th>
                <th>Rating</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {allEntries.map((e) => (
                <EntryEditRow
                  key={e.id}
                  id={e.id}
                  round={e.round}
                  initialName={e.name}
                  initialRating={e.rating}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
