import {getRoundEntries, getRoundPairings} from '@/app/t/[slug]/round/[round]/actions'
import {InfoScreen} from '@/components/info/InfoScreen'
import {getTournamentForRoundOrNotFound} from '@/lib/tournament'
import {networkInterfaces} from 'os'
import {headers} from 'next/headers'

function getDevHost(fallback: string) {
  const [, port] = fallback.split(':')
  for (const iface of Object.values(networkInterfaces()).flat()) {
    if (iface?.family === 'IPv4' && !iface.internal) {
      return port ? `${iface.address}:${port}` : iface.address
    }
  }
  return fallback
}

export default async function InfoPage({params}: {params: Promise<{slug: string; round: string}>}) {
  const {slug, round: roundParam} = await params
  const round = Number(roundParam)

  const tournament = await getTournamentForRoundOrNotFound(slug, round)

  const [entriesResult, pairingsResult] = await Promise.all([
    getRoundEntries(slug, round),
    getRoundPairings(slug, round),
  ])

  const headerList = await headers()
  const proto = headerList.get('x-forwarded-proto') ?? 'https'
  const host =
    process.env.NODE_ENV === 'development'
      ? getDevHost(headerList.get('host') ?? 'localhost')
      : headerList.get('host')
  const registerUrl = `${proto}://${host}/t/${slug}/round/${round}/register`
  const resultsUrl = `${proto}://${host}/t/${slug}/round/${round}/results`

  return (
    <div className="min-h-screen p-8">
      <h1 className="mb-1 text-3xl font-bold">{tournament.name}</h1>
      <p className="mb-8 text-xl text-base-content/60">Round {round}</p>

      <InfoScreen
        slug={slug}
        round={round}
        initialEntries={entriesResult.data ?? []}
        initialPairings={pairingsResult.data ?? []}
        registerUrl={registerUrl}
        resultsUrl={resultsUrl}
      />
    </div>
  )
}
