type Key = string
type Channels = Map<Key, Set<ReadableStreamDefaultController<Uint8Array>>>

// Server actions and route handlers can end up in separate module graphs in
// Next.js (especially in dev), so a plain module-level singleton isn't
// guaranteed to be shared between them. Pin it to globalThis instead.
const globalForSse = globalThis as unknown as {__sseChannels?: Channels}

const channels: Channels = globalForSse.__sseChannels ?? new Map()
globalForSse.__sseChannels = channels

function key(slug: string, round: number): Key {
  return `${slug}:${round}`
}

export function subscribe(
  slug: string,
  round: number,
  controller: ReadableStreamDefaultController<Uint8Array>,
): () => void {
  const k = key(slug, round)
  let set = channels.get(k)
  if (!set) {
    set = new Set()
    channels.set(k, set)
  }
  set.add(controller)

  return () => {
    set!.delete(controller)
    if (set!.size === 0) channels.delete(k)
  }
}

export function broadcastEntriesChanged(slug: string, round: number): void {
  const set = channels.get(key(slug, round))
  if (!set) return
  const payload = new TextEncoder().encode(`event: entries-changed\ndata: {}\n\n`)
  for (const controller of set) {
    try {
      controller.enqueue(payload)
    } catch {
      // stale controller; cleaned up via its own abort handler
    }
  }
}
