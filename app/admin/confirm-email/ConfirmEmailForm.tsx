'use client'

import {confirmEmail} from '@/app/admin/actions'
import {useActionState} from 'react'

export function ConfirmEmailForm({defaultEmail}: {defaultEmail: string}) {
  const [state, formAction, pending] = useActionState(confirmEmail, undefined)

  return (
    <form action={formAction}>
      <label className="fieldset-label mb-1" htmlFor="email">
        Email
      </label>
      <input
        id="email"
        name="email"
        type="email"
        defaultValue={defaultEmail}
        className="input mb-4 w-full"
        autoFocus
        required
      />
      {state?.error && <p className="mb-4 text-sm text-error">{state.error}</p>}
      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        {pending ? 'Saving…' : 'Confirm'}
      </button>
    </form>
  )
}
