import type {
  Answers,
  BeforeYesRecord,
  CoupleState,
  FollowUp,
  Gender,
  MapSnapshot,
  ReadRecord,
} from '../types'
import { buildBeforeYes } from './beforeYes'
import { conversationsHad } from './followup'
import { speak } from '../data/read'
import { toolLink } from './links'

/**
 * How you chose.
 *
 * Someone leaving because she has decided is this product done right, whichever
 * way she decided; this screen is the married half of that, and Ended is the
 * other (docs/DECISIONS.md Part 14). Every other app in this category treats
 * leaving as churn and designs against it; here it is the goal, and until now
 * it produced nothing at all —
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
  read: ReadRecord | null
  beforeYes: BeforeYesRecord | null
  couple: CoupleState | null
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

  // The read — what the other person had shown, before anyone was sure. Said
  // from whichever side is reading: a married man used to read "what he had
  // done" about himself (docs/DESIGN.md).
  if (i.read) {
    lines.push({
      text: speak(i.gender)('You took a read on what {he} had done, rather than what {he} said.'),
      at: day(i.read.at),
    })
  }

  // The eleven — the conversations to have before the families do.
  if (i.beforeYes) {
    const r = buildBeforeYes(i.beforeYes.answers, i.gender, i.beforeYes.lines)
    // What she is credited with is the conversations had, whatever they came
    // to. It used to count only the agreed ones, as if a difference talked
    // through, worked out or named as a line were not the thing this was for
    // (docs/DECISIONS.md Part 8).
    const had = r ? r.counts.agree + r.counts.settled + r.counts.differ + r.lines.length : 0
    lines.push({
      text: r
        ? `You went through the eleven conversations before you said yes — ${words(had)} of them already talked about between you.`
        : 'You went through the eleven conversations before you said yes.',
      at: day(i.beforeYes.at),
    })
  }

  if (i.couple) {
    lines.push({
      text: speak(i.gender)(
        i.couple.answered
          ? 'You asked {him} to answer the same eleven on {his} own phone, and {he} did.'
          : 'You asked {him} to answer the same eleven on {his} own phone.',
      ),
      at: day(i.couple.at),
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

/** Something she can send: the words, and the link they carry. */
export interface Share {
  text: string
  url: string
}

/**
 * The one thing only a married person can send: the eleven, for the friend
 * who is already talking to someone. "Before we said yes, we had these
 * conversations" is the most credible thing anyone can say about marrying
 * well, and only she can say it. It carries `via=married` and nothing else.
 *
 * It says only what is true of her: it claims the eleven only when she did
 * them (`did.eleven`: her own sheet, or the two-sided one she started). A
 * false sentence in a community this tight would poison the one referral
 * the ending exists for.
 */
export interface MarriedDid {
  /** She opened the eleven herself, or sent him the two-sided one. */
  eleven: boolean
}

export function marriedShare(advice?: string, did: MarriedDid = { eleven: false }): Share {
  const line = advice?.trim()
  const lead = did.eleven
    ? 'Before we said yes, we went through eleven conversations — where we’d live, money home, all of it. I wish someone had handed me that list earlier.'
    : 'There are eleven conversations to have before the families do — where you’d live, money home, a second wife. I wish someone had handed me that list before we said yes.'
  return {
    text: [lead, line ? `\n${line}` : '', '\nIt is free, and there is no account.'].join(''),
    url: toolLink('before-you-say-yes', 'married'),
  }
}
