import {subscribe} from '@/lib/sse'
import {NextRequest} from 'next/server'

export async function GET(
  request: NextRequest,
  {params}: {params: Promise<{slug: string; round: string}>},
) {
  const {slug, round: roundParam} = await params
  const round = Number(roundParam)

  const encoder = new TextEncoder()
  let unsubscribe: () => void = () => {}
  let heartbeat: ReturnType<typeof setInterval>

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      // Flush proxy/Safari buffering immediately (comment line is a no-op SSE event).
      controller.enqueue(encoder.encode(`:${' '.repeat(2048)}\n\n`))

      unsubscribe = subscribe(slug, round, controller)

      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`))
        } catch {
          clearInterval(heartbeat)
        }
      }, 20000)

      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat)
        unsubscribe()
        try {
          controller.close()
        } catch {}
      })
    },
    cancel() {
      clearInterval(heartbeat)
      unsubscribe()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
