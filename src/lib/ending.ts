import type {
  Answers,
  CoupleState,
  FollowUp,
  Gender,
  MapSnapshot,
  ReadRecord,
  StepRecord,
  VouchState,
} from '../types'
import { buildBeforeYes } from './beforeYes'
import { conversationsHad } from './followup'
import { relationshipLabel } from '../data/vouch'

/**
 * How you chose.
 *
 * The success state of this product is that someone deletes it because it
 * worked. Every other app in this category treats that as churn and designs
 * against it; here it is the goal, and until now it produced nothing at all —
 * she tapped a stage chip, the screen changed shape, and everything she had
 * done evaporated with the browser storage it lived in.
 *
 * This builds the one thing worth handing her on the way out: a true record of
 * how she made the decision. Every line comes from something she actually did,
 * dated from her own history — nothing is inferred, nothing is flattering, and
 * a person who did very little gets a short record rather than a padded one.
 *
 * Pure: everything it needs is passed in, so it can be tested without a browser
 * and can never reach for anything she did not give it.
 */

export interface EndingLine {
  /** What happened, stated as a fact about her. */
  text: string
  /** The day, YYYY-MM-DD, where the record knows it. */
  at?: string
}

export interface Ending {
  /** The first day she did anything here. */
  began?: string
  /** How long the whole thing took, in words. */
  span?: string
  /** The story, oldest first. */
  lines: EndingLine[]
  /** Conversations she confirmed she had — the one thing this product counts. */
  conversations: string[]
}

export interface EndingInput {
  gender: Gender
  answers: Answers
  mapHistory: MapSnapshot[]
  steps: StepRecord[]
  read: ReadRecord | null
  beforeYes: ReadRecord | null
  couple: CoupleState | null
  vouch: VouchState | null
  followups: FollowUp[]
  completed: boolean
}

const DAY_MS = 24 * 60 * 60 * 1000
const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven']
const words = (n: number) => WORDS[n] ?? String(n)

function day(iso: string | undefined): string | undefined {
  if (!iso) return undefined
  const d = iso.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : undefined
}

/** How long it took, said the way a person would say it. */
function spanOf(from: string, to: string): string | undefined {
  const days = Math.round((Date.parse(`${to}T00:00:00`) - Date.parse(`${from}T00:00:00`)) / DAY_MS)
  if (!Number.isFinite(days) || days < 0) return undefined
  if (days < 14) return `${words(days)} ${days === 1 ? 'day' : 'days'}`
  if (days < 60) return `${words(Math.round(days / 7))} weeks`
  const months = Math.round(days / 30)
  if (months < 12) return `${words(months)} months`
  const years = Math.floor(months / 12)
  const rest = months % 12
  const y = `${words(years)} ${years === 1 ? 'year' : 'years'}`
  return rest === 0 ? y : `${y} and ${words(rest)} ${rest === 1 ? 'month' : 'months'}`
}

export function buildEnding(i: EndingInput, today: string): Ending {
  const lines: EndingLine[] = []

  // The map — where she started, and whether the reading moved.
  const first = i.mapHistory[0]
  const last = i.mapHistory[i.mapHistory.length - 1]
  if (first) {
    lines.push({ text: `You built your map, and it read “${first.headline}”.`, at: day(first.date) })
    if (last && last !== first && last.headline !== first.headline) {
      lines.push({ text: `By your last reading it read “${last.headline}”.`, at: day(last.date) })
    }
  } else if (i.completed) {
    lines.push({ text: 'You built your map.' })
  }

  const done = i.steps.filter((s) => s.done).length
  if (done > 0) {
    lines.push({
      text: `You finished ${words(done)} ${done === 1 ? 'piece' : 'pieces'} of work your map asked of you.`,
      at: day(i.steps.filter((s) => s.done).slice(-1)[0]?.done),
    })
  }

  // The read — what he had actually shown her, before anyone was sure.
  if (i.read) {
    lines.push({
      text: 'You took a read on what he had actually done, rather than what he said.',
      at: day(i.read.at),
    })
  }

  // The eleven — the conversations most people have too late.
  if (i.beforeYes) {
    const r = buildBeforeYes(i.beforeYes.answers, i.gender)
    lines.push({
      text: r
        ? `You went through the eleven conversations before you said yes — ${words(r.counts.agree)} of them already talked through and agreed.`
        : 'You went through the eleven conversations before you said yes.',
      at: day(i.beforeYes.at),
    })
  }

  if (i.couple) {
    lines.push({
      text: i.couple.answered
        ? 'You asked him to answer the same eleven on his own phone, and he did.'
        : 'You asked him to answer the same eleven on his own phone.',
      at: day(i.couple.at),
    })
  }

  if (i.vouch) {
    // relationshipLabel already reads from her side — "your father".
    const who = relationshipLabel(i.vouch.relationship)
    lines.push({
      text: `${who.charAt(0).toUpperCase()}${who.slice(1)}, ${i.vouch.firstName}, vouched for you.`,
      at: day(i.vouch.at),
    })
  }

  const conversations = conversationsHad(i.followups, i.gender)
  for (const c of conversations) {
    lines.push({ text: `You had the conversation about ${c.label}.`, at: c.at })
  }

  lines.sort((a, b) => (a.at ?? '9999').localeCompare(b.at ?? '9999'))

  const began = lines.find((l) => l.at)?.at
  return {
    began,
    span: began ? spanOf(began, today) : undefined,
    lines,
    conversations: conversations.map((c) => c.label),
  }
}

/**
 * The sentence at the top of the record. It names the only number this product
 * has ever thought worth counting, and it is a count of things she said out
 * loud to another person — never of days, sessions or taps.
 */
export function endingHeadline(ending: Ending): string {
  const n = ending.conversations.length
  if (n === 0) return 'You chose someone, and you did it in the open.'
  if (n === 1) return 'You had one conversation you were not going to have.'
  return `You had ${words(n)} conversations you were not going to have.`
}
