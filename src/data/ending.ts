import type { Gender } from '../types'
import { speak } from './read'

/**
 * The ending.
 *
 * Four questions, asked once, on the way out. They exist for two reasons and
 * the order matters: first, they are the last honest reflection this product
 * offers — a person who has just married has never once been asked what
 * actually decided it, and the question is worth answering for her own sake.
 * Second, they are the only outcome data this company will ever have — under
 * "Count me", the three closed answers travel with her rungs (src/lib/facts.ts)
 * — and the only way to learn which of these instruments actually moves a
 * marriage. The free-text line below never travels.
 *
 * Every one is optional and every one can be skipped in a tap. Nothing here is
 * required to finish, nothing is required to keep her record, and nothing is
 * required to leave. An exit that charges a toll in answers is not an exit.
 */

export interface EndingOption {
  id: string
  label: string
  hint?: string
}

export interface EndingQuestion {
  id: 'who' | 'mattered' | 'used'
  prompt: string
  helper?: string
  multi?: boolean
  options: EndingOption[]
}

/**
 * The question this company cannot answer any other way: did the marketplace
 * cause this marriage, or did the instruments help a relationship that already
 * existed? Everything about where to spend the next year of work turns on it.
 */
const WHO: EndingQuestion = {
  id: 'who',
  prompt: 'Who did you marry?',
  helper: 'The one thing we cannot know without asking.',
  options: [
    { id: 'brought', label: 'Someone I was already talking to when I came here' },
    { id: 'family', label: 'Someone my family or community brought to me' },
    { id: 'here', label: 'Someone Niyyah introduced me to' },
    { id: 'elsewhere', label: 'Someone I met another way' },
  ],
}

const MATTERED: EndingQuestion = {
  id: 'mattered',
 prompt: 'What decided it?',
  helper: 'Looking back — the thing that made the difference.',
  options: [
 { id: 'shown', label: 'Seeing what {he} had done, not what {he} said' },
    { id: 'eleven', label: 'One of the eleven conversations' },
    { id: 'families', label: 'The families meeting properly' },
    { id: 'myself', label: 'Getting clear about myself first' },
    { id: 'other', label: 'Something else entirely' },
  ],
}

const USED: EndingQuestion = {
  id: 'used',
 prompt: 'What here did you use?',
  helper: 'Tap everything that was real. Leave the rest.',
  multi: true,
  options: [
    { id: 'read', label: 'The read on {him}' },
    { id: 'eleven', label: 'Before you say yes' },
    { id: 'couple', label: 'Asking {him} to answer the eleven too' },
    { id: 'families', label: 'The words for my family' },
    { id: 'vouch', label: 'My family vouching for me' },
    { id: 'guide', label: 'The guide' },
    { id: 'map', label: 'My map' },
  ],
}

/** The questions, pronouns resolved for who she married. */
export function endingQuestions(memberGender: Gender = 'woman'): EndingQuestion[] {
  const fix = speak(memberGender)
  return [WHO, MATTERED, USED].map((q) => ({
    ...q,
    options: q.options.map((o) => ({ ...o, label: fix(o.label) })),
  }))
}

/**
 * The last free-text field in the product, and the only one whose answer is
 * meant for a stranger. A married woman can say this publicly in a way she
 * never could while she was looking — that is the whole asymmetry the ending
 * is built on.
 */
export const ADVICE_PROMPT = 'One line for whoever is where you were.'
export const ADVICE_PLACEHOLDER = 'The thing you wish someone had told you…'
