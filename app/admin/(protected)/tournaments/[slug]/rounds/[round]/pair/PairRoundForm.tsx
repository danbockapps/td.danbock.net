'use client'

import {
  pairRound,
  repairRound,
  unpairRound,
} from '@/app/admin/(protected)/tournaments/[slug]/actions'
import {useRouter} from 'next/navigation'
import {useState, useTransition} from 'react'

export function PairRoundForm({
  slug,
  round,
  alreadyPaired,
}: {
  slug: string
  round: number
  alreadyPaired: boolean
}) {
  const [higherSeedColor, setHigherSeedColor] = useState<'white' | 'black'>('white')
  const [engine, setEngine] = useState<'ratingOrder' | 'ratingDiffMinimizer'>(
    'ratingDiffMinimizer',
  )
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  function submit(repair: boolean) {
    setError(null)
    startTransition(async () => {
      try {
        if (repair) {
          await repairRound(slug, round, {higherSeedColor, engine})
        } else {
          await pairRound(slug, round, {higherSeedColor, engine})
        }
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong')
      }
    })
  }

  function submitUnpair() {
    if (!window.confirm('Un-pair this round? This deletes all pairings and results for it.')) {
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        await unpairRound(slug, round)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong')
      }
    })
  }

  return (
    <div className="card bg-base-200 max-w-md p-6 shadow">
      <label className="fieldset-label mb-2">Higher seed plays:</label>
      <div className="mb-4 flex gap-4">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="color"
            className="radio"
            checked={higherSeedColor === 'white'}
            onChange={() => setHigherSeedColor('white')}
          />
          White
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="color"
            className="radio"
            checked={higherSeedColor === 'black'}
            onChange={() => setHigherSeedColor('black')}
          />
          Black
        </label>
      </div>

      <label className="fieldset-label mb-2">Pairing engine:</label>
      <div className="mb-4 flex gap-4">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="engine"
            className="radio"
            checked={engine === 'ratingOrder'}
            onChange={() => setEngine('ratingOrder')}
          />
          Rating order
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="engine"
            className="radio"
            checked={engine === 'ratingDiffMinimizer'}
            onChange={() => setEngine('ratingDiffMinimizer')}
          />
          Rating difference minimizer
        </label>
      </div>

      {error && <p className="mb-4 text-sm text-error">{error}</p>}

      <button className="btn btn-primary" disabled={pending} onClick={() => submit(alreadyPaired)}>
        {pending ? 'Pairing…' : alreadyPaired ? 'Re-pair round' : 'Pair round'}
      </button>
      {alreadyPaired && (
        <>
          <button className="btn btn-error mt-2" disabled={pending} onClick={submitUnpair}>
            {pending ? 'Working…' : 'Un-pair round'}
          </button>
          <p className="mt-2 text-xs text-base-content/60">
            This round is already paired. Re-pairing or un-pairing deletes existing pairings and
            results for this round.
          </p>
        </>
      )}
    </div>
  )
}
