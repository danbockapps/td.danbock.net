'use client'

import {createTournament} from '@/app/admin/actions'
import {useActionState} from 'react'

export default function NewTournamentPage() {
  const [state, formAction, pending] = useActionState(createTournament, undefined)

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 text-2xl font-bold">New Tournament</h1>
      <form action={formAction} className="card bg-base-200 p-6 shadow">
        <label className="fieldset-label mb-1" htmlFor="slug">
          Slug (used in URLs)
        </label>
        <input
          id="slug"
          name="slug"
          type="text"
          placeholder="spring-open"
          pattern="[a-z0-9-]+"
          className="input mb-4 w-full"
          required
        />

        <label className="fieldset-label mb-1" htmlFor="name">
          Tournament name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          placeholder="Spring Open"
          className="input mb-4 w-full"
          required
        />

        <label className="fieldset-label mb-1" htmlFor="numRounds">
          Number of rounds
        </label>
        <input
          id="numRounds"
          name="numRounds"
          type="number"
          min={1}
          defaultValue={5}
          className="input mb-4 w-full"
          required
        />

        {state?.error && <p className="mb-4 text-sm text-error">{state.error}</p>}

        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? 'Creating…' : 'Create tournament'}
        </button>
      </form>
    </div>
  )
}
