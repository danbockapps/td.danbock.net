import {oauthRedirectUri} from '@/lib/auth/redirect-uri'
import {buildAuthorizeUrl, generateCodeVerifier, generateState} from '@/lib/auth/lichess'
import {STATE_COOKIE, VERIFIER_COOKIE} from '@/lib/auth/oauth-cookies'
import {cookies} from 'next/headers'
import {redirect} from 'next/navigation'
import {type NextRequest} from 'next/server'

export async function GET(request: NextRequest) {
  const codeVerifier = generateCodeVerifier()
  const state = generateState()
  const redirectUri = oauthRedirectUri(request)

  const cookieStore = await cookies()
  const oauthCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 10,
  }
  cookieStore.set(VERIFIER_COOKIE, codeVerifier, oauthCookieOptions)
  cookieStore.set(STATE_COOKIE, state, oauthCookieOptions)

  redirect(buildAuthorizeUrl({redirectUri, state, codeVerifier}))
}
