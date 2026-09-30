import {beforeEach, describe, expect, it, vi} from 'vitest'

vi.stubEnv('SESSION_SECRET', 'test-secret')

const findFirstMock = vi.fn()
vi.mock('@/db', () => ({
  db: {query: {users: {findFirst: (...args: unknown[]) => findFirstMock(...args)}}},
}))

const cookieGetMock = vi.fn()
vi.mock('next/headers', () => ({
  cookies: async () => ({get: (name: string) => cookieGetMock(name)}),
}))

import {COOKIE_NAME, createSessionToken, getCurrentUser, verifySessionToken} from './session'

describe('createSessionToken / verifySessionToken', () => {
  it('round-trips a userId', async () => {
    const token = await createSessionToken(42)
    expect(await verifySessionToken(token)).toBe(42)
  })

  it('returns null for a missing token', async () => {
    expect(await verifySessionToken(undefined)).toBeNull()
  })

  it('returns null for a garbage token', async () => {
    expect(await verifySessionToken('not-a-jwt')).toBeNull()
  })
})

describe('getCurrentUser', () => {
  beforeEach(() => {
    cookieGetMock.mockReset()
    findFirstMock.mockReset()
  })

  it('returns null when there is no session cookie', async () => {
    cookieGetMock.mockReturnValue(undefined)
    expect(await getCurrentUser()).toBeNull()
  })

  it('returns null when the session references a deleted user', async () => {
    const token = await createSessionToken(7)
    cookieGetMock.mockImplementation((name) => (name === COOKIE_NAME ? {value: token} : undefined))
    findFirstMock.mockResolvedValue(undefined)
    expect(await getCurrentUser()).toBeNull()
  })

  it('returns the user for a valid session', async () => {
    const token = await createSessionToken(7)
    cookieGetMock.mockImplementation((name) => (name === COOKIE_NAME ? {value: token} : undefined))
    findFirstMock.mockResolvedValue({id: 7, admin: false})
    expect(await getCurrentUser()).toEqual({id: 7, admin: false})
  })
})
