import type { Gender } from '../types'
import type { Script } from '../data/read'
import { STATES, allHad as allHadScript, beforeYesTopics, sayTheLine, scriptForState, type Topic, type YesState } from '../data/beforeYes'

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
  /** The differences she named as a line for her. Never in `byState`, never opened. */
  lines: TopicReading[]
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
 *
 * `lines` are the topics she answered "we don't agree" and then "it's a line
 * for me" (src/data/beforeYes.ts, LINE). They are read as what she said —
 * a difference that is not hers to negotiate — and so they are never chosen
 * as the conversation to open, and never given words to work them out. They
 * sit in their own list, with words for saying a line plainly, once.
 */
export function buildBeforeYes(answers: BeforeYesAnswers, gender: Gender = 'woman', lines: string[] = []): BeforeYesResult | null {
  const topics = beforeYesTopics(gender)
  if (topics.some((t) => !STATES.some((s) => s.id === answers[t.id]))) return null
  // A line is only ever a difference; anything else in the list is stale.
  const isLine = (id: string) => answers[id] === 'differ' && lines.includes(id)

  const readings: (TopicReading & { topic: Topic })[] = topics.map((topic) => {
    const state = answers[topic.id] as YesState
    const note = isLine(topic.id) ? `you have talked about ${lower(topic.label)}, and it is a line for you` : noteFor(topic, state)
    return { id: topic.id, label: topic.label, state, note, topic }
  })

  const byState: Record<YesState, TopicReading[]> = { agree: [], settled: [], differ: [], 'not-talked': [], unknown: [] }
  const lineReadings: TopicReading[] = []
  for (const r of readings) {
    const reading = { id: r.id, label: r.label, state: r.state, note: r.note }
    if (isLine(r.id)) lineReadings.push(reading)
    else byState[r.state].push(reading)
  }
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
  // which is already most-consequential-first. A line is not a candidate.
  const candidates = readings.filter((r) => !isLine(r.id))
  const ranked = [...candidates].sort(
    (a, b) => STATE_URGENCY[b.state] * b.topic.consequence - STATE_URGENCY[a.state] * a.topic.consequence,
  )
  const top = ranked[0]
  // Had, and each agreed or worked out — lines included, since a line is a
  // conversation had. Nothing left to open, only to go back over.
  const allHad = counts.agree + counts.settled + lineReadings.length === readings.length

  const firstLine = readings.find((r) => isLine(r.id))!
  const open = !top
    ? // Every one of the eleven is a line. There is nothing to open; the
      // words are for saying the first of them plainly.
      { id: firstLine.id, label: firstLine.label, state: firstLine.state, why: firstLine.topic.why, script: sayTheLine(gender) }
    : allHad
      ? { id: top.id, label: top.label, state: top.state, why: top.topic.why, script: allHadScript(gender) }
      : {
          id: top.id,
          label: top.label,
          state: top.state,
          why: top.topic.why,
          script: scriptForState(top.topic, top.state, gender),
        }

  // ── Headline: about the conversations, never about him ───────────────────
  // A difference is named as a conversation still open, never as something
  // that "doesn't line up yet": that "yet" said agreement was where every
  // difference was headed, and an arranged difference is an end state too
  // (docs/DECISIONS.md Part 8). A line she has named comes first: it is the
  // most she has told us, and it is said as what she said.
  const n = lineReadings.length
  let headline: string
  if (n === 1) headline = 'You’ve named one line the two of you don’t share.'
  else if (n > 1) headline = `You’ve named ${words(n)} lines the two of you don’t share.`
  else if (allHad && counts.settled === 0) headline = `You have had all ${words(readings.length)}, and you agree on every one.`
  else if (allHad) headline = `You have had all ${words(readings.length)}. Where you see things differently, you have worked out how.`
  else if (counts.differ === 1) headline = 'One conversation is still open between you.'
  else if (counts.differ > 1) headline = `${capital(words(counts.differ))} conversations are still open between you.`
  else headline = 'Nothing you have talked about is still open. Some conversations are still unopened.'

  // ── Summary: her counts in words, then why the open one matters ──────────
  const settledPart = counts.settled
    ? `${words(counts.settled)} where you see it differently and have worked out how, `
    : ''
  const linePart = n ? `${words(n)} you have named as a line for you, ` : ''
  const tally = `Of the ${words(readings.length)} conversations, you have had ${words(counts.agree)} where you agree, ${settledPart}${linePart}${words(
    counts.differ,
  )} that ${counts.differ === 1 ? 'is' : 'are'} still open, ${words(counts['not-talked'])} you haven’t had yet, and ${words(
    counts.unknown,
  )} where you don’t yet know your own answer.`
  const aboutLines = n
    ? ` ${n === 1 ? 'A line is' : 'Lines are'} not on this list to be worked out, and nothing here will hand ${n === 1 ? 'it' : 'one'} back to you as the conversation to open.`
    : ''
  const point = !top
    ? 'There is nothing here to open. The words below are for saying a line plainly, once, if you have not.'
    : allHad
      ? 'What is left is not a gap but a habit: go back over them closer to the day, and check they still mean the same thing.'
      : open.state === 'unknown'
        ? `The one to sit with first is ${lower(open.label)} — and it starts with you, not ${gender === 'man' ? 'her' : 'him'}. ${open.why}`
        : `The one to open this week is ${lower(open.label)}. ${open.why}`

  return {
    headline,
    summary: `${tally}${aboutLines} ${point}`,
    counts,
    byState,
    lines: lineReadings,
    allHad,
    open,
  }
}

/** One line for the Guide. No detail beyond what a friend who had glanced at the list would know. */
export function beforeYesSummary(result: Pick<BeforeYesResult, 'counts' | 'byState' | 'lines' | 'open'>): string {
  const total = Object.values(result.counts).reduce((a, b) => a + b, 0) + result.lines.length
  const differ = result.byState.differ[0]?.label
  return `agreed on ${words(result.counts.agree)} of ${words(total)}; differ on ${differ ? lower(differ) : 'nothing'}; open next: ${lower(result.open.label)}`
}
