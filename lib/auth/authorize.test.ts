import {beforeEach, describe, expect, it, vi} from 'vitest'

const findFirstMock = vi.fn()
vi.mock('@/db', () => ({
  db: {query: {tournamentUsers: {findFirst: (...args: unknown[]) => findFirstMock(...args)}}},
}))

const getCurrentUserMock = vi.fn()
vi.mock('@/lib/auth/session', () => ({
  getCurrentUser: () => getCurrentUserMock(),
}))

const redirectMock = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`)
})
const notFoundMock = vi.fn(() => {
  throw new Error('NOT_FOUND')
})
vi.mock('next/navigation', () => ({
  redirect: (url: string) => redirectMock(url),
  notFound: () => notFoundMock(),
}))

import {requireTournamentAccess} from './authorize'

describe('requireTournamentAccess', () => {
  beforeEach(() => {
    findFirstMock.mockReset()
    getCurrentUserMock.mockReset()
    redirectMock.mockClear()
    notFoundMock.mockClear()
  })

  it('redirects to login when there is no session', async () => {
    getCurrentUserMock.mockResolvedValue(null)
    await expect(requireTournamentAccess(1)).rejects.toThrow('REDIRECT:/admin/login')
  })

  it('allows admins through without checking collaborators', async () => {
    getCurrentUserMock.mockResolvedValue({id: 1, admin: true})
    const user = await requireTournamentAccess(5)
    expect(user).toEqual({id: 1, admin: true})
    expect(findFirstMock).not.toHaveBeenCalled()
  })

  it('allows a user with a tournament_users row', async () => {
    getCurrentUserMock.mockResolvedValue({id: 2, admin: false})
    findFirstMock.mockResolvedValue({id: 99, tournamentId: 5, userId: 2})
    const user = await requireTournamentAccess(5)
    expect(user).toEqual({id: 2, admin: false})
  })

  it('404s a user with no access to the tournament', async () => {
    getCurrentUserMock.mockResolvedValue({id: 3, admin: false})
    findFirstMock.mockResolvedValue(undefined)
    await expect(requireTournamentAccess(5)).rejects.toThrow('NOT_FOUND')
  })
})
