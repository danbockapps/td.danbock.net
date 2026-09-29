import {ConfirmEmailForm} from '@/app/admin/confirm-email/ConfirmEmailForm'
import {EMAIL_HINT_COOKIE} from '@/lib/auth/oauth-cookies'
import {getCurrentUser} from '@/lib/auth/session'
import {cookies} from 'next/headers'
import {redirect} from 'next/navigation'

export default async function ConfirmEmailPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/admin/login')
  }
  if (user.email) {
    redirect('/admin')
  }

  const cookieStore = await cookies()
  const hint = cookieStore.get(EMAIL_HINT_COOKIE)?.value
  cookieStore.delete(EMAIL_HINT_COOKIE)

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="card w-full max-w-sm bg-base-200 p-6 shadow">
        <h1 className="mb-4 text-xl font-bold">Confirm your email</h1>
        <p className="mb-4 text-sm text-base-content/70">
          {hint
            ? "We'll use this email to reach you about your tournaments."
            : "Lichess didn't give us an email address for your account. Enter one to continue."}
        </p>
        <ConfirmEmailForm defaultEmail={hint ?? ''} />
      </div>
    </div>
  )
}
