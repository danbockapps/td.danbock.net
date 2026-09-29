'use server'

import {db} from '@/db'
import {tournamentUsers, tournaments, users} from '@/db/schema'
import {getCurrentUser, COOKIE_NAME} from '@/lib/auth/session'
import {eq} from 'drizzle-orm'
import {redirect} from 'next/navigation'
import {cookies} from 'next/headers'

export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
  redirect('/admin/login')
}

export async function confirmEmail(_prevState: {error?: string} | undefined, formData: FormData) {
  const email = String(formData.get('email') ?? '').trim()

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return {error: 'Enter a valid email address'}
  }

  const user = await getCurrentUser()
  if (!user) {
    redirect('/admin/login')
  }

  await db.update(users).set({email}).where(eq(users.id, user.id))

  redirect('/admin')
}

export async function createTournament(
  _prevState: {error?: string} | undefined,
  formData: FormData,
) {
  const slug = String(formData.get('slug') ?? '').trim()
  const name = String(formData.get('name') ?? '').trim()
  const numRounds = Number(formData.get('numRounds'))

  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    return {error: 'Slug must contain only lowercase letters, numbers, and hyphens'}
  }
  if (!name) {
    return {error: 'Name is required'}
  }
  if (!Number.isInteger(numRounds) || numRounds < 1) {
    return {error: 'Number of rounds must be a positive integer'}
  }

  const user = await getCurrentUser()
  if (!user) {
    redirect('/admin/login')
  }

  const existing = await db.query.tournaments.findFirst({
    where: (t, {eq}) => eq(t.slug, slug),
  })
  if (existing) {
    return {error: 'A tournament with that slug already exists'}
  }

  const [tournament] = await db.insert(tournaments).values({slug, name, numRounds}).returning()
  await db.insert(tournamentUsers).values({tournamentId: tournament.id, userId: user.id})

  redirect(`/admin/tournaments/${slug}`)
}
