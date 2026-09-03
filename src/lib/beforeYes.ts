import type { Gender } from '../types'
import type { Script } from '../data/read'
import { ALL_AGREED, STATES, beforeYesTopics, ownAnswerFirst, type Topic, type YesState } from '../data/beforeYes'

/**
 * The engine behind "Before you say yes".
 *
 * It does one thing: it looks at which of the eleven conversations have been
 * had, and decides which one to open next. It has no opinion about him, none
 * about her, and none about whether they should marry. The only judgement in
 * here is about *urgency* — which gap costs the most to leave open — and even
 * that is a product of how much rides on a topic and whether they have reached
 * it at all.
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
  /** The one to open this week. */
  open: {
    id: string
    label: string
    state: YesState
    why: string
    script: Script
  }
  /** Load-bearing topics where they have talked and do not agree. */
  loadBearingDiffer: string[]
}

export type BeforeYesAnswers = Record<string, string>

/** How much a state needs attention, before it is multiplied by what rides on the topic. */
const STATE_URGENCY: Record<YesState, number> = {
  differ: 1,
  unknown: 0.8,
  'not-talked': 0.7,
  agree: 0,
}

/** A topic that carries this much is one a marriage can fail on alone. */
const LOAD_BEARING = 0.8

const WORDS = ['none', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']
function words(n: number): string {
  return WORDS[n] ?? String(n)
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

  const byState: Record<YesState, TopicReading[]> = { agree: [], differ: [], 'not-talked': [], unknown: [] }
  for (const r of readings) byState[r.state].push({ id: r.id, label: r.label, state: r.state, note: r.note })
  const counts = {
    agree: byState.agree.length,
    differ: byState.differ.length,
    'not-talked': byState['not-talked'].length,
    unknown: byState.unknown.length,
  }

  const loadBearingDiffer = readings
    .filter((r) => r.state === 'differ' && r.topic.consequence >= LOAD_BEARING)
    .map((r) => r.label)

  // ── Which one to open ────────────────────────────────────────────────────
  // Urgency is how much a state needs attention times how much rides on the
  // topic, so a disagreement about where you'd live outranks an unasked
  // question about the wedding — and an unasked question about where you'd
  // live outranks a disagreement about the wedding. Ties keep list order,
  // which is already most-consequential-first.
  const ranked = [...readings].sort(
    (a, b) => STATE_URGENCY[b.state] * b.topic.consequence - STATE_URGENCY[a.state] * a.topic.consequence,
  )
  const top = ranked[0]
  const allAgreed = counts.agree === readings.length

  const open = allAgreed
    ? { id: top.id, label: top.label, state: top.state, why: top.topic.why, script: ALL_AGREED }
    : {
        id: top.id,
        label: top.label,
        state: top.state,
        why: top.topic.why,
        script: top.state === 'unknown' ? ownAnswerFirst(gender) : top.topic.script,
      }

  // ── Headline: about the conversations, never about him ───────────────────
  let headline: string
  if (allAgreed) headline = 'You two have done the work most couples never do.'
  else if (loadBearingDiffer.length >= 2) headline = 'More than one load-bearing conversation doesn’t line up yet.'
  else if (loadBearingDiffer.length === 1) headline = 'One conversation is carrying more weight than the rest.'
  else if (counts.differ > 0) headline = 'You mostly agree — and where you don’t, it isn’t the load-bearing ones.'
  else headline = 'Nothing is broken. Several things are unasked.'

  // ── Summary: her counts in words, then why the open one matters ──────────
  const tally = `Of the ${words(readings.length)} conversations, you have had ${words(counts.agree)} where you agree, ${words(
    counts.differ,
  )} where you don’t, ${words(counts['not-talked'])} you haven’t had yet, and ${words(
    counts.unknown,
  )} where you don’t yet know your own answer.`
  const point = allAgreed
    ? 'What is left is not a gap but a habit: go back over the ones that carry the most, closer to the day, and check they still mean the same thing.'
    : open.state === 'unknown'
      ? `The one to sit with first is ${lower(open.label)} — and it starts with you, not ${gender === 'man' ? 'her' : 'him'}. ${open.why}`
      : `The one to open this week is ${lower(open.label)}. ${open.why}`

  return {
    headline,
    summary: `${tally} ${point}`,
    counts,
    byState,
    open,
    loadBearingDiffer,
  }
}

/** One line for the Guide. No detail beyond what a friend who had glanced at the list would know. */
export function beforeYesSummary(result: Pick<BeforeYesResult, 'counts' | 'byState' | 'open'>): string {
  const total = Object.values(result.counts).reduce((a, b) => a + b, 0)
  const differ = result.byState.differ[0]?.label
  return `agreed on ${words(result.counts.agree)} of ${words(total)}; differ on ${differ ? lower(differ) : 'nothing'}; open next: ${lower(result.open.label)}`
}
