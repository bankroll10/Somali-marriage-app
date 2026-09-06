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
