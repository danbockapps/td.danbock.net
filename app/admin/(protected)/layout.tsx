import {logout} from '@/app/admin/actions'
import {COOKIE_NAME, verifySessionToken} from '@/lib/auth/session'
import {cookies} from 'next/headers'
import {redirect} from 'next/navigation'

export default async function ProtectedAdminLayout({children}: {children: React.ReactNode}) {
  const cookieStore = await cookies()
  const isValid = await verifySessionToken(cookieStore.get(COOKIE_NAME)?.value)

  if (!isValid) {
    redirect('/admin/login')
  }

  return (
    <div className="min-h-screen">
      <div className="navbar bg-base-200">
        <div className="flex-1">
          <a href="/admin" className="btn btn-ghost text-lg">
            Tournament Director Admin
          </a>
        </div>
        <div className="flex-none">
          <form action={logout}>
            <button type="submit" className="btn btn-ghost btn-sm">
              Log out
            </button>
          </form>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}
