'use server'

import {db} from '@/db'
import {tournaments} from '@/db/schema'
import {COOKIE_NAME, createSessionToken, verifyAdminPassword} from '@/lib/auth/session'
import {redirect} from 'next/navigation'
import {cookies} from 'next/headers'

export async function login(_prevState: {error?: string} | undefined, formData: FormData) {
  const password = String(formData.get('password') ?? '')

  if (!verifyAdminPassword(password)) {
    return {error: 'Incorrect password'}
  }

  const token = await createSessionToken()
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })

  redirect('/admin')
}

export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
  redirect('/admin/login')
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

  const existing = await db.query.tournaments.findFirst({
    where: (t, {eq}) => eq(t.slug, slug),
  })
  if (existing) {
    return {error: 'A tournament with that slug already exists'}
  }

  await db.insert(tournaments).values({slug, name, numRounds})

  redirect(`/admin/tournaments/${slug}`)
}
