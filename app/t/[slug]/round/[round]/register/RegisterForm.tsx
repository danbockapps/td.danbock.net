'use client'

import {confirmRegistration, lookupUscf} from '@/app/t/[slug]/round/[round]/actions'
import {formatRating} from '@/lib/format'
import {useState, useTransition} from 'react'

type Step = 'enter-id' | 'confirm' | 'done'

export function RegisterForm({slug, round}: {slug: string; round: number}) {
  const [step, setStep] = useState<Step>('enter-id')
  const [uscfId, setUscfId] = useState('')
  const [preview, setPreview] = useState<{name: string; rating: number | null} | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function submitId() {
    setError(null)
    startTransition(async () => {
      const result = await lookupUscf(uscfId)
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

  if (step === 'done') {
    return (
      <div className="alert alert-success">
        <span>You&apos;re registered for round {round}!</span>
      </div>
    )
  }

  if (step === 'confirm' && preview) {
    return (
      <div className="card bg-base-200 p-6 shadow">
        <p className="mb-1">
          <span className="font-semibold">Name:</span> {preview.name}
        </p>
        <p className="mb-4">
          <span className="font-semibold">Rating:</span> {formatRating(preview.rating)}
        </p>
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
    <div className="card bg-base-200 p-6 shadow">
      <label className="fieldset-label mb-1" htmlFor="uscfId">
        USCF ID (8 digits)
      </label>
      <input
        id="uscfId"
        className="input mb-4 w-full"
        inputMode="numeric"
        pattern="\d{8}"
        maxLength={8}
        value={uscfId}
        onChange={(e) => setUscfId(e.target.value.replace(/\D/g, ''))}
        autoFocus
      />
      {error && <p className="mb-4 text-sm text-error">{error}</p>}
      <button
        className="btn btn-primary"
        onClick={submitId}
        disabled={pending || uscfId.length !== 8}
      >
        {pending ? 'Looking up…' : 'Look up'}
      </button>
    </div>
  )
}
