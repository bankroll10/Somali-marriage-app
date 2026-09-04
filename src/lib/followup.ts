import type { FollowUp, Gender, ReadRecord } from '../types'
import { beforeYesTopics, type Topic } from '../data/beforeYes'
import { SCRIPTS, speak, type ReadDimension, type Script } from '../data/read'
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
 * "not yet" is a real answer that closes nothing.
 *
 * Pure — the followups and the day are passed in.
 */

/** Long enough that a real conversation could have happened in between. */
export const MIN_AGE_DAYS = 3
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
export function openFollowUp(followups: FollowUp[], gender: Gender = 'woman', now = Date.now()): FollowUpAsk | null {
  const ripe = followups
    .filter((f) => !f.outcome && now - Date.parse(f.at) >= MIN_AGE_DAYS * DAY_MS)
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
  for (const f of ripe) {
    const ask = describe(f, gender)
    if (ask) return ask
  }
  return null
}

function describe(f: FollowUp, gender: Gender): FollowUpAsk | null {
  const say = speak(gender)
  if (f.source === 'guide') {
    // The guide's words live only in the reply she was given, so they travel
    // with the record. A commitment with no words is not one; skip it.
    const words = f.words?.trim()
    if (!words) return null
    return {
      followUp: f,
      question: say('Last time, the guide gave you words to say to {him}. Did you say them?'),
      label: 'what the guide gave me the words for',
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
  if (f.source === 'read') {
    if (!READ_DIMENSIONS.has(f.topic)) return null
    const script = SCRIPTS[f.topic as ReadDimension | 'early']
    return {
      followUp: f,
      question: say('Last time, this was the question to put to {him}. Have you asked it?'),
      label: 'the question you were going to ask',
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
    script: topic.script,
    writesBack: true,
    travel: f.source === 'couple' ? 'couple' : 'eleven',
  }
}

/** What "we talked" writes back into her eleven, so the sheet stays true. */
export function writeBackState(agreed: boolean): 'agree' | 'differ' {
  return agreed ? 'agree' : 'differ'
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

/** Record how it went, and stop asking. */
export function resolveFollowUp(
  followups: FollowUp[],
  id: string,
  outcome: NonNullable<FollowUp['outcome']>,
  at = new Date().toISOString(),
): FollowUp[] {
  return followups.map((f) => (f.id === id ? { ...f, outcome, outcomeAt: at } : f))
}
