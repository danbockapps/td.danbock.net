'use client'

import {pairRound, unpairRound} from '@/app/admin/(protected)/tournaments/[slug]/actions'
import {PairingList, type PairingListItem} from '@/components/pairings/PairingList'
import {useRouter} from 'next/navigation'
import {useState, useTransition} from 'react'
import {ManualPairingEditor, type ManualEntry} from './ManualPairingEditor'

export function PairRoundForm({
  slug,
  round,
  alreadyPaired,
  entries,
  previousOpponents,
}: {
  slug: string
  round: number
  alreadyPaired: boolean
  entries: ManualEntry[]
  previousOpponents: Record<string, string[]>
}) {
  const [higherSeedColor, setHigherSeedColor] = useState<'white' | 'black'>('white')
  const [engine, setEngine] = useState<
    'manual' | 'ratingOrder' | 'ratingDiffMinimizer' | 'swiss' | 'swissHybrid'
  >('ratingDiffMinimizer')
  const [swissThreshold, setSwissThreshold] = useState(1)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<{
    best: PairingListItem[]
    alternatives: PairingListItem[][]
  } | null>(null)
  const router = useRouter()

  function submit() {
    setError(null)
    setPreview(null)
    startTransition(async () => {
      try {
        await pairRound(slug, round, {higherSeedColor, engine, swissThreshold})
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong')
      }
    })
  }

  function submitDryRun() {
    setError(null)
    startTransition(async () => {
      try {
        const result = await pairRound(slug, round, {
          higherSeedColor,
          engine,
          swissThreshold,
          dryRun: true,
        })
        setPreview(result ?? {best: [], alternatives: []})
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
    setPreview(null)
    startTransition(async () => {
      try {
        await unpairRound(slug, round)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong')
      }
    })
  }

  if (alreadyPaired) {
    return (
      <div className="card bg-base-200 w-full max-w-md p-4 shadow sm:max-w-none sm:p-6">
        {error && <p className="mb-4 text-sm text-error">{error}</p>}
        <p className="mb-2 text-sm text-base-content/60">
          This round is already paired. Un-pair the round to make changes. Un-pairing deletes all
          existing pairings and results for this round.
        </p>
        <button
          className="btn btn-outline btn-error w-full sm:w-auto"
          disabled={pending}
          onClick={submitUnpair}
        >
          {pending ? 'Working…' : 'Un-pair round'}
        </button>
      </div>
    )
  }

  return (
    <div className="card bg-base-200 w-full max-w-md p-4 shadow sm:max-w-none sm:p-6">
      <label className="fieldset-label mb-2">Pairing engine:</label>
      <div className="mb-4 flex flex-col gap-2">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="engine"
            className="radio"
            checked={engine === 'manual'}
            onChange={() => setEngine('manual')}
          />
          Manual
        </label>
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
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="engine"
            className="radio"
            checked={engine === 'swiss'}
            onChange={() => setEngine('swiss')}
          />
          Swiss
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="engine"
            className="radio"
            checked={engine === 'swissHybrid'}
            onChange={() => setEngine('swissHybrid')}
          />
          Swiss / rating hybrid
        </label>
      </div>

      {engine === 'manual' ? (
        <ManualPairingEditor
          slug={slug}
          round={round}
          entries={entries}
          previousOpponents={previousOpponents}
        />
      ) : (
        <>
          <label className="fieldset-label mb-2">Higher seed plays:</label>
          <div className="mb-4 flex flex-wrap gap-4">
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

          {engine === 'swissHybrid' && (
            <div className="mb-4">
              <label className="fieldset-label mb-2">
                Points within the leader that still require a Swiss pairing:
              </label>
              <input
                type="number"
                min={0}
                step={0.5}
                className="input input-bordered w-24"
                value={swissThreshold}
                onChange={(e) => setSwissThreshold(Number(e.target.value))}
              />
            </div>
          )}

          {error && <p className="mb-4 text-sm text-error">{error}</p>}

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              className="btn btn-primary w-full sm:w-auto"
              disabled={pending}
              onClick={() => submit()}
            >
              {pending ? 'Pairing…' : 'Pair round'}
            </button>
            <button
              className="btn btn-outline w-full sm:w-auto"
              disabled={pending}
              onClick={submitDryRun}
            >
              {pending ? 'Working…' : 'Dry run'}
            </button>
          </div>

          {preview && (
            <div className="mt-6">
              <h3 className="mb-2 font-semibold">Dry run preview (not saved)</h3>
              <PairingList pairings={preview.best} />

              {preview.alternatives.map((sheet, i) => (
                <div key={i} className="mt-6">
                  <h4 className="mb-2 font-semibold">
                    {i === 0 ? '2nd' : i === 1 ? '3rd' : `${i + 2}th`} best pairing sheet
                  </h4>
                  <PairingList pairings={sheet} />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
