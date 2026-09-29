import {db} from '@/db'
import {getCurrentUser} from '@/lib/auth/session'
import Link from 'next/link'
import {redirect} from 'next/navigation'

export default async function AdminHomePage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/admin/login')
  }

  const myTournaments = user.admin
    ? await db.query.tournaments.findMany({
        orderBy: (t, {desc}) => desc(t.createdAt),
      })
    : await db.query.tournamentUsers
        .findMany({
          where: (tu, {eq}) => eq(tu.userId, user.id),
          with: {tournament: true},
          orderBy: (tu, {desc}) => desc(tu.invitedAt),
        })
        .then((rows) => rows.map((row) => row.tournament))

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tournaments</h1>
        <Link href="/admin/tournaments/new" className="btn btn-primary btn-sm">
          New tournament
        </Link>
      </div>

      {myTournaments.length === 0 ? (
        <p className="text-base-content/60">No tournaments yet.</p>
      ) : (
        <ul className="menu bg-base-200 rounded-box">
          {myTournaments.map((t) => (
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
