import { describe, expect, it } from 'vitest'
import { contactKind, contactProblem, looksReachable } from './contact'

describe('a way to reach someone', () => {
  it('takes an ordinary email and an ordinary number', () => {
    for (const ok of ['sagal@example.com', 'sagal.h@mail.co.uk', '612 555 0148', '+44 7700 900123', '(612) 555-0148']) {
      expect(looksReachable(ok), ok).toBe(true)
      expect(contactProblem(ok)).toBeNull()
    }
  })

  it('refuses the shapes that cannot work — and says which it was reading', () => {
    // The exact typo this exists for: a domain with no dot after it.
    expect(looksReachable('sagal@gmial')).toBe(false)
    expect(contactProblem('sagal@gmial')).toMatch(/after the @/)
    // A number three digits short.
    expect(looksReachable('612 555')).toBe(false)
    expect(contactProblem('612 555')).toMatch(/short/)
    // Neither one yet.
    expect(looksReachable('sagal')).toBe(false)
    expect(contactProblem('sagal')).toMatch(/email or a phone/)
  })

  it('refuses the rest of the impossible shapes', () => {
    for (const bad of ['', '   ', '@example.com', 'sagal@', 'sagal@x.c', 'two@at@signs.com', 'sagal @example.com']) {
      expect(looksReachable(bad), JSON.stringify(bad)).toBe(false)
    }
  })

  it('reads an @ as an email and digits as a phone, so the message matches what she typed', () => {
    expect(contactKind('sagal@example.com')).toBe('email')
    expect(contactKind('+1 612 555 0148')).toBe('phone')
    expect(contactKind('sagal')).toBe('neither')
    expect(contactKind('')).toBe('neither')
  })
})
