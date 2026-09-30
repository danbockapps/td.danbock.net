import {db} from '@/db'
import {notFound} from 'next/navigation'
import {devLogin} from './actions'

export default async function DevLoginPage() {
  if (process.env.NODE_ENV !== 'development') notFound()

  const allUsers = await db.query.users.findMany({
    orderBy: (u, {asc}) => asc(u.username),
    with: {tournamentUsers: {with: {tournament: true}}},
  })

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="card w-full max-w-md bg-base-200 shadow">
        <div className="card-body">
          <h1 className="card-title text-2xl">Dev login</h1>
          <p className="text-sm text-base-content/70">
            Click a user to sign in as them — dev only, no Lichess account required.
          </p>

          {allUsers.length === 0 ? (
            <p className="mt-4 text-sm text-base-content/60">No users in the database yet.</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-2">
              {allUsers.map((user) => (
                <li key={user.id}>
                  <form action={devLogin}>
                    <input type="hidden" name="userId" value={user.id} />
                    <button
                      type="submit"
                      className="btn btn-outline btn-block h-auto min-h-0 flex-wrap justify-start
                        gap-x-2 gap-y-1 py-2"
                    >
                      <span className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-medium">{user.username}</span>
                        <span className="font-normal text-base-content/60">
                          {user.email ?? 'no email'}
                        </span>
                      </span>
                      <span className="ml-auto flex flex-wrap gap-1">
                        {user.admin && <span className="badge badge-primary">Admin</span>}
                        {user.tournamentUsers.map((tu) => (
                          <span key={tu.id} className="badge badge-secondary">
                            {tu.tournament.slug}
                          </span>
                        ))}
                      </span>
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
