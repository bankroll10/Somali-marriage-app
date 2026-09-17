import type { Gender } from '../types'
import { speak, type ReadOption, type Script } from './read'

/**
 * Before you say yes.
 *
 * The Need audit named it: "we discovered too late that…". The things that
 * actually break Somali marriages are almost never the things the apps ask
 * about. They are where you'll live and whether his mother is in the house,
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

export type YesState = 'agree' | 'differ' | 'not-talked' | 'unknown'

/** The four states, shared by every topic. Weight is only used for ordering. */
export const STATES: (ReadOption & { id: YesState })[] = [
  { id: 'agree', label: 'We’ve talked, and we agree', weight: 1, note: 'you have talked about {topic}, and you agree' },
  {
    id: 'differ',
    label: 'We’ve talked, and we don’t agree',
    weight: 0.1,
    note: 'you have talked about {topic}, and you don’t agree',
  },
  { id: 'not-talked', label: 'We haven’t talked about it', weight: 0.35, note: 'you have not talked about {topic}' },
  {
    id: 'unknown',
    label: 'I don’t know my own answer yet',
    hint: 'Honest, and more common than the other three.',
    weight: 0.25,
    note: 'you don’t yet know your own answer on {topic}',
  },
]

// The words themselves live in eleven.ts, import-free, so the build can write
// the printable guide from them. Everything the app reads is re-exported here.
export { ALL_AGREED, OWN_ANSWER_FIRST, TOPICS } from './eleven'
export type { ElevenScript, Topic, YourSide } from './eleven'
import { OWN_ANSWER_FIRST, TOPICS, type Topic } from './eleven'

function resolve(topic: Topic, fix: (t: string) => string): Topic {
  return {
    ...topic,
    label: fix(topic.label),
    prompt: fix(topic.prompt),
    why: fix(topic.why),
    script: { why: fix(topic.script.why), words: fix(topic.script.words), tells: fix(topic.script.tells) },
  }
}

/** The topics, with pronouns resolved for who she is reading. */
export function beforeYesTopics(memberGender: Gender = 'woman'): Topic[] {
  const fix = speak(memberGender)
  return TOPICS.map((t) => resolve(t, fix))
}

export function ownAnswerFirst(memberGender: Gender = 'woman'): Script {
  const fix = speak(memberGender)
  return { why: fix(OWN_ANSWER_FIRST.why), words: fix(OWN_ANSWER_FIRST.words), tells: fix(OWN_ANSWER_FIRST.tells) }
}

export const BEFORE_YES_COUNT = TOPICS.length
