import type { Dimension, ModeId, StepRecord } from '../types'

/**
 * The bridge from diagnosis to practice — the working half of the readiness map.
 *
 * A map that names your thinnest ground and stops there leaves a person exactly
 * as anxious as they arrived. So every dimension has ONE honest, doable thing —
 * small enough to do this week, specific enough that you know if you did it.
 *
 * You take one on, you do it, you mark it done. That's the whole mechanic.
 * Deliberately never a checklist and never a chore: one thing at a time, nothing
 * scored, and no badge for finishing. Completing a step does NOT move your
 * readiness number — the honest loop is that doing the work changes your
 * answers, and your answers are the map.
 */
export interface NextStep {
  /** What this ground is really about, in plain words. */
  frame: string
  /** The one thing to actually do. */
  action: string
  /** What it meant, said back to them once it's done. The only reward there is. */
  done: string
  /** The guidance voice best suited to talk it through. */
  mode: ModeId
}

const STEPS: Record<Dimension, NextStep> = {
  intention: {
    frame: 'Intention is the ground everything else stands on — and it gets vague when we carry other people’s reasons.',
    action:
      'Write one sentence: why marriage, and why now. In your own words, not your family’s. Say it out loud once.',
    done: 'You said it in your own words. That sentence is yours now — everything else gets measured against it.',
    mode: 'islamic',
  },
  faith: {
    frame:
      'Faith here isn’t about being perfect — it’s about whether your practice and your partner’s can walk at the same pace.',
    action:
      'Pray one prayer on time today that you’d normally let slide. Notice what it does to the rest of your day.',
    done: 'One prayer on time. Small, and not small at all.',
    mode: 'islamic',
  },
  family: {
    frame:
      'Most family friction isn’t disagreement — it’s that no one has said the real thing out loud yet.',
    action:
      'Tell one person in your family what you’re actually looking for, before they tell you what they want for you.',
    done: 'You said the real thing to the people it’s hardest to say it to. That changes what gets brought to you.',
    mode: 'auntie',
  },
  vision: {
    frame:
      'A vague future is hard to align with. The clearer your ordinary days look, the faster you’ll recognise someone who fits them.',
    action:
      'Picture an ordinary Tuesday evening five years from now. Who’s there, what’s cooking, what does the room sound like? Write three lines.',
    done: 'You’ve seen the ordinary Tuesday. You’ll recognise it now when someone fits in it.',
    mode: 'matchmaker',
  },
  character: {
    frame:
      'Character is read in pressure, not in conversation. Knowing what you’re looking for makes it much harder to be charmed past it.',
    action:
      'Think of the last time someone showed you who they were under pressure. Name what it told you — and what you’d want to see instead.',
    done: 'You named what pressure revealed. That’s the thing charm can’t talk you out of.',
    mode: 'brother',
  },
  emotional: {
    frame:
      'This is the ground that decides how a good match actually feels day to day. Walls and spirals both live here.',
    action:
      'Next time you want to go quiet on someone, say “I need a moment, I’m not disappearing” instead. Once is enough to prove it’s possible.',
    done: 'You stayed in the room instead of going quiet. That’s the whole skill.',
    mode: 'therapist',
  },
  selfAwareness: {
    frame:
      'Self-awareness is the most attractive thing you can bring — and the hardest to grade yourself on.',
    action:
      'Ask one person who loves you: “What’s the hardest part of being close to me?” Listen without defending. Just say thank you.',
    done: 'You asked, and you didn’t defend. Most people never do.',
    mode: 'therapist',
  },
}

export function nextStepFor(dimension: Dimension): NextStep {
  return STEPS[dimension]
}

/**
 * Which ground to offer, in order. Thinnest first (the map's own ordering) —
 * but ground you've already worked drops behind ground you haven't, so the app
 * keeps handing you something new instead of the same weak spot forever.
 */
export function groundOrder(thinnest: Dimension[], steps: StepRecord[]): Dimension[] {
  const worked = new Map<Dimension, number>()
  for (const s of steps) {
    if (s.done) worked.set(s.dimension, (worked.get(s.dimension) ?? 0) + 1)
  }
  return [...thinnest].sort((a, b) => {
    const wa = worked.get(a) ?? 0
    const wb = worked.get(b) ?? 0
    if (wa !== wb) return wa - wb
    return thinnest.indexOf(a) - thinnest.indexOf(b)
  })
}

/** The open step, if one is being carried. At most one at a time — by design. */
export function openStep(steps: StepRecord[]): StepRecord | null {
  return [...steps].reverse().find((s) => !s.done) ?? null
}

/** Steps finished, most recent first. */
export function doneSteps(steps: StepRecord[]): StepRecord[] {
  return steps.filter((s) => s.done).sort((a, b) => (a.done! < b.done! ? 1 : -1))
}

/** Whole days between two YYYY-MM-DD keys (a − b). */
export function daysApart(aKey: string, bKey: string): number {
  const a = new Date(`${aKey}T00:00:00`).getTime()
  const b = new Date(`${bKey}T00:00:00`).getTime()
  return Math.round((a - b) / 86_400_000)
}

/** "today" / "yesterday" / "4 days ago" — for dating a step without a timestamp. */
export function whenLabel(key: string, today: string): string {
  const d = daysApart(today, key)
  if (d <= 0) return 'today'
  if (d === 1) return 'yesterday'
  if (d < 7) return `${d} days ago`
  if (d < 14) return 'last week'
  return `${Math.round(d / 7)} weeks ago`
}

