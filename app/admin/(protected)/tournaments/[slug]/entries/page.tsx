import {db} from '@/db'
import {entries} from '@/db/schema'
import {eq} from 'drizzle-orm'
import {notFound} from 'next/navigation'
import {EntryEditCard, EntryEditRow} from './EntryEditRow'

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

  const players = new Map<
    string,
    {uscfId: string; name: string; rating: number | null; team: string | null; rounds: number[]}
  >()
  for (const e of allEntries) {
    const existing = players.get(e.uscfId)
    if (existing) {
      existing.rounds.push(e.round)
    } else {
      players.set(e.uscfId, {
        uscfId: e.uscfId,
        name: e.name,
        rating: e.rating,
        team: e.team,
        rounds: [e.round],
      })
    }
  }
  const allPlayers = [...players.values()].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold">Edit Entries — {tournament.name}</h1>

      {allPlayers.length === 0 ? (
        <p className="text-base-content/60">No entries yet.</p>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="table">
              <thead>
                <tr>
                  <th>Rounds</th>
                  <th>Name</th>
                  <th>Rating</th>
                  <th>Team</th>
                  <th></th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {allPlayers.map((p) => (
                  <EntryEditRow
                    key={p.uscfId}
                    tournamentId={tournament.id}
                    uscfId={p.uscfId}
                    rounds={p.rounds}
                    initialName={p.name}
                    initialRating={p.rating}
                    initialTeam={p.team}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-3 md:hidden">
            {allPlayers.map((p) => (
              <EntryEditCard
                key={p.uscfId}
                tournamentId={tournament.id}
                uscfId={p.uscfId}
                rounds={p.rounds}
                initialName={p.name}
                initialRating={p.rating}
                initialTeam={p.team}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
