import crypto from 'node:crypto'

const AUTHORIZE_URL = 'https://lichess.org/oauth'
const TOKEN_URL = 'https://lichess.org/api/token'
const SCOPE = 'email:read'

function getClientId() {
  const clientId = process.env.LICHESS_CLIENT_ID
  if (!clientId) throw new Error('LICHESS_CLIENT_ID is not set')
  return clientId
}

export function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url')
}

export function generateState(): string {
  return crypto.randomBytes(16).toString('base64url')
}

function codeChallengeFromVerifier(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url')
}

export function buildAuthorizeUrl(params: {
  redirectUri: string
  state: string
  codeVerifier: string
}): string {
  const url = new URL(AUTHORIZE_URL)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', getClientId())
  url.searchParams.set('redirect_uri', params.redirectUri)
  url.searchParams.set('scope', SCOPE)
  url.searchParams.set('state', params.state)
  url.searchParams.set('code_challenge_method', 'S256')
  url.searchParams.set('code_challenge', codeChallengeFromVerifier(params.codeVerifier))
  return url.toString()
}

export async function exchangeCodeForToken(params: {
  code: string
  redirectUri: string
  codeVerifier: string
}): Promise<string> {
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code: params.code,
      redirect_uri: params.redirectUri,
      client_id: getClientId(),
      code_verifier: params.codeVerifier,
    }),
  })

  if (!response.ok) {
    throw new Error(`Lichess token exchange failed: ${response.status}`)
  }

  const data = (await response.json()) as {access_token: string}
  return data.access_token
}

export async function fetchLichessAccount(
  accessToken: string,
): Promise<{id: string; username: string}> {
  const response = await fetch('https://lichess.org/api/account', {
    headers: {Authorization: `Bearer ${accessToken}`},
  })

  if (!response.ok) {
    throw new Error(`Lichess account fetch failed: ${response.status}`)
  }

  const data = (await response.json()) as {id: string; username: string}
  return {id: data.id, username: data.username}
}

export async function fetchLichessEmail(accessToken: string): Promise<string | null> {
  const response = await fetch('https://lichess.org/api/account/email', {
    headers: {Authorization: `Bearer ${accessToken}`},
  })

  if (!response.ok) return null

  const data = (await response.json()) as {email?: string}
  return data.email ?? null
}

export async function lookupLichessUser(
  username: string,
): Promise<{id: string; username: string} | null> {
  const response = await fetch(`https://lichess.org/api/user/${encodeURIComponent(username)}`)

  if (!response.ok) return null

  const data = (await response.json()) as {id: string; username: string}
  return {id: data.id, username: data.username}
}
