import {db} from '@/db'
import {getCurrentUser} from '@/lib/auth/session'
import {notFound, redirect} from 'next/navigation'

export async function requireTournamentAccess(tournamentId: number) {
  const user = await getCurrentUser()
  if (!user) redirect('/admin/login')

  if (user.admin) return user

  const access = await db.query.tournamentUsers.findFirst({
    where: (tu, {and, eq}) => and(eq(tu.tournamentId, tournamentId), eq(tu.userId, user.id)),
  })
  if (!access) notFound()

  return user
}
