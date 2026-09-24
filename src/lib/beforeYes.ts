import type { Gender } from '../types'
import type { Script } from '../data/read'
import { ALL_AGREED, STATES, beforeYesTopics, ownAnswerFirst, type Topic, type YesState } from '../data/beforeYes'

/**
 * The engine behind "Before you say yes".
 *
 * It does one thing: it looks at which of the eleven conversations have been
 * had, and decides which one to open next. It has no opinion about him, none
 * about her, and none about whether they should marry. The only judgement in
 * here is which one to open first — a product of each topic's `consequence`
 * and whether they have reached it at all.
 *
 * That order is editorial. Nobody has measured which of the eleven a marriage
 * fails on — `ended.which` exists to find out — so the order decides only
 * which conversation gets the words first, and is never said to her as a
 * weight. The headline used to be: "where you don't, it isn't the ones that
 * carry the most weight" told a couple who differed on qabiil or going back
 * that theirs was a light difference, on a number we made up
 * (docs/PRODUCT.md S6). A difference is now named as a difference.
 */

export interface TopicReading {
  id: string
  label: string
  state: YesState
  /** Stated as fact, from her side. */
  note: string
}

export interface BeforeYesResult {
  headline: string
  summary: string
  /** Kept numeric here for callers; prose always spells these out. */
  counts: Record<YesState, number>
  byState: Record<YesState, TopicReading[]>
  /**
   * Every conversation has been had, and each one either agreed or arranged.
   * Nothing is left to open, so what is offered is going back over them.
   */
  allHad: boolean
  /** The one to open this week. */
  open: {
    id: string
    label: string
    state: YesState
    why: string
    script: Script
  }
}

export type BeforeYesAnswers = Record<string, string>

/**
 * How much a state needs attention, before it is multiplied by what rides on the topic.
 *
 * `settled` sits just above agreement and below every conversation not yet
 * had: an arrangement is worth going back over closer to the day, the way an
 * agreement is, and never ahead of something the two of them have not said.
 * An open difference still comes first. That is not because a difference is
 * bad; it is the one conversation they have started and not finished.
 */
const STATE_URGENCY: Record<YesState, number> = {
  differ: 1,
  unknown: 0.8,
  'not-talked': 0.7,
  settled: 0.2,
  agree: 0,
}


const WORDS = ['none', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']
function words(n: number): string {
  return WORDS[n] ?? String(n)
}

function capital(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function lower(label: string): string {
  return label.charAt(0).toLowerCase() + label.slice(1)
}

function noteFor(topic: Topic, state: YesState): string {
  const template = STATES.find((s) => s.id === state)?.note ?? ''
  return template.replace('{topic}', lower(topic.label))
}

/**
 * Read which conversations have been had.
 *
 * Every topic must be answered; an incomplete list would silently tell her the
 * things she skipped are fine.
 */
export function buildBeforeYes(answers: BeforeYesAnswers, gender: Gender = 'woman'): BeforeYesResult | null {
  const topics = beforeYesTopics(gender)
  if (topics.some((t) => !STATES.some((s) => s.id === answers[t.id]))) return null

  const readings: (TopicReading & { topic: Topic })[] = topics.map((topic) => {
    const state = answers[topic.id] as YesState
    return { id: topic.id, label: topic.label, state, note: noteFor(topic, state), topic }
  })

  const byState: Record<YesState, TopicReading[]> = { agree: [], settled: [], differ: [], 'not-talked': [], unknown: [] }
  for (const r of readings) byState[r.state].push({ id: r.id, label: r.label, state: r.state, note: r.note })
  const counts = {
    agree: byState.agree.length,
    settled: byState.settled.length,
    differ: byState.differ.length,
    'not-talked': byState['not-talked'].length,
    unknown: byState.unknown.length,
  }

  // ── Which one to open ────────────────────────────────────────────────────
  // Urgency is how much a state needs attention times the topic's editorial
  // `consequence`, so a disagreement about where you'd live outranks an unasked
  // question about the wedding — and an unasked question about where you'd
  // live outranks a disagreement about the wedding. Ties keep list order,
  // which is already most-consequential-first.
  const ranked = [...readings].sort(
    (a, b) => STATE_URGENCY[b.state] * b.topic.consequence - STATE_URGENCY[a.state] * a.topic.consequence,
  )
  const top = ranked[0]
  const allHad = counts.agree + counts.settled === readings.length

  const open = allHad
    ? { id: top.id, label: top.label, state: top.state, why: top.topic.why, script: ALL_AGREED }
    : {
        id: top.id,
        label: top.label,
        state: top.state,
        why: top.topic.why,
        script: top.state === 'unknown' ? ownAnswerFirst(gender) : top.topic.script,
      }

  // ── Headline: about the conversations, never about him ───────────────────
  // A difference is named as a conversation still open, never as something
  // that "doesn't line up yet": that "yet" said agreement was where every
  // difference was headed, and an arranged difference is an end state too
  // (docs/DECISIONS.md Part 8).
  let headline: string
  if (allHad && counts.settled === 0) headline = `You have had all ${words(readings.length)}, and you agree on every one.`
  else if (allHad) headline = `You have had all ${words(readings.length)}. Where you see things differently, you have worked out how.`
  else if (counts.differ === 1) headline = 'One conversation is still open between you.'
  else if (counts.differ > 1) headline = `${capital(words(counts.differ))} conversations are still open between you.`
  else headline = 'Nothing you have talked about is still open. Some conversations are still unopened.'

  // ── Summary: her counts in words, then why the open one matters ──────────
  const settledPart = counts.settled
    ? `${words(counts.settled)} where you see it differently and have worked out how, `
    : ''
  const tally = `Of the ${words(readings.length)} conversations, you have had ${words(counts.agree)} where you agree, ${settledPart}${words(
    counts.differ,
  )} that ${counts.differ === 1 ? 'is' : 'are'} still open, ${words(counts['not-talked'])} you haven’t had yet, and ${words(
    counts.unknown,
  )} where you don’t yet know your own answer.`
  const point = allHad
    ? 'What is left is not a gap but a habit: go back over them closer to the day, and check they still mean the same thing.'
    : open.state === 'unknown'
      ? `The one to sit with first is ${lower(open.label)} — and it starts with you, not ${gender === 'man' ? 'her' : 'him'}. ${open.why}`
      : `The one to open this week is ${lower(open.label)}. ${open.why}`

  return {
    headline,
    summary: `${tally} ${point}`,
    counts,
    byState,
    allHad,
    open,
  }
}

/** One line for the Guide. No detail beyond what a friend who had glanced at the list would know. */
export function beforeYesSummary(result: Pick<BeforeYesResult, 'counts' | 'byState' | 'open'>): string {
  const total = Object.values(result.counts).reduce((a, b) => a + b, 0)
  const differ = result.byState.differ[0]?.label
  return `agreed on ${words(result.counts.agree)} of ${words(total)}; differ on ${differ ? lower(differ) : 'nothing'}; open next: ${lower(result.open.label)}`
}
