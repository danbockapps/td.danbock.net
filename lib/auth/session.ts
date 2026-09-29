import {jwtVerify, SignJWT} from 'jose'
import {cookies} from 'next/headers'
import {db} from '@/db'

const COOKIE_NAME = 'td_admin_session'
const EXPIRY = '7d'

function getSecretKey() {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error('SESSION_SECRET is not set')
  return new TextEncoder().encode(secret)
}

export async function createSessionToken(userId: number): Promise<string> {
  return new SignJWT({userId})
    .setProtectedHeader({alg: 'HS256'})
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(getSecretKey())
}

export async function verifySessionToken(token: string | undefined): Promise<number | null> {
  if (!token) return null
  try {
    const {payload} = await jwtVerify(token, getSecretKey())
    return typeof payload.userId === 'number' ? payload.userId : null
  } catch {
    return null
  }
}

export async function getCurrentUser() {
  const cookieStore = await cookies()
  const userId = await verifySessionToken(cookieStore.get(COOKIE_NAME)?.value)
  if (userId === null) return null

  return (await db.query.users.findFirst({where: (u, {eq}) => eq(u.id, userId)})) ?? null
}

export {COOKIE_NAME}
