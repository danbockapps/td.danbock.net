import crypto from 'node:crypto'
import {jwtVerify, SignJWT} from 'jose'

const COOKIE_NAME = 'td_admin_session'
const EXPIRY = '7d'

function getSecretKey() {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error('SESSION_SECRET is not set')
  return new TextEncoder().encode(secret)
}

export async function createSessionToken(): Promise<string> {
  return new SignJWT({admin: true})
    .setProtectedHeader({alg: 'HS256'})
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(getSecretKey())
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false
  try {
    await jwtVerify(token, getSecretKey())
    return true
  } catch {
    return false
  }
}

export function verifyAdminPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) throw new Error('ADMIN_PASSWORD is not set')

  const expectedBuf = Buffer.from(expected)
  const actualBuf = Buffer.from(password)

  if (expectedBuf.length !== actualBuf.length) return false
  return crypto.timingSafeEqual(expectedBuf, actualBuf)
}

export {COOKIE_NAME}
