import {db} from '@/db'
import {tournamentUsers, users} from '@/db/schema'
import {exchangeCodeForToken, fetchLichessAccount, fetchLichessEmail} from '@/lib/auth/lichess'
import {EMAIL_HINT_COOKIE, STATE_COOKIE, VERIFIER_COOKIE} from '@/lib/auth/oauth-cookies'
import {oauthRedirectUri} from '@/lib/auth/redirect-uri'
import {COOKIE_NAME, createSessionToken} from '@/lib/auth/session'
import {eq} from 'drizzle-orm'
import {cookies} from 'next/headers'
import {redirect} from 'next/navigation'
import {type NextRequest} from 'next/server'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const state = request.nextUrl.searchParams.get('state')

  const cookieStore = await cookies()
  const savedVerifier = cookieStore.get(VERIFIER_COOKIE)?.value
  const savedState = cookieStore.get(STATE_COOKIE)?.value
  cookieStore.delete(VERIFIER_COOKIE)
  cookieStore.delete(STATE_COOKIE)

  if (!code || !state || !savedVerifier || !savedState || state !== savedState) {
    redirect('/admin/login?error=oauth')
  }

  const redirectUri = oauthRedirectUri(request)

  const accessToken = await exchangeCodeForToken({
    code,
    redirectUri,
    codeVerifier: savedVerifier,
  })
  const account = await fetchLichessAccount(accessToken)
  const email = await fetchLichessEmail(accessToken)

  const existing = await db.query.users.findFirst({
    where: (u, {eq}) => eq(u.lichessId, account.id),
  })

  let userId: number
  let confirmedEmail: string | null
  if (existing) {
    userId = existing.id
    confirmedEmail = existing.email
    await db.update(users).set({username: account.username}).where(eq(users.id, existing.id))
  } else {
    const isFirstUser = (await db.query.users.findFirst()) === undefined

    const [inserted] = await db
      .insert(users)
      .values({
        lichessId: account.id,
        username: account.username,
        email: null,
        admin: isFirstUser,
      })
      .returning()
    userId = inserted.id
    confirmedEmail = null

    if (isFirstUser) {
      const allTournaments = await db.query.tournaments.findMany()
      if (allTournaments.length > 0) {
        await db
          .insert(tournamentUsers)
          .values(allTournaments.map((t) => ({tournamentId: t.id, userId})))
      }
    }
  }

  const token = await createSessionToken(userId)
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })

  if (confirmedEmail) {
    redirect('/admin')
  }

  if (email) {
    cookieStore.set(EMAIL_HINT_COOKIE, email, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 10,
    })
  }

  redirect('/admin/confirm-email')
}
