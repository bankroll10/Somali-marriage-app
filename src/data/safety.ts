/**
 * Why a member is reporting a concern about whoever is on the other side of
 * her eleven — the six reasons this product actually acts on, and the one
 * carve-out in docs/LEARNING.md that lets a report say a line more than that.
 *
 * Must match netlify/shared/vocab.ts SAFETY_REASONS.
 */
export interface SafetyReason {
  id: string
  label: string
}

export const SAFETY_REASONS: SafetyReason[] = [
  { id: 'harassment', label: 'Kept contacting me after I said to stop' },
  { id: 'threats', label: 'Threatened me, or someone I know' },
  { id: 'sexual', label: 'Sent something explicit or sexually inappropriate' },
  { id: 'already-married', label: 'Is already married or engaged, and didn’t say so' },
  { id: 'impersonation', label: 'Isn’t who they said they were' },
  { id: 'other', label: 'Something else' },
]

/**
 * What the founder did about a report — the five things that can honestly
 * happen today, written down so that "it is acted on" has a record behind it
 * rather than a promise in front of it.
 *
 * This product has no accounts, so there is no ban button that means anything
 * (`docs/TIME.md`). The real levers are social: a conversation, or a word to
 * their family.
 *
 * Never shown to a member. This is the founder's own vocabulary, and it exists
 * so that resolving a report leaves something behind: see netlify/functions/
 * safety.ts, where a resolved report becomes a stub with no code and no side.
 *
 * Must match netlify/shared/vocab.ts SAFETY_OUTCOMES.
 */
export const SAFETY_OUTCOMES: SafetyReason[] = [
  { id: 'spoke-to-them', label: 'Spoke to them' },
  { id: 'told-the-family', label: 'Told their family' },
  { id: 'not-enough', label: 'Not enough to act on yet — watching' },
  { id: 'no-action', label: 'No action needed' },
]
