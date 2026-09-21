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
import { speak } from '../data/read'
import { countryFor, getScene } from '../data/scenes'
import { getCountry } from '../data/countries'
import { toolLink } from './links'
import { opensWhen } from './cohort'

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

  // The read — what the other person had shown, before anyone was sure. Said
  // from whichever side is reading: a married man used to read "what he had
  // done" about himself (docs/VOICE.md).
  if (i.read) {
    lines.push({
      text: speak(i.gender)('You took a read on what {he} had done, rather than what {he} said.'),
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
      text: speak(i.gender)(
        i.couple.answered
          ? 'You asked {him} to answer the same eleven on {his} own phone, and {he} did.'
          : 'You asked {him} to answer the same eleven on {his} own phone.',
      ),
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

/** Something she can send: the words, and the link they carry. */
export interface Share {
  text: string
  url: string
}

/**
 * The two things only a married person can send.
 *
 * Everything else this product hands out is careful never to reveal that the
 * sender is looking, because in this community that costs her something. The
 * moment she is married that inverts entirely — and it inverts twice.
 *
 * The first share is the eleven, for the friend who is already talking to
 * someone: "before we said yes, we had these conversations" is the most
 * credible thing anyone can say about marrying well, and only she can say it.
 *
 * The second is the door, for the friend who is looking — and it is the one
 * that turns the flywheel on the side that needs it (docs/FLYWHEEL.md). The
 * marketplace's scarce side is serious, unattached men, and every other loop
 * in the product reaches a man already attached to the woman who sent it. A
 * married couple is the one pair who can reach an unattached person through
 * the spouse's side without anyone admitting they are looking. Until this
 * existed the ending sent women an instrument for people already in a
 * courtship, and nothing reached the door.
 *
 * Both carry `via=married` and nothing else — the kind of link, never who sent
 * it (docs/STRATEGY.md). The pool is named the way the door names it. Pure, so
 * a test can hold the line that nothing here carries a name or a code.
 *
 * And both say only what is true of her. The record above refuses to claim
 * anything she did not do; until docs/BOARD.md the share did not — every woman
 * who reached the ending was handed "we went through eleven conversations"
 * whether or not she had opened the eleven, and "we married this year" whenever
 * she married. A false sentence in a community this tight is the one thing
 * that would poison the referral the whole ending exists for. So the eleven
 * share claims the eleven only when she did them (`did.eleven`: her own sheet,
 * or the two-sided one she started), and the door share names no year.
 */
export interface MarriedDid {
  /** She opened the eleven herself, or sent him the two-sided one. */
  eleven: boolean
}

export function marriedShares(
  identity: { scene?: string; country?: string },
  advice?: string,
  did: MarriedDid = { eleven: false },
): { eleven: Share; door: Share } {
  const scene = getScene(identity.scene)
  const within = getCountry(countryFor(identity))?.within
  const pool = !scene ? 'your city' : scene.id === 'other' ? (within ?? 'your country') : scene.label
  const line = advice?.trim()
  const lead = did.eleven
    ? 'Before we said yes, we went through eleven conversations — where we’d live, money home, all of it. I wish someone had handed me that list earlier.'
    : 'There are eleven conversations most of us have too late — where you’d live, money home, a second wife. I wish someone had handed me that list before we said yes.'
  return {
    eleven: {
      text: [lead, line ? `\n${line}` : '', '\nIt is free, and there is no account.'].join(''),
      url: toolLink('before-you-say-yes', 'married'),
    },
    door: {
      text: `We married, alhamdulillah. Niyyah is being built for us, one city at a time. ${opensWhen(pool)} If you’re looking, this is where it stands. No photos, no account: three answers, your age, and a way to reach you.`,
      url: toolLink('door', 'married'),
    },
  }
}
