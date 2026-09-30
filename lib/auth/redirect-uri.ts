import {type NextRequest} from 'next/server'

// request.nextUrl.origin reflects the server's bind address (HOSTNAME=0.0.0.0 in
// the container), not the public URL, so derive it from the proxy's headers.
export function oauthRedirectUri(request: NextRequest) {
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  const proto =
    request.headers.get('x-forwarded-proto') ?? request.nextUrl.protocol.replace(':', '')
  const origin = host ? `${proto}://${host}` : request.nextUrl.origin
  return new URL('/admin/oauth/callback', origin).toString()
}
