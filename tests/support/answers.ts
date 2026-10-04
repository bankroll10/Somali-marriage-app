import type { Served } from './server'

/**
 * Answers to a withdrawal (`DELETE /introduce?code=`) that the real handler did
 * not give, and a way to put one in the phone's ear (docs/DECISIONS.md Part 32).
 *
 * `answerDelete` wraps whatever `fetch` `serve()` installed, so the rest of the
 * path is the real handlers over the in-memory store. With `completed`, the real
 * handler runs first — the record is deleted and the marker written — and the
 * phone hears `reply` instead: a confirmation that was lost, cut or garbled.
 * Without it the handler never runs and the phone is told `reply`: an invalid
 * answer that looks like a success, with the record still there. The request is
 * logged on `server.requests` either way, because the phone sent it either way.
 */

/** A response with this body; a 204 may not carry one, even an empty one. */
export const text =
  (body: string, status = 200, type = 'application/json') =>
  () =>
    new Response(status === 204 ? null : body, { status, headers: { 'content-type': type } })

/** A 200 whose body ends mid-read: the status was sent, the answer never finished. */
export const cutStream = () =>
  new Response(
    new ReadableStream({
      start(c) {
        c.enqueue(new TextEncoder().encode('{"remo'))
        c.error(new TypeError('terminated'))
      },
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  )

/** No answer at all: the phone's fetch rejects. */
export const gone = (): Response => {
  throw new TypeError('Failed to fetch')
}

/** The app's own page, which Netlify's catch-all answers with a 200 for a path that has no function behind it. */
export const appHtml = text('<!doctype html><title>Niyyah</title>', 200, 'text/html')

/** The routes a DELETE can be answered on: the four Forget me sends one to. */
export type Route = 'introduce' | 'keep' | 'progress' | 'couple'

/**
 * Make the next DELETEs to a route (the introduction list's, unless `route` says
 * otherwise) be answered by `reply`. Returns the way back.
 * With `only`, just the DELETEs under that code are: another code's reach the real handler.
 */
export function answerDelete(server: Served, reply: () => Response, completed: boolean, only?: string, route: Route = 'introduce'): () => void {
  const real = globalThis.fetch
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === 'DELETE' && String(input).includes(`/${route}?`) && (only === undefined || String(input).includes(`=${only}`))) {
      if (completed) await real(input, init)
      else server.requests.push(`DELETE ${String(input)}`)
      return reply()
    }
    return real(input, init)
  }) as typeof fetch
  return () => {
    globalThis.fetch = real
  }
}
