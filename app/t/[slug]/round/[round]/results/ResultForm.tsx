'use client'

import {getMyPairing, submitPublicResult} from '@/app/t/[slug]/round/[round]/actions'
import {LoadingCard, UscfIdEntryCard} from '@/app/t/[slug]/round/[round]/UscfIdCard'
import {formatRating, formatResult} from '@/lib/format'
import {useEffect, useState, useTransition} from 'react'

type Step = 'loading-saved' | 'enter-id' | 'no-game' | 'pairing'

type Pairing = {
  pairingId: number
  board: number
  myColor: 'white' | 'black'
  white: {name: string; rating: number | null}
  black: {name: string; rating: number | null}
  outcome: string | null
}

const OUTCOME_OPTIONS: {outcome: string; label: string}[] = [
  {outcome: 'white', label: '1-0'},
  {outcome: 'draw', label: '½-½'},
  {outcome: 'black', label: '0-1'},
]

const FORFEIT_OPTIONS: {outcome: string; label: string}[] = [
  {outcome: 'black_forfeit', label: 'White wins by forfeit'},
  {outcome: 'white_forfeit', label: 'Black wins by forfeit'},
  {outcome: 'double_forfeit', label: 'Double forfeit'},
]

export function ResultForm({
  slug,
  round,
  savedUscfId,
}: {
  slug: string
  round: number
  savedUscfId: string | null
}) {
  const [step, setStep] = useState<Step>(savedUscfId ? 'loading-saved' : 'enter-id')
  const [uscfId, setUscfId] = useState(savedUscfId ?? '')
  const [pairing, setPairing] = useState<Pairing | null>(null)
  const [showForfeits, setShowForfeits] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (!savedUscfId) return
    startTransition(async () => {
      const result = await getMyPairing(slug, round, savedUscfId)
      if ('error' in result && result.error) {
        setStep('enter-id')
        return
      }
      if (result.data) {
        setPairing(result.data)
        setStep('pairing')
      } else {
        setStep('no-game')
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function findGame() {
    setError(null)
    startTransition(async () => {
      const result = await getMyPairing(slug, round, uscfId)
      if ('error' in result && result.error) {
        setError(result.error)
        return
      }
      if (result.data) {
        setPairing(result.data)
        setStep('pairing')
      } else {
        setStep('no-game')
      }
    })
  }

  function tryDifferentId() {
    setError(null)
    setPairing(null)
    setUscfId('')
    setShowForfeits(false)
    setStep('enter-id')
  }

  function submit(outcome: string) {
    if (!pairing) return
    setError(null)
    startTransition(async () => {
      const result = await submitPublicResult(slug, round, uscfId, pairing.pairingId, outcome)
      if ('error' in result && result.error) {
        setError(result.error)
        return
      }
      setPairing({...pairing, outcome})
    })
  }

  if (step === 'loading-saved') {
    return <LoadingCard />
  }

  if (step === 'no-game') {
    return (
      <div className="card bg-base-200 p-6 shadow">
        <p className="mb-4">
          We couldn&apos;t find a game for USCF ID {uscfId} in round {round}.
        </p>
        <button className="link text-sm" onClick={tryDifferentId} type="button">
          Try a different USCF ID
        </button>
      </div>
    )
  }

  if (step === 'pairing' && pairing) {
    return (
      <div className="card bg-base-200 p-6 shadow">
        <p className="mb-1 text-sm text-base-content/60">Board {pairing.board}</p>
        <p className="mb-1">
          <span className="font-semibold">White:</span> {pairing.white.name} (
          {formatRating(pairing.white.rating)})
        </p>
        <p className="mb-4">
          <span className="font-semibold">Black:</span> {pairing.black.name} (
          {formatRating(pairing.black.rating)})
        </p>
        {pairing.outcome && (
          <p className="mb-4 text-sm text-base-content/60">
            Current result: {formatResult(pairing.outcome)}. Tap below to change it.
          </p>
        )}
        {error && <p className="mb-4 text-sm text-error">{error}</p>}
        <div className="mb-4 flex gap-2">
          {OUTCOME_OPTIONS.map((option) => (
            <button
              key={option.outcome}
              className="btn btn-primary flex-1"
              onClick={() => submit(option.outcome)}
              disabled={pending}
            >
              {option.label}
            </button>
          ))}
        </div>
        {!showForfeits && (
          <button
            className="link mb-4 text-sm"
            onClick={() => setShowForfeits(true)}
            disabled={pending}
            type="button"
          >
            Report a forfeit instead
          </button>
        )}
        {showForfeits && (
          <div className="mb-4 flex flex-col gap-2">
            {FORFEIT_OPTIONS.map((option) => (
              <button
                key={option.outcome}
                className="btn btn-outline"
                onClick={() => submit(option.outcome)}
                disabled={pending}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
        <button className="link text-sm" onClick={tryDifferentId} disabled={pending} type="button">
          Not you? Enter a different USCF ID
        </button>
      </div>
    )
  }

  return (
    <UscfIdEntryCard
      uscfId={uscfId}
      setUscfId={setUscfId}
      error={error}
      pending={pending}
      onSubmit={findGame}
      submitLabel="Find my game"
      pendingLabel="Looking up…"
    />
  )
}
