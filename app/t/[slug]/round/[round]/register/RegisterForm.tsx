'use client'

import {confirmRegistration, lookupUscf} from '@/app/t/[slug]/round/[round]/actions'
import {LoadingCard, UscfIdEntryCard} from '@/app/t/[slug]/round/[round]/UscfIdCard'
import {formatRating} from '@/lib/format'
import {useEffect, useState, useTransition} from 'react'

type Step = 'loading-saved' | 'welcome-back' | 'enter-id' | 'confirm' | 'done'

function PlayerPreview({preview}: {preview: {name: string; rating: number | null}}) {
  return (
    <>
      <p className="mb-1">
        <span className="font-semibold">Name:</span> {preview.name}
      </p>
      <p className="mb-4">
        <span className="font-semibold">Rating:</span> {formatRating(preview.rating)}
      </p>
    </>
  )
}

export function RegisterForm({
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
  const [preview, setPreview] = useState<{name: string; rating: number | null} | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (!savedUscfId) return
    startTransition(async () => {
      const result = await lookupUscf(slug, savedUscfId)
      if ('error' in result && result.error) {
        setStep('enter-id')
        return
      }
      if (result.data) {
        setPreview(result.data)
        setStep('welcome-back')
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function submitId() {
    setError(null)
    startTransition(async () => {
      const result = await lookupUscf(slug, uscfId)
      if ('error' in result && result.error) {
        setError(result.error)
        return
      }
      if (result.data) {
        setPreview(result.data)
        setStep('confirm')
      }
    })
  }

  function confirm() {
    if (!preview) return
    setError(null)
    startTransition(async () => {
      const result = await confirmRegistration(slug, round, uscfId, preview.name, preview.rating)
      if ('error' in result && result.error) {
        setError(result.error)
        return
      }
      setStep('done')
    })
  }

  function registerSomeoneElse() {
    setError(null)
    setPreview(null)
    setUscfId('')
    setStep('enter-id')
  }

  if (step === 'loading-saved') {
    return <LoadingCard />
  }

  if (step === 'done') {
    return (
      <div className="alert alert-success">
        <span>You&apos;re registered for round {round}!</span>
      </div>
    )
  }

  if (step === 'welcome-back' && preview) {
    return (
      <div className="card bg-base-200 p-6 shadow">
        <PlayerPreview preview={preview} />
        <p className="mb-4 text-sm text-base-content/60">Register this player again?</p>
        {error && <p className="mb-4 text-sm text-error">{error}</p>}
        <div className="flex gap-2">
          <button className="btn btn-primary" onClick={confirm} disabled={pending}>
            {pending ? 'Submitting…' : 'Yes, register again'}
          </button>
        </div>
        <button
          className="link mt-4 text-sm"
          onClick={registerSomeoneElse}
          disabled={pending}
          type="button"
        >
          Register someone else
        </button>
      </div>
    )
  }

  if (step === 'confirm' && preview) {
    return (
      <div className="card bg-base-200 p-6 shadow">
        <PlayerPreview preview={preview} />
        {error && <p className="mb-4 text-sm text-error">{error}</p>}
        <div className="flex gap-2">
          <button className="btn btn-primary" onClick={confirm} disabled={pending}>
            {pending ? 'Submitting…' : 'Confirm and register'}
          </button>
          <button
            className="btn"
            onClick={() => {
              setStep('enter-id')
              setPreview(null)
            }}
            disabled={pending}
          >
            Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <UscfIdEntryCard
      uscfId={uscfId}
      setUscfId={setUscfId}
      error={error}
      pending={pending}
      onSubmit={submitId}
      submitLabel="Look up"
      pendingLabel="Looking up…"
    />
  )
}
