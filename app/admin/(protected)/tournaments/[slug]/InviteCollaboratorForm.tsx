'use client'

import {inviteCollaborator} from './actions'
import {useActionState} from 'react'

export function InviteCollaboratorForm({slug}: {slug: string}) {
  const [state, formAction, pending] = useActionState(
    inviteCollaborator.bind(null, slug),
    undefined,
  )

  return (
    <form action={formAction} className="flex flex-wrap items-start gap-2">
      <input
        name="username"
        type="text"
        placeholder="Lichess username"
        className="input input-sm"
        required
      />
      <button type="submit" className="btn btn-sm" disabled={pending}>
        {pending ? 'Inviting…' : 'Invite'}
      </button>
      {state?.error && <p className="w-full text-sm text-error">{state.error}</p>}
    </form>
  )
}
