/**
 * Why the door was hard to walk through.
 *
 * The product records every yes — a map built, a read taken, a conversation
 * had, a family's vouch, a place on the door — and until now no no. When
 * someone reached the door and did not walk through it, the product learned
 * nothing, and "why people hesitate to join" was the thing we knew least about
 * (docs/GAPS.md). PRODUCT §7 already says a considered no is progress and is
 * recorded. This applies that to the door: one tap, one word from a list we
 * wrote, about the door and not about her.
 *
 * Six reasons. Each is a fear the strategy has always asserted and never
 * measured — exposure, family, an empty room, readiness, contact — and the
 * last is the test of the list itself: if "something else" leads, the five
 * are the wrong five.
 *
 * Must match netlify/shared/vocab.ts HESITATIONS.
 */
export type Hesitation = 'contact' | 'seen' | 'family' | 'empty' | 'ready' | 'other'

export interface HesitationOption {
  id: Hesitation
  label: string
}

export const HESITATION_IDS: Hesitation[] = ['contact', 'seen', 'family', 'empty', 'ready', 'other']

export const hesitationOptions: HesitationOption[] = [
  { id: 'contact', label: 'I’d rather not leave an email or phone' },
  { id: 'seen', label: 'Someone I know might see me here' },
  { id: 'family', label: 'My family doesn’t know I’m looking' },
  { id: 'empty', label: 'I want to see who’s here first' },
  { id: 'ready', label: 'I’m not sure I’m ready' },
  { id: 'other', label: 'Something else' },
]
