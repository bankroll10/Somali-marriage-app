import type { Gender } from '../types'
import { allQuestions } from './intake'
import { DIMENSION_LABEL, speak, type ReadDimension } from './read'
import { beforeYesTopics } from './beforeYes'

/**
 * How it ended.
 *
 * When she moves from *getting to know someone* or *deciding* back to
 * *preparing*, a courtship has ended, and until now the product recorded
 * nothing — the single most informative thing a person here can report, lost
 * at the moment it was made. Nearly every courtship today happens off this
 * platform, so this is the one place the product can learn why Somali
 * courtships end without a marketplace of its own.
 *
 * Every reason is an id from a closed list. Three of them take a second id —
 * which non-negotiable, which of the eleven, which ground of the read — and
 * those are the ids the product already owns. Nothing here can hold a name, a
 * number, or a sentence about him. Skipping is the first button.
 */

export type EndedReason =
  | 'non-negotiable'
  | 'eleven'
  | 'his-read'
  | 'my-family'
  | 'his-family'
  | 'timeline'
  | 'distance'
  | 'he-stopped'
  | 'i-stopped'
  | 'other'

export interface EndedOption {
  id: EndedReason
  label: string
  /** The second row of chips this reason opens, if any. */
  which?: { id: string; label: string }[]
}

/** Must match netlify/shared/vocab.ts ENDED_REASONS. */
export const ENDED_REASON_IDS: EndedReason[] = [
  'non-negotiable',
  'eleven',
  'his-read',
  'my-family',
  'his-family',
  'timeline',
  'distance',
  'he-stopped',
  'i-stopped',
  'other',
]

/** Her non-negotiables, from the intake question itself, so the two cannot drift. */
export function dealbreakerOptions(): { id: string; label: string }[] {
  const q = allQuestions.find((q) => q.id === 'dealbreakers')
  return (q?.options ?? []).map((o) => ({ id: o.id, label: o.label }))
}

export function endedReasons(memberGender: Gender = 'woman'): EndedOption[] {
  const fix = speak(memberGender)
  const readDims = (Object.keys(DIMENSION_LABEL) as ReadDimension[]).map((id) => ({ id, label: fix(DIMENSION_LABEL[id]) }))
  return [
    { id: 'non-negotiable', label: 'One of my non-negotiables', which: dealbreakerOptions() },
    { id: 'eleven', label: 'One of the eleven conversations', which: beforeYesTopics(memberGender).map((t) => ({ id: t.id, label: t.label })) },
    { id: 'his-read', label: fix('Something {he} did, or didn’t'), which: readDims },
    { id: 'my-family', label: 'My family said no' },
    { id: 'his-family', label: fix('{His} family said no') },
    { id: 'timeline', label: 'We wanted different timing' },
    { id: 'distance', label: 'Distance' },
    { id: 'he-stopped', label: fix('{He} stopped') },
    { id: 'i-stopped', label: 'I stopped' },
    { id: 'other', label: 'Something I’d rather not say' },
  ]
}

/** Which reasons take a second id, and from which list. Must match vocab.ts ENDED_WHICH. */
export const REASONS_WITH_WHICH: EndedReason[] = ['non-negotiable', 'eleven', 'his-read']
