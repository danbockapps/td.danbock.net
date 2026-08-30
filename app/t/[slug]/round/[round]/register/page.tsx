import {db} from '@/db'
import {notFound} from 'next/navigation'
import {RegisterForm} from './RegisterForm'

export default async function RegisterPage({
  params,
}: {
  params: Promise<{slug: string; round: string}>
}) {
  const {slug, round: roundParam} = await params
  const round = Number(roundParam)

  const tournament = await db.query.tournaments.findFirst({
    where: (t, {eq}) => eq(t.slug, slug),
  })
  if (!tournament || round < 1 || round > tournament.numRounds) notFound()

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <h1 className="mb-1 text-2xl font-bold">{tournament.name}</h1>
      <p className="mb-6 text-base-content/60">Round {round} Registration</p>
      <RegisterForm slug={slug} round={round} />
    </div>
  )
}
