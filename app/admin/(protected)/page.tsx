import {db} from '@/db'
import Link from 'next/link'

export default async function AdminHomePage() {
  const allTournaments = await db.query.tournaments.findMany({
    orderBy: (t, {desc}) => desc(t.createdAt),
  })

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tournaments</h1>
        <Link href="/admin/tournaments/new" className="btn btn-primary btn-sm">
          New tournament
        </Link>
      </div>

      {allTournaments.length === 0 ? (
        <p className="text-base-content/60">No tournaments yet.</p>
      ) : (
        <ul className="menu bg-base-200 rounded-box">
          {allTournaments.map((t) => (
            <li key={t.id}>
              <Link href={`/admin/tournaments/${t.slug}`}>
                {t.name} <span className="text-base-content/50">({t.numRounds} rounds)</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
