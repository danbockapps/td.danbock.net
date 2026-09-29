export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="card w-full max-w-sm bg-base-200 p-6 shadow">
        <h1 className="mb-4 text-xl font-bold">Admin Login</h1>
        <a href="/admin/oauth/login" className="btn btn-primary w-full">
          Log in with Lichess
        </a>
      </div>
    </div>
  )
}
