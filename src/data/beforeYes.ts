import type { Gender } from '../types'
import { speak, type ReadOption, type Script } from './read'

/**
 * Before you say yes.
 *
 * The Need audit named it: "we discovered too late that…". The bet is that
 * what comes between Somali couples is not what the apps ask about (class F,
 * docs/RESEARCH.md, L5). It is where you'll live and whether his mother is in the house,
 * money sent home, whether she keeps working, what "practising" means on a
 * Tuesday, qabiil at somebody's table, a second wife. They get found out after
 * the families are involved, when saying no has become expensive.
 *
 * This is the list, asked early, about the real man she is already talking to.
 * It does not score him. It does not score the relationship. It records, for
 * each conversation, whether the two of them have had it — and then hands her
 * the words to open the one that matters most this week.
 *
 * Same rules as the Read. Every question is about what has been SAID between
 * them, never about how she feels. We never state a position of our own on any
 * topic — qabiil and a second wife included. And every path ends in words.
 */

export type YesState = 'agree' | 'settled' | 'differ' | 'not-talked' | 'unknown'

/**
 * The states, shared by every topic. None of them is scored: `weight` is null
 * on every one. They used to read agree 1, differ 0.1 — below "we haven't
 * talked" at 0.35 — which said in data what no screen may say, that a
 * difference talked through is worse than silence (docs/DECISIONS.md Part 8).
 * The only ordering is STATE_URGENCY in src/lib/beforeYes.ts, and it asks
 * which conversation needs opening, not which answer is better.
 *
 * `settled` is a difference the two of them have talked through and arranged:
 * they see it differently and have worked out how to live with it. It is not
 * agreement, and it is not unfinished. Without it, "We don't agree" was the
 * only true answer for a couple who had budgeted around money sent home, and
 * the product sent them back to it ahead of every conversation they had never
 * had (Part 7 §5).
 */
export const STATES: (ReadOption & { id: YesState })[] = [
  { id: 'agree', label: 'We’ve talked, and we agree', weight: null, note: 'you have talked about {topic}, and you agree' },
  {
    id: 'settled',
    label: 'We see it differently, and we’ve worked out how',
    weight: null,
    note: 'you see {topic} differently, and have worked out how to live with it',
  },
  {
    id: 'differ',
    label: 'We’ve talked, and we don’t agree',
    weight: null,
    note: 'you have talked about {topic}, and it is still open between you',
  },
  { id: 'not-talked', label: 'We haven’t talked about it', weight: null, note: 'you have not talked about {topic}' },
  {
    id: 'unknown',
    label: 'I don’t know my own answer yet',
    hint: 'Honest, and worth sitting with.',
    weight: null,
    note: 'you don’t yet know your own answer on {topic}',
  },
]

/**
 * What the question screen offers first: four answers. "We don't agree" opens
 * a second question — where that leaves it — rather than ending the
 * conversation there, so a difference is never recorded without her saying
 * what kind it is.
 */
export const FIRST_CHOICES = STATES.filter((s) => s.id !== 'settled')

/** Where a difference stands, once she has said there is one. */
export const DIFFER_OUTCOMES: { id: 'differ' | 'settled'; label: string; hint?: string }[] = [
  { id: 'differ', label: 'It’s still open' },
  { id: 'settled', label: 'We’ve worked out how to live with it', hint: 'You see it differently, and you have an arrangement you both keep.' },
]

/**
 * A line: a difference that is non-negotiable for whoever is answering —
 * her on her own sheet, him answering her link. Each is kept on that
 * person's phone (docs/DECISIONS.md Part 8).
 *
 * `line` is not a state. While she answers, and in a half-finished run, a
 * topic may hold 'line'; the moment the sheet is saved it becomes `differ`
 * in `answers` and the topic id in `lines` (sheetOf). So nothing that sends
 * her answers anywhere — the two-sided link, a kept map — can carry it: the
 * couple sheet says only that the two of them don't agree, and whether it is
 * a line is hers to say to him in words.
 */
export const LINE = 'line'
export const LINE_OUTCOME = {
  id: LINE,
  label: 'It’s a line for me',
  hint: 'Not something to meet in the middle on. Kept off anything you send.',
}
export const SHEET_OUTCOMES = [...DIFFER_OUTCOMES, LINE_OUTCOME]

/** True for the answers that say the two of them found a difference. */
export function isDifference(state: string | undefined): boolean {
  return state === 'differ' || state === 'settled' || state === LINE
}

/** Her answers while she is still answering, split into what is saved and sent, and her lines. */
export function sheetOf(picked: Record<string, string>): { answers: Record<string, string>; lines: string[] } {
  const answers: Record<string, string> = {}
  const lines: string[] = []
  for (const [id, state] of Object.entries(picked)) {
    if (state === LINE) {
      answers[id] = 'differ'
      lines.push(id)
    } else answers[id] = state
  }
  return { answers, lines }
}

/** The other way: a saved sheet, back as she answered it. */
export function pickedOf(record: { answers: Record<string, string>; lines?: string[] }): Record<string, string> {
  const picked = { ...record.answers }
  for (const id of record.lines ?? []) if (picked[id] === 'differ') picked[id] = LINE
  return picked
}

// The words themselves live in eleven.ts, import-free, so the build can write
// the printable guide from them. Everything the app reads is re-exported here.
export { ALL_AGREED, ALL_HAD, OWN_ANSWER_FIRST, SAY_THE_LINE, TOPICS, WORK_IT_OUT } from './eleven'
export type { ElevenScript, Topic, YourSide } from './eleven'
import { ALL_HAD, OWN_ANSWER_FIRST, SAY_THE_LINE, TOPICS, WORK_IT_OUT, type ElevenScript, type Topic } from './eleven'

function resolve(topic: Topic, fix: (t: string) => string, memberGender: Gender): Topic {
  // A man's variant, where one exists, replaces the woman's before the
  // pronouns are resolved — merged field by field, the way read.ts merges its
  // own, so a variant never adds or removes a topic (src/data/eleven.ts).
  const v = memberGender === 'man' ? topic.man : undefined
  const script = { ...topic.script, ...v?.script }
  const { man: _man, ...rest } = topic
  return {
    ...rest,
    label: fix(v?.label ?? topic.label),
    prompt: fix(v?.prompt ?? topic.prompt),
    why: fix(v?.why ?? topic.why),
    script: { why: fix(script.why), words: fix(script.words), tells: fix(script.tells) },
  }
}

/** The topics, with pronouns resolved for whoever is reading. */
export function beforeYesTopics(memberGender: Gender = 'woman'): Topic[] {
  const fix = speak(memberGender)
  return TOPICS.map((t) => resolve(t, fix, memberGender))
}

function resolved(script: ElevenScript, memberGender: Gender): Script {
  const fix = speak(memberGender)
  return { why: fix(script.why), words: fix(script.words), tells: fix(script.tells) }
}

export function ownAnswerFirst(memberGender: Gender = 'woman'): Script {
  return resolved(OWN_ANSWER_FIRST, memberGender)
}

export function workItOut(memberGender: Gender = 'woman'): Script {
  return resolved(WORK_IT_OUT, memberGender)
}

export function allHad(memberGender: Gender = 'woman'): Script {
  return resolved(ALL_HAD, memberGender)
}

export function sayTheLine(memberGender: Gender = 'woman'): Script {
  return resolved(SAY_THE_LINE, memberGender)
}

/**
 * The words for one topic on her own sheet, by where it stands. The result
 * and the follow-up three days later both read this, so the words she is
 * shown again are the words she was shown (src/lib/followup.ts).
 *
 * Not for the two-sided sheet: there a difference may be one only one of
 * them knows about, and the topic's own words, which open it, are right.
 */
export function scriptForState(topic: Topic, state: string | undefined, memberGender: Gender = 'woman'): Script {
  if (state === 'unknown') return ownAnswerFirst(memberGender)
  if (state === 'differ') return workItOut(memberGender)
  return topic.script
}

export const BEFORE_YES_COUNT = TOPICS.length
