import type { TrustSettings } from '../types'

/**
 * The trust score — how much of the protection surface someone has actually
 * taken up. Verification carries the most weight because it is the one signal
 * another member cannot fake; the rest are choices that say how you intend to
 * be met.
 *
 * Lives here rather than in the Trust screen because it is product judgement,
 * not presentation: the number is quoted to members and will eventually rank
 * discovery, so it deserves to be tested on its own.
 */
export const TRUST_WEIGHTS: Record<keyof TrustSettings, number> = {
  identityVerified: 35,
  seriousIntention: 15,
  waliFriendly: 15,
  blurPhotos: 15,
  privacyShield: 20,
  // Deliberately zero. Keeping the Guide on your own device is a private
  // choice about your own data; it says nothing to anyone else about how
  // seriously you take this, and scoring it would imply otherwise.
  guideOnDevice: 0,
}

/** 0–100. Every weight set gives 100 exactly. */
export function trustScore(t: TrustSettings): number {
  return (Object.keys(TRUST_WEIGHTS) as (keyof TrustSettings)[]).reduce(
    (sum, k) => sum + (t[k] ? TRUST_WEIGHTS[k] : 0),
    0,
  )
}
