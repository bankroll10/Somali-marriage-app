import { describe, expect, it } from 'vitest'
import { routeToMode } from './route'
import { defaultModeFor } from '../data/coach'

describe('routeToMode', () => {
  it('sends a question of deen to the Islamic voice', () => {
    expect(routeToMode('is it haram to text him before nikah?').mode).toBe('islamic')
  })

  it('sends distress to the therapist, not the auntie', () => {
    expect(routeToMode('i keep spiralling and i cannot stop overthinking').mode).toBe(
      'therapist',
    )
  })

  it('sends family pressure to the auntie', () => {
    expect(routeToMode('hooyo asks about marriage every single week').mode).toBe('auntie')
  })

  it('sends "how do I come across" to the profile coach', () => {
    expect(routeToMode('is my bio doing me any favours').mode).toBe('profile')
  })

  it('routes the everyday "he went quiet" to the gendered default voice', () => {
    expect(routeToMode('he went quiet on me for three days', 'woman').mode).toBe(
      defaultModeFor('woman'),
    )
    expect(routeToMode('she left me on read', 'man').mode).toBe(defaultModeFor('man'))
  })

  it('falls back to the gendered default when nothing matches', () => {
    const r = routeToMode('zzzz qqqq', 'woman')
    expect(r.mode).toBe(defaultModeFor('woman'))
    expect(r.why).toBeTruthy()
  })

  it('handles empty and whitespace input without throwing', () => {
    expect(routeToMode('').mode).toBe(defaultModeFor(undefined))
    expect(routeToMode('   ').mode).toBe(defaultModeFor(undefined))
  })

  it('always returns a reason, because the routing is shown to the user', () => {
    for (const text of ['', 'is this halal', 'my mum is asking again', 'i am spiralling']) {
      expect(routeToMode(text).why.length).toBeGreaterThan(0)
    }
  })

  it('prefers deen over distress when a sentence carries both', () => {
    // Rule order is load-bearing: the most specific topic must win.
    expect(routeToMode('i feel anxious about whether this is haram').mode).toBe('islamic')
  })
})
