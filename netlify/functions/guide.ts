import Anthropic from '@anthropic-ai/sdk'
import type { Context } from '@netlify/functions'

/**
 * The live Guide.
 *
 * The persona, the member's readiness map, the live app state and the grounding
 * rules all come from `guideSystemPrompt` in src/lib/coach.ts — the prompt was
 * written alongside the six voices and is the single source of truth for how
 * this guide speaks. This function only carries it to the model.
 *
 * Dormant by default: with no ANTHROPIC_API_KEY set it returns 503 and the app
 * falls back to its local matcher, which is exactly today's behaviour. That is
 * deliberate — the Trust screen promises answers stay on the device, and that
 * promise must be rewritten in the same change that switches this on.
 */

// Effort, chosen by measurement rather than instinct.
//
// Timed against the real system prompt on three questions a member would
// actually ask: `medium` returned in 12.1s / 5.5s / 14.3s, `low` in
// 7.7s / 5.0s / 4.4s. Two of the three medium calls exceeded the client's
// fallback timeout — meaning the member would have silently received the
// offline voice instead of this one, the worst kind of failure because
// nothing about it looks like one.
//
// Quality did not pay for the wait. On the hardest culturally specific
// question of the three, the `low` reply was the better answer: it tied its
// advice back to what she had named as her hardest part, which the `medium`
// reply never did. Replies here are capped at 180 words — exactly the shape
// of route that does not repay deeper thinking. Raise it only with numbers.
const EFFORT = 'low'
const MODEL = 'claude-opus-5'

interface Body {
  system?: string
  message?: string
  /** Prior turns in this thread, oldest first, so the guide remembers. */
  history?: { role: 'user' | 'coach'; text: string }[]
}

export default async function handler(req: Request, _context: Context) {
  // A GET is a health check, openable from a phone. It exists because every
  // failure on the POST path is deliberately invisible — the app falls back to
  // its offline voice on 404, 503, a hang, or a bad key alike, and the member
  // just gets a lesser answer with nothing to indicate why. When that happens
  // there is otherwise no way to tell "the key is wrong" from "this route was
  // never reachable". Reports booleans and error names only; never the key.
  if (req.method === 'GET') {
    const key = process.env.ANTHROPIC_API_KEY
    const diagnostic: Record<string, unknown> = {
      route: 'reachable',
      keyPresent: !!key,
      keyLooksValid: !!key && key.startsWith('sk-ant-'),
      keyLength: key ? key.length : 0,
      model: MODEL,
      effort: EFFORT,
    }
    if (key) {
      try {
        const started = Date.now()
        const res = await new Anthropic().messages.create({
          model: MODEL,
          max_tokens: 16,
          system: 'Reply with exactly: OK',
          thinking: { type: 'adaptive' },
          output_config: { effort: EFFORT },
          messages: [{ role: 'user', content: 'Reply with exactly: OK' }],
        })
        diagnostic.call = 'ok'
        diagnostic.ms = Date.now() - started
        diagnostic.stopReason = res.stop_reason
      } catch (err) {
        diagnostic.call = 'failed'
        diagnostic.errorName = err instanceof Error ? err.name : typeof err
        diagnostic.errorStatus = (err as { status?: number })?.status ?? null
        diagnostic.errorMessage = err instanceof Error ? err.message.slice(0, 300) : String(err).slice(0, 300)
      }
    }
    return Response.json(diagnostic)
  }

  if (req.method !== 'POST') {
    return Response.json({ error: 'POST only' }, { status: 405 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    // Not an error — the guide simply isn't switched on yet.
    return Response.json({ error: 'guide_not_configured' }, { status: 503 })
  }

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return Response.json({ error: 'bad_json' }, { status: 400 })
  }

  const message = body.message?.trim()
  const system = body.system?.trim()
  if (!message || !system) {
    return Response.json({ error: 'missing_message_or_system' }, { status: 400 })
  }

  // Keep the tail of the thread only. The map is already in the system prompt,
  // so old turns buy continuity, not context, and they are the cheapest thing
  // to drop.
  const history = (body.history ?? []).slice(-10)

  /** Map an SDK error onto the 503 contract the client already understands. */
  function errorResponse(err: unknown): Response {
    if (err instanceof Anthropic.RateLimitError) {
      return Response.json({ error: 'rate_limited' }, { status: 503 })
    }
    if (err instanceof Anthropic.AuthenticationError) {
      console.error('[niyyah] guide: bad API key')
      return Response.json({ error: 'auth' }, { status: 503 })
    }
    if (err instanceof Anthropic.APIError) {
      console.error('[niyyah] guide: API error', err.status, err.message)
      return Response.json({ error: 'upstream' }, { status: 503 })
    }
    console.error('[niyyah] guide: unexpected', err)
    return Response.json({ error: 'unexpected' }, { status: 503 })
  }

  const stream = new Anthropic().messages.stream({
    model: MODEL,
    max_tokens: 8192,
    system,
    thinking: { type: 'adaptive' },
    output_config: { effort: EFFORT },
    messages: [
      ...history.map((m) => ({
        role: (m.role === 'coach' ? 'assistant' : 'user') as 'assistant' | 'user',
        content: m.text,
      })),
      { role: 'user' as const, content: message },
    ],
  })

  // Pull events by hand until the first word of the answer.
  //
  // This exists so the error contract survives streaming. Once a streamed
  // response has begun, its status is already 200 and a later failure can only
  // truncate the body — so an auth error or a rate limit would reach the member
  // as a silently short answer rather than as a fallback to the offline voice.
  // Draining up to the first text delta keeps every pre-answer failure a clean
  // 503, exactly as it was before, and costs nothing the member can perceive:
  // the wait is until the first word either way.
  const iterator = stream[Symbol.asyncIterator]()
  let first: string | null = null
  try {
    for (;;) {
      const { value, done } = await iterator.next()
      if (done) break
      if (value.type === 'content_block_delta' && value.delta.type === 'text_delta') {
        first = value.delta.text
        break
      }
    }
  } catch (err) {
    return errorResponse(err)
  }

  // No text at all: an empty completion, or a safety decline, which is a real
  // outcome rather than a crash. Either way the app falls back to its local
  // voice instead of showing the member an error.
  if (first === null) return Response.json({ error: 'empty' }, { status: 503 })

  const encoder = new TextEncoder()
  const answer = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encoder.encode(first))
      try {
        for (;;) {
          const { value, done } = await iterator.next()
          if (done) break
          if (value.type === 'content_block_delta' && value.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(value.delta.text))
          }
        }
      } catch (err) {
        // Mid-answer failure. The member keeps the words that arrived, which is
        // better than replacing a partial answer with an error; nothing else
        // can be done once the status line has gone.
        console.error('[niyyah] guide: stream ended early', err)
      }
      controller.close()
    },
    cancel() {
      // The member navigated away or the client timed out — stop generating.
      void stream.abort()
    },
  })

  return new Response(answer, {
    headers: {
      // Plain text, not SSE: the client only ever appends what arrives, so
      // there is no framing to parse and nothing to go wrong in between.
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      // Discourage any proxy from buffering the whole answer and handing it
      // over at once, which would quietly undo the point of this.
      'X-Accel-Buffering': 'no',
    },
  })
}
