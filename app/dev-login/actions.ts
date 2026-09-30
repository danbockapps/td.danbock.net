'use server'

import {COOKIE_NAME, createSessionToken} from '@/lib/auth/session'
import {cookies} from 'next/headers'
import {redirect} from 'next/navigation'

export async function devLogin(formData: FormData) {
  if (process.env.NODE_ENV !== 'development') return

  const userId = Number(formData.get('userId'))
  if (!userId) return

  const token = await createSessionToken(userId)
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })

  redirect('/admin')
}
