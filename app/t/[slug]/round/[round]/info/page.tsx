import {getRoundEntries} from '@/app/t/[slug]/round/[round]/actions'
import {LiveEntryList} from '@/components/entries/LiveEntryList'
import {PairingList} from '@/components/pairings/PairingList'
import {RegistrationQr} from '@/components/RegistrationQr'
import {db} from '@/db'
import {pairings} from '@/db/schema'
import {and, eq} from 'drizzle-orm'
import {headers} from 'next/headers'
import {notFound} from 'next/navigation'

export default async function InfoPage({params}: {params: Promise<{slug: string; round: string}>}) {
  const {slug, round: roundParam} = await params
  const round = Number(roundParam)

  const tournament = await db.query.tournaments.findFirst({
    where: (t, {eq}) => eq(t.slug, slug),
  })
  if (!tournament || round < 1 || round > tournament.numRounds) notFound()

  const roundPairings = await db.query.pairings.findMany({
    where: and(eq(pairings.tournamentId, tournament.id), eq(pairings.round, round)),
    orderBy: (p, {asc}) => asc(p.board),
    with: {white: true, black: true, result: true},
  })

  const headerList = await headers()
  const host = headerList.get('host')
  const proto = headerList.get('x-forwarded-proto') ?? 'https'
  const registerUrl = `${proto}://${host}/t/${slug}/round/${round}/register`

  return (
    <div className="min-h-screen p-8">
      <h1 className="mb-1 text-3xl font-bold">{tournament.name}</h1>
      <p className="mb-8 text-xl text-base-content/60">Round {round}</p>

      {roundPairings.length > 0 ? (
        <div className="mx-auto w-fit max-w-full">
          <PairingList
            pairings={roundPairings.map((p) => ({
              board: p.board,
              white: p.white ? {name: p.white.name, rating: p.white.rating} : null,
              black: p.black ? {name: p.black.name, rating: p.black.rating} : null,
              outcome: p.result?.outcome,
            }))}
          />
        </div>
      ) : (
        <RoundEntriesAndQr slug={slug} round={round} registerUrl={registerUrl} />
      )}
    </div>
  )
}

async function RoundEntriesAndQr({
  slug,
  round,
  registerUrl,
}: {
  slug: string
  round: number
  registerUrl: string
}) {
  const result = await getRoundEntries(slug, round)
  const roundEntries = result.data ?? []

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div>
        <h2 className="mb-4 text-xl font-semibold">Entries ({roundEntries.length})</h2>
        <LiveEntryList slug={slug} round={round} initialEntries={roundEntries} />
      </div>
      <div className="flex flex-col items-center">
        <h2 className="mb-4 text-xl font-semibold">Please sign in</h2>
        <RegistrationQr url={registerUrl} />
      </div>
    </div>
  )
}
