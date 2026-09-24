import type { Gender } from '../types'
import type { Script } from '../data/read'
import { ALL_AGREED, beforeYesTopics, ownAnswerFirst, type Topic } from '../data/beforeYes'
import { send, whyOf, type Why } from './net'

/**
 * The client half of netlify/functions/couple.ts.
 *
 * She sends him the eleven; he answers without an account; both see only where
 * they match. Nothing in here can show either of them the other's sheet,
 * because the server never sends it — this file only ever handles the joint.
 */

const ENDPOINT = '/.netlify/functions/couple'

export type Joint = 'both-agree' | 'both-not-talked' | 'one-thinks-talked' | 'differ-somewhere' | 'unknown-somewhere'
export type CoupleView =
  | { status: 'open'; answerFor: Gender }
  // `answerFor` on the joint is the side that answered. A server older than
  // 2026-09-23 does not send it.
  | { status: 'joint'; joint: Record<string, Joint>; answerFor?: Gender }


const post = (body: unknown) =>
  send(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

/**
 * She starts it with her eleven. Returns the code the pair lives under, and
 * the owner key the server hands back once — the only thing that lets her
 * change her side before he answers. The key used to be dropped here, so the
 * server's update path was unreachable from the app: she could go through the
 * eleven again and he would still be compared against her old sheet.
 */
export async function createCouple(
  states: Record<string, string>,
  gender: Gender,
): Promise<{ code: string; key?: string } | null> {
  const res = await post({ side: 'first', gender, states })
  if (!res?.ok) return null
  try {
    const body = (await res.json()) as { code?: string; key?: string }
    if (typeof body.code !== 'string') return null
    return { code: body.code, ...(typeof body.key === 'string' ? { key: body.key } : {}) }
  } catch {
    return null
  }
}

/**
 * Her side again, under the code she already sent — only until he answers.
 * 'answered' when he already has (her side is frozen then, by design), null
 * when it did not go.
 */
export async function updateCouple(
  code: string,
  key: string,
  states: Record<string, string>,
  gender: Gender,
): Promise<'updated' | 'answered' | null> {
  const res = await post({ side: 'first', gender, states, code, key })
  if (res?.status === 409) return 'answered'
  return res?.ok ? 'updated' : null
}

/**
 * He answers, once. The joint view, 'answered' when it was already done, or
 * why it did not go.
 *
 * The reason matters more here than anywhere else in the product. This is the
 * eleventh tap of eleven, and a null used to send him to a screen reading
 * "This link isn't working — it may have expired, or been copied wrong",
 * throwing away every answer he had just given. A timeout is not a dead link,
 * and his answers are worth more than the round trip (docs/DESIGN.md).
 */
export async function answerCouple(code: string, states: Record<string, string>): Promise<CoupleView | 'answered' | Why> {
  const res = await post({ side: 'second', code, states })
  if (res?.status === 409) return 'answered'
  if (!res?.ok) return whyOf(res)
  return (await parseView(res)) ?? 'garbled'
}

/** What either of them may see. Null when it could not be read, for any reason. */
export async function readCouple(code: string): Promise<CoupleView | null> {
  const res = await send(`${ENDPOINT}?code=${encodeURIComponent(code)}`)
  if (!res?.ok) return null
  return parseView(res)
}

/** The same, saying why — so a dead link and a dead connection read differently. */
export async function readCoupleDetail(code: string): Promise<CoupleView | Why> {
  const res = await send(`${ENDPOINT}?code=${encodeURIComponent(code)}`)
  if (!res?.ok) return whyOf(res)
  return (await parseView(res)) ?? 'garbled'
}

async function parseView(res: Response): Promise<CoupleView | null> {
  try {
    const body = (await res.json()) as { status?: string; answerFor?: unknown; joint?: unknown }
    const side = body.answerFor === 'woman' || body.answerFor === 'man' ? body.answerFor : undefined
    if (body.status === 'open' && side) return { status: 'open', answerFor: side }
    if (body.status === 'joint' && body.joint && typeof body.joint === 'object')
      return { status: 'joint', joint: body.joint as Record<string, Joint>, ...(side ? { answerFor: side } : {}) }
    return null
  } catch {
    return null
  }
}

export function coupleLink(code: string, origin: string): string {
  return `${origin}/?couple=${encodeURIComponent(code)}`
}

// ── Reading the joint, in words ──────────────────────────────────────────────

export interface JointLine {
  id: string
  label: string
  kind: Joint
  line: string
}

export interface CoupleReading {
  headline: string
  lines: JointLine[]
  /** The one to open together, or null when there is nothing left to open. */
  open: { id: string; label: string; kind: Joint; script: Script } | null
  /** How many topics are in each state, for callers; never shown as digits. */
  counts: Record<Joint, number>
}

/** How much a joint state needs attention — before it is weighed by the topic. */
const URGENCY: Record<Joint, number> = {
  'one-thinks-talked': 1,
  'differ-somewhere': 0.9,
  'unknown-somewhere': 0.7,
  'both-not-talked': 0.6,
  'both-agree': 0,
}

function lower(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1)
}

function lineFor(topic: Topic, kind: Joint): string {
  const t = lower(topic.label)
  switch (kind) {
    case 'both-agree':
      return `You both say you’ve talked about ${t}, and agree.`
    case 'both-not-talked':
      return `Neither of you has raised ${t}.`
    case 'one-thinks-talked':
      return `One of you thinks you’ve had this conversation about ${t}. The other doesn’t.`
    case 'differ-somewhere':
      return `You’ve both talked about ${t} — and at least one of you says you don’t agree.`
    case 'unknown-somewhere':
      return `One of you doesn’t yet know their own answer on ${t}.`
  }
}

/**
 * Turn the joint into words. Says nothing about either person; only about the
 * conversations. Never reveals which side said what — the lines are written so
 * that they cannot.
 */
export function coupleReading(jointMap: Record<string, Joint>, gender: Gender = 'woman'): CoupleReading {
  const topics = beforeYesTopics(gender)
  const counts: Record<Joint, number> = { 'both-agree': 0, 'both-not-talked': 0, 'one-thinks-talked': 0, 'differ-somewhere': 0, 'unknown-somewhere': 0 }
  const lines: JointLine[] = []
  let best: { topic: Topic; kind: Joint; score: number } | null = null
  for (const topic of topics) {
    const kind = jointMap[topic.id]
    if (!kind || !(kind in URGENCY)) continue
    counts[kind] += 1
    lines.push({ id: topic.id, label: topic.label, kind, line: lineFor(topic, kind) })
    const score = URGENCY[kind] * topic.consequence
    if (score > 0 && (!best || score > best.score)) best = { topic, kind, score }
  }
  // Most urgent first, so what she reads first is what matters most.
  lines.sort((a, b) => URGENCY[b.kind] - URGENCY[a.kind])

  const headline = best
    ? counts['one-thinks-talked'] > 0
      ? 'One of you thinks you’ve had a conversation the other doesn’t remember having.'
      : counts['differ-somewhere'] > 0
        ? 'You’ve had the conversations. Not all of them landed the same way.'
        : 'Nothing is crossed. Some things are still unopened between you.'
    : 'You two have had all eleven, and you agree on all of them.'

  return {
    headline,
    lines,
    // When one of them does not know their own answer yet, the conversation to
    // open is with themselves first — the same words the single-sided eleven
    // gives for "I don't know my own answer" (src/data/eleven.ts).
    open: best
      ? {
          id: best.topic.id,
          label: best.topic.label,
          kind: best.kind,
          script: best.kind === 'unknown-somewhere' ? ownAnswerFirst(gender) : best.topic.script,
        }
      : lines.length
        ? { id: lines[0].id, label: lines[0].label, kind: lines[0].kind, script: ALL_AGREED }
        : null,
    counts,
  }
}
