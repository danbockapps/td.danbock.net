'use client'

export function LoadingCard() {
  return (
    <div className="card bg-base-200 p-6 shadow">
      <p className="text-base-content/60">Loading…</p>
    </div>
  )
}

export function UscfIdEntryCard({
  uscfId,
  setUscfId,
  error,
  pending,
  onSubmit,
  submitLabel,
  pendingLabel,
}: {
  uscfId: string
  setUscfId: (value: string) => void
  error: string | null
  pending: boolean
  onSubmit: () => void
  submitLabel: string
  pendingLabel: string
}) {
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
        onClick={onSubmit}
        disabled={pending || uscfId.length === 0}
      >
        {pending ? pendingLabel : submitLabel}
      </button>
    </div>
  )
}
