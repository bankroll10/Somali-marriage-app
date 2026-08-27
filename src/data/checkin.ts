/**
 * The daily check-in — "How's your heart today?"
 *
 * This is the act of returning: one tap, acknowledged warmly, threaded into the
 * Guide so the app visibly *remembers*. Deliberately no streaks, no scores —
 * dopamine mechanics are off-brand. The reward is being known.
 */
import type { CheckIn, MoodId } from '../types'

export type { MoodId }

export interface Mood {
  id: MoodId
  emoji: string
  label: string
  /** Warm one-line acknowledgment shown after checking in. */
  ack: string
  /** Line the Guide weaves into its greeting the same day. */
  guideLine: string
  /** Optional gentle next step. */
  nudge?: { label: string; target: 'guide' | 'discovery' }
}

export const moods: Mood[] = [
  {
    id: 'steady',
    emoji: '🌿',
    label: 'Steady',
    ack: 'Alhamdulillah. Steady is underrated — it’s what good decisions are made from.',
    guideLine: 'You checked in steady today — I love that for you. Let’s keep it that way.',
  },
  {
    id: 'hopeful',
    emoji: '✨',
    label: 'Hopeful',
    ack: 'Hold onto that. Hope with intention is how good things begin.',
    guideLine: 'You checked in hopeful today — a good day to move with intention.',
    nudge: { label: 'See who’s in your scene', target: 'discovery' },
  },
  {
    id: 'heavy',
    emoji: '🌧️',
    label: 'Heavy',
    ack: 'Then be gentle with yourself today. Heavy days pass — they always do.',
    guideLine: 'I saw your check-in — today feels heavy. We can start there if you want.',
    nudge: { label: 'Sit with your guide', target: 'guide' },
  },
  {
    id: 'overthinking',
    emoji: '🌀',
    label: 'Overthinking',
    ack: 'Let’s separate the facts from the story. You don’t have to untangle it alone.',
    guideLine: 'You checked in overthinking today. Let’s slow it down together — what’s the loop?',
    nudge: { label: 'Talk it through', target: 'guide' },
  },
]

export function getMood(id: MoodId): Mood {
  return moods.find((m) => m.id === id) ?? moods[0]
}

/** Local-date key so a check-in belongs to a calendar day. */
export function todayKey(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Date key for n days ago (n=0 → today). */
export function dayKey(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return todayKey(d)
}

function moodOn(history: CheckIn[], key: string): MoodId | null {
  return (history.find((c) => c.date === key)?.mood as MoodId) ?? null
}

/** Whole days between two date keys (a − b). */
function daysBetween(aKey: string, bKey: string): number {
  const a = new Date(`${aKey}T00:00:00`).getTime()
  const b = new Date(`${bKey}T00:00:00`).getTime()
  return Math.round((a - b) / 86_400_000)
}

/** The most recent check-in strictly before `refKey`, or null. */
function lastCheckInBefore(history: CheckIn[], refKey: string): string | null {
  const prior = history
    .map((c) => c.date)
    .filter((d) => d < refKey)
    .sort()
  return prior.length ? prior[prior.length - 1] : null
}

/**
 * The last 7 calendar days (oldest first), for the "Your week" strip.
 * Missed days are quiet nulls — dots, never broken chains. No streaks here,
 * by design: accumulation without guilt.
 */
export function weekStrip(history: CheckIn[]): { key: string; mood: MoodId | null }[] {
  const days: { key: string; mood: MoodId | null }[] = []
  for (let i = 6; i >= 0; i--) {
    const key = dayKey(i)
    days.push({ key, mood: moodOn(history, key) })
  }
  return days
}

/** Pre-check-in continuity: the app remembers yesterday. */
export function yesterdayLine(history: CheckIn[]): string | null {
  const y = moodOn(history, dayKey(1))
  if (!y) return null
  return `Yesterday you checked in ${getMood(y).label.toLowerCase()}.`
}

/**
 * The comeback line — a warm re-entry after time away, shown before checking in.
 * The most fragile moment in any habit is the return, so it gets no guilt and no
 * broken-streak framing: the door was always open. (Returning without shame is
 * the whole spirit of the thing.) Null unless there's a real gap to acknowledge.
 */
export function comebackLine(history: CheckIn[]): string | null {
  const today = todayKey()
  if (moodOn(history, today)) return null // already here today
  const last = lastCheckInBefore(history, today)
  if (!last) return null // never checked in — nothing to come back to
  const gap = daysBetween(today, last)
  if (gap <= 1) return null // yesterday's continuity line handles this
  if (gap === 2) return 'Good to see you again — it’s been a couple of days.'
  if (gap <= 6) return 'Welcome back. It’s been a few days — no guilt here; your space kept your place.'
  return 'Welcome back. However long it’s been, the path is still yours — right where you left it.'
}

/**
 * Post-check-in pattern recognition — the earned reward of showing up.
 * Hand-written rules; warm, never scorekeeping.
 */
export function checkInReflection(history: CheckIn[]): string | null {
  const today = moodOn(history, dayKey(0))
  if (!today) return null

  // Coming back after a gap is the moment that matters most — reward the return
  // itself before any weekly pattern. The days away are never counted against you.
  const last = lastCheckInBefore(history, dayKey(0))
  if (last) {
    const gap = daysBetween(dayKey(0), last)
    if (gap >= 7)
      return 'You came back. That’s the whole practice — returning, however long it’s been. Welcome home.'
    if (gap >= 3)
      return 'You came back after a few days away — that quiet return is its own kind of strength.'
  }

  const yesterday = moodOn(history, dayKey(1))

  // Count of today's mood across the last 7 days (incl. today).
  let sameThisWeek = 0
  for (let i = 0; i < 7; i++) if (moodOn(history, dayKey(i)) === today) sameThisWeek++

  if (sameThisWeek >= 3) {
    const lines: Record<MoodId, string> = {
      steady: `That’s ${sameThisWeek} steady days this week — calm is becoming your baseline.`,
      hopeful: `Hope keeps showing up this week. Let it.`,
      heavy: `A heavy stretch — ${sameThisWeek} days this week. Be gentle with yourself, and let your guide carry some of it.`,
      overthinking: `The loop has been loud this week. One fact-check at a time — your guide can help you untangle it.`,
    }
    return lines[today]
  }

  if (yesterday && yesterday !== today) {
    if ((yesterday === 'heavy' || yesterday === 'overthinking') && (today === 'steady' || today === 'hopeful'))
      return 'Lighter than yesterday. Alhamdulillah — hold onto what helped.'
    if ((today === 'heavy' || today === 'overthinking') && (yesterday === 'steady' || yesterday === 'hopeful'))
      return 'Heavier than yesterday — that’s allowed. Days move; you don’t have to fix today, just carry it kindly.'
  }
  return null
}

/**
 * Journey milestones — quiet recognition on exact days only (3, 7, 14, 30).
 * Self-expiring by design: no badges, no counters lingering on other days,
 * nothing to lose. Showing up is noticed, never scored.
 */
export function journeyLine(firstSeen: string, checkInCount: number): string | null {
  if (!firstSeen) return null
  const start = new Date(`${firstSeen}T00:00:00`)
  const now = new Date(`${todayKey()}T00:00:00`)
  const day = Math.round((now.getTime() - start.getTime()) / 86_400_000) + 1
  switch (day) {
    case 3:
      return 'Day three. Habits start this quietly.'
    case 7:
      return checkInCount >= 3
        ? `A week with Niyyah — ${checkInCount} check-ins, and counting.`
        : 'A week with Niyyah.'
    case 14:
      return 'Two weeks in. Steadiness suits you.'
    case 30:
      return 'A month. This is a practice now.'
    default:
      return null
  }
}

/**
 * What the guide says on opening, given the week's history. Today's mood wins;
 * a heavy pattern earns a gentler, more knowing greeting.
 */
export function guideOpeningLine(history: CheckIn[]): string | undefined {
  const today = moodOn(history, dayKey(0))
  let heavyish = 0
  for (let i = 0; i < 7; i++) {
    const m = moodOn(history, dayKey(i))
    if (m === 'heavy' || m === 'overthinking') heavyish++
  }
  if (today) {
    const base = getMood(today).guideLine
    return heavyish >= 3
      ? `${base} And I’ve noticed this week has asked a lot of you — we can take it slowly.`
      : base
  }
  if (heavyish >= 3)
    return 'I’ve noticed a few heavy days this week. No pressure to perform here — we can start wherever you are.'
  return undefined
}
