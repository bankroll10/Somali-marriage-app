import { describe, expect, it } from 'vitest'
import { TRUST_WEIGHTS, trustScore } from './trust'
import { defaultTrust } from '../types'

describe('trustScore', () => {
  it('is 0 for a member who has taken nothing up', () => {
    expect(trustScore(defaultTrust)).toBe(0)
  })

  it('is exactly 100 when every protection is set', () => {
    expect(
      trustScore({
        identityVerified: true,
        seriousIntention: true,
        waliFriendly: true,
        blurPhotos: true,
        privacyShield: true,
      }),
    ).toBe(100)
  })

  it('weights verification highest — it is the one signal you cannot fake', () => {
    const weights = Object.values(TRUST_WEIGHTS)
    expect(TRUST_WEIGHTS.identityVerified).toBe(Math.max(...weights))
  })

  it('lands verification alone in the "Getting started" band, not "Building trust"', () => {
    // The Trust screen bands at 50 / 80. Verifying alone must not read as
    // "Building trust" — the copy promises the other controls do real work.
    expect(trustScore({ ...defaultTrust, identityVerified: true })).toBeLessThan(50)
  })
})
