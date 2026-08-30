'use client'

import {login} from '@/app/admin/actions'
import {useActionState} from 'react'

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, undefined)

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form action={formAction} className="card w-full max-w-sm bg-base-200 p-6 shadow">
        <h1 className="mb-4 text-xl font-bold">Admin Login</h1>
        <label className="fieldset-label mb-1" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className="input mb-4 w-full"
          autoFocus
          required
        />
        {state?.error && <p className="mb-4 text-sm text-error">{state.error}</p>}
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
