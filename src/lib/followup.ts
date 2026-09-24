import type { FollowUp, Gender, ReadRecord } from '../types'
import { beforeYesTopics, scriptForState, type Topic } from '../data/beforeYes'
import { scriptFor, speak, type ReadDimension, type Script } from '../data/read'
import { familyScript } from '../data/families'
import type { WordsSource } from './words'

/**
 * The second half of the help.
 *
 * Every instrument here has been single-serving. She takes a read once, works
 * through the eleven once, copies a script once — and then the product forgets,
 * while the situation it was built for goes on for months. We hand a woman the
 * one question to ask him and never once ask whether she asked it.
 *
 * That is the largest thing we have been leaving on the table, and it costs
 * three ways: she gets a sentence instead of a companion, we never learn which
 * questions actually work, and the only outcome worth measuring — did anyone
 * have a conversation they were not going to have — is invisible.
 *
 * So the product writes down what it told her to do, waits, and asks. Nothing
 * here is a streak, a reminder, or a nudge to come back: it is asked once per
 * thing, only after enough days that the answer could have changed, and
 * "not yet" is a real answer that closes nothing — it is asked about once
 * more, a week later, unless she puts it away.
 *
 * Pure — the followups and the day are passed in.
 */

/** Long enough that a real conversation could have happened in between. */
export const MIN_AGE_DAYS = 3
/**
 * "Not yet" is asked about once more, this long after she said it. Once — a
 * second "not yet" is an answer, and asking a third time would be a nag.
 */
export const NOT_YET_AGAIN_DAYS = 7
/** Long enough that what he has shown her could have changed. */
export const READ_STALE_DAYS = 30
const DAY_MS = 24 * 60 * 60 * 1000

/**
 * A read is about behaviour over time. A month after she took it — or a month
 * after she last said it still stands — Home asks once whether anything has
 * changed. Never sooner: a read re-taken every week would be a mood diary
 * about him, and this product does not keep one of those about anyone.
 */
export function readIsStale(read: ReadRecord, now = Date.now()): boolean {
  const since = Math.max(Date.parse(read.at), read.checkedAt ? Date.parse(read.checkedAt) : 0)
  return Number.isFinite(since) && now - since >= READ_STALE_DAYS * DAY_MS
}

export interface FollowUpAsk {
  followUp: FollowUp
  /** The question, in her voice. Never a nudge, never a count. */
  question: string
  /** What the conversation was, as she would name it. */
  label: string
  /** The words again, for "not yet". */
  script: Script
  /** True when saying "we talked" can be written back into the eleven. */
  writesBack: boolean
  /** Where the words came from, so they can be sent on to someone who needs them. */
  travel: WordsSource
}

function topicFor(id: string, gender: Gender): Topic | undefined {
  return beforeYesTopics(gender).find((t) => t.id === id)
}

const READ_DIMENSIONS = new Set<string>(['public', 'intent', 'consistency', 'pressure', 'family', 'early'])

/**
 * The one open thing to ask about — or null, which is the normal answer.
 *
 * One at a time, oldest question last: a person who has been given three
 * things to do is being given none.
 */
export function openFollowUp(
  followups: FollowUp[],
  gender: Gender = 'woman',
  now = Date.now(),
  /** Her eleven as it stands now, so the words shown again are the words the result gave. */
  sheet?: Record<string, string>,
): FollowUpAsk | null {
  const ripe = followups
    .filter((f) => isOpen(f, now))
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
  for (const f of ripe) {
    const ask = describe(f, gender, sheet)
    if (ask) return ask
  }
  return null
}

/**
 * Whether a follow-up is waiting to be asked. Unanswered, after MIN_AGE_DAYS;
 * or answered "not yet" once, a week after she said it. The docblock above
 * promised "not yet" closes nothing, and for a year it closed the thing for
 * good — the words were shown once more and never asked about again.
 * `settled` marks one that is not asked again: put away, or asked twice.
 */
function isOpen(f: FollowUp, now: number): boolean {
  if (!f.outcome) return now - Date.parse(f.at) >= MIN_AGE_DAYS * DAY_MS
  if (f.outcome !== 'not-yet' || f.settled) return false
  const said = Date.parse(f.outcomeAt ?? f.at)
  return Number.isFinite(said) && now - said >= NOT_YET_AGAIN_DAYS * DAY_MS
}

/**
 * The conversation, as a phrase that reads after "about" — in her voice to the
 * guide ("I was going to talk to them about …") and in the Ending's record
 * ("You had the conversation about …"). The read used to be "the question you
 * were going to ask", which read as broken English in both.
 */
const READ_TOPIC: Record<ReadDimension | 'early', string> = {
  public: 'being known in {his} life',
  intent: 'marriage, and when',
  family: 'meeting the families',
  consistency: 'whether words and actions match',
  pressure: 'how {he} handles hard things',
  early: 'what each of you is looking for',
}

function describe(f: FollowUp, gender: Gender, sheet?: Record<string, string>): FollowUpAsk | null {
  const say = speak(gender)
  if (f.source === 'guide') {
    // The guide's words live only in the reply she was given, so they travel
    // with the record. A commitment with no words is not one; skip it.
    const words = f.words?.trim()
    if (!words) return null
    return {
      followUp: f,
      question: say('Last time, the guide gave you words to say to {him}. Did you say them?'),
      label: 'the words the guide gave you',
      script: {
        why: 'These are the words you said you would say.',
        words,
        tells: say(
          'Whatever came back is the answer — not what you hoped, not what you feared. If it was not what you expected, bring it back to the guide and read it together.',
        ),
      },
      writesBack: false,
      travel: 'guide',
    }
  }
  if (f.source === 'family') {
    // The words for hooyo, the wali, his people. Noted when she took them,
    // not when she opened them — browsing is not a commitment.
    const s = familyScript(f.topic, gender)
    if (!s) return null
    const label = s.title.charAt(0).toLowerCase() + s.title.slice(1)
    return {
      followUp: f,
      question: `Last time, you took the words for ${label}. Did you have that conversation?`,
      label,
      script: s.script,
      writesBack: false,
      travel: 'family',
    }
  }
  if (f.source === 'read') {
    if (!READ_DIMENSIONS.has(f.topic)) return null
    // His side's words when he is the reader: the follow-up used to look the
    // script up in her table, so three days later a man was asked whether he
    // had put "How would you want to approach my family?" to a woman.
    const key = f.topic as ReadDimension | 'early'
    const script = scriptFor(key, gender)
    return {
      followUp: f,
      question: say('Last time, this was the question to put to {him}. Have you asked it?'),
      label: say(READ_TOPIC[key]),
      script,
      writesBack: false,
      travel: 'read',
    }
  }
  const topic = topicFor(f.topic, gender)
  if (!topic) return null
  const label = topic.label.charAt(0).toLowerCase() + topic.label.slice(1)
  return {
    followUp: f,
    question: say(`Last time, the one to open was ${label}. Have the two of you had it?`),
    label,
    // Her own sheet chooses its words by where the topic stands — a difference
    // still open gets the words for after a difference, not the opening words
    // again (src/data/beforeYes.ts scriptForState). The two-sided sheet keeps
    // the opening words: one of them may not know there is a difference.
    script: f.source === 'beforeYes' ? scriptForState(topic, sheet?.[f.topic], gender) : topic.script,
    writesBack: true,
    travel: f.source === 'couple' ? 'couple' : 'eleven',
  }
}

/**
 * The conversations she confirmed she actually had, oldest first.
 *
 * This is the only record in the product of things that happened in her life
 * rather than on her screen, and at the end it is the whole story: not what
 * she read, but what she said out loud to someone who could answer back.
 */
export function conversationsHad(
  followups: FollowUp[],
  gender: Gender = 'woman',
): { label: string; at: string }[] {
  return followups
    .filter((f) => f.outcome === 'asked')
    .sort((a, b) => Date.parse(a.outcomeAt ?? a.at) - Date.parse(b.outcomeAt ?? b.at))
    .map((f) => {
      const ask = describe(f, gender)
      return ask ? { label: ask.label, at: (f.outcomeAt ?? f.at).slice(0, 10) } : null
    })
    .filter((x): x is { label: string; at: string } => x !== null)
}

/**
 * Where a conversation landed, as she says it. "We don't agree" used to be the
 * only answer after "we talked" that wasn't agreement — so a couple who had
 * worked a difference out were recorded as open, and a line was recorded as
 * something to reopen (docs/DECISIONS.md Part 8). Not agreeing is an answer,
 * and it comes in three kinds.
 */
export type Landed = 'agree' | 'settled' | 'differ' | 'line'

/** What "we talked" writes back into her eleven, so the sheet stays true. A line is `differ`, and hers. */
export function writeBackState(landed: Landed): { state: 'agree' | 'settled' | 'differ'; line: boolean } {
  return landed === 'line' ? { state: 'differ', line: true } : { state: landed, line: false }
}

/** She actually had one of them. The one outcome this product exists to cause. */
export function followedThrough(followups: FollowUp[]): boolean {
  return followups.some((f) => f.outcome === 'asked')
}

/**
 * Write down what we just told her to do. Same source and topic twice is one
 * open question, not two — re-reading the same result must not stack up asks.
 */
export function noteFollowUp(
  followups: FollowUp[],
  source: FollowUp['source'],
  topic: string,
  at = new Date().toISOString(),
  words?: string,
): FollowUp[] {
  if (followups.some((f) => f.source === source && f.topic === topic && !f.outcome)) return followups
  const entry: FollowUp = { id: `${source}:${topic}:${at}`, source, topic, at, ...(words ? { words } : {}) }
  return [...followups, entry].slice(-20)
}

/**
 * Record how it went. "Not yet" is asked about once more unless she put it
 * away; anything said the second time it is asked settles it.
 */
export function resolveFollowUp(
  followups: FollowUp[],
  id: string,
  outcome: NonNullable<FollowUp['outcome']>,
  at = new Date().toISOString(),
  putAway = false,
): FollowUp[] {
  return followups.map((f) => {
    if (f.id !== id) return f
    const settled = outcome === 'not-yet' && (putAway || f.outcome === 'not-yet')
    const { settled: _was, ...rest } = f
    return { ...rest, outcome, outcomeAt: at, ...(settled ? { settled: true } : {}) }
  })
}
