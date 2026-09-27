import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { asksBack, buildRead, wordsForOthers, type ReadBand, type ReadResult } from '../../src/lib/read'
import { CAREFUL_SCRIPT, readQuestions, scriptFor } from '../../src/data/read'
import { readAnswers } from '../support/arbitrary'
import { autonomyNotes } from '../guide-eval/graders'
import { scriptFindings } from './properties'
import { readCopy, readInvariants } from './invariants'
import type { Gender } from '../../src/types'

/**
 * Read judgment (docs/GUIDE-EVAL.md, "Relationship judgment", A).
 *
 * The Read turns twelve taps into what someone has shown. Its judgment is in
 * what it decides — the band, the caution, the thinnest ground, whose words —
 * so that is what is tested, as people and as properties over every answer a
 * member could give. The personas are the hard cases the founder named; each
 * says why it is that person, and expects properties, not a paragraph.
 */

const GENDERS: Gender[] = ['woman', 'man']
const RANK: Record<Exclude<ReadBand, 'early' | 'caution'>, number> = { thin: 0, mixed: 1, strong: 2 }
const rank = (r: ReadResult) => RANK[r.band as keyof typeof RANK]

const read = (a: Record<string, string>, g: Gender = 'woman') => {
  const r = buildRead(a, g)
  if (!r) throw new Error('incomplete answers')
  return r
}

const copyOf = readCopy

/** The best that can be answered: a base each persona departs from. */
const BEST = {
  duration: 'months-3',
  named: 'early',
  timeline: 'dated',
  known: 'family',
  secret: 'no',
  family: 'how',
  initiative: 'same-day',
  'in-person': 'several',
  plans: 'never',
  nonneg: 'straight',
  hard: 'listens',
  money: 'no',
}

describe('the personas', () => {
  it('a serious person who moves slowly is read as real signals and a gap to ask about, never as thin or a caution', () => {
    // Said it after she did, a rough window, friends know, asked about her
    // family once, comes back in a day or two, met once, rescheduled once and
    // kept it, answers straight, listens. Slow, not absent.
    const slow = { ...BEST, named: 'after', timeline: 'soft', known: 'friends', family: 'passing', initiative: 'day-two', 'in-person': 'once', plans: 'rescheduled' }
    for (const g of GENDERS) {
      const r = read(slow, g)
      expect(r.band, g).toBe('mixed')
      expect(r.caution, g).toBeUndefined()
      // The thin ground is met with a question, not a conclusion.
      expect(r.script.words, g).toMatch(/\?/)
      expect(autonomyNotes(copyOf(r)), g).toEqual([])
    }
  })

  it('a charming performer who says every serious thing is never read as strong: talk does not outweigh behaviour', () => {
    // Said marriage first, named a date, asked how to approach her family,
    // texts the same day. One friend maybe knows, "let's not tell people
    // yet", met only in passing, keeps moving plans, deflects her
    // non-negotiables, and she ends up feeling like the problem.
    const performer = {
      ...BEST,
      named: 'early',
      timeline: 'dated',
      family: 'how',
      initiative: 'same-day',
      known: 'one',
      secret: 'soft',
      'in-person': 'passing',
      plans: 'few',
      nonneg: 'deflected',
      hard: 'blames',
      money: 'once-small',
    }
    for (const g of GENDERS) {
      const r = read(performer, g)
      expect(r.band, g).not.toBe('strong')
      expect(r.thin, g).toBe('pressure')
      // What he said is counted as shown; how he meets her is what is missing.
      expect(r.dimensions.find((d) => d.dimension === 'intent')!.state, g).toBe('shown')
      expect(r.dimensions.find((d) => d.dimension === 'pressure')!.state, g).toBe('not-yet')
      expect(autonomyNotes(copyOf(r)), g).toEqual([])
    }
    // The same man asking her to keep it hidden, plainly: not a conversation to coach.
    expect(read({ ...performer, secret: 'explicit' }).concern).toBe('hidden')
  })

  it('a serious person whose family is the constraint is not a caution, and the words ask how, without accusing', () => {
    // Everything shown, except the family step: he has not asked about hers.
    const constrained = { ...BEST, known: 'friends', family: 'no' }
    for (const g of GENDERS) {
      const r = read(constrained, g)
      expect(r.band, g).not.toBe('caution')
      expect(r.band, g).not.toBe('thin')
      expect(r.thin, g).toBe('family')
      expect(r.script, g).toEqual(scriptFor('family', g))
      expect(scriptFindings(r.script.words, r.script.why), g).toEqual([])
    }
  })

  it('her discretion, read by a man, is her family’s timing, not a hidden caution', () => {
    // She asks him not to tell people yet; a sister knows; she is open to
    // him approaching her family, with no name yet. The man's weights read
    // discretion alone as her protecting her name (src/data/read.ts).
    const discreet = { ...BEST, known: 'one', secret: 'soft', family: 'passing' }
    const his = read(discreet, 'man')
    expect(his.band).toBe('mixed')
    expect(his.caution).toBeUndefined()
    expect(his.dimensions.find((d) => d.dimension === 'public')!.state).toBe('partly')
  })

  it('an inconsistent person with high stated intent is not strong, and the words name the pattern without blame', () => {
    // Everything said, family told, asked how — and it goes quiet when she
    // stops, plans move, they have only crossed paths.
    const inconsistent = { ...BEST, initiative: 'silence', plans: 'few', 'in-person': 'passing' }
    for (const g of GENDERS) {
      const r = read(inconsistent, g)
      expect(r.band, g).not.toBe('strong')
      expect(r.thin, g).toBe('consistency')
      expect(r.script.words, g).toMatch(/\?/)
      expect(scriptFindings(r.script.words, r.script.why), g).toEqual([])
    }
  })
})

describe('the two sides', () => {
  it('the rules that protect her hold the same from his side: money, being hidden, being careful', () => {
    for (const g of GENDERS) {
      expect(read({ ...BEST, money: 'yes' }, g).concern, g).toBe('money')
      expect(read({ ...BEST, secret: 'explicit', hard: 'blames' }, g).concern, g).toBe('hidden')
      expect(read({ ...BEST, secret: 'explicit', known: 'nobody' }, g).concern, g).toBe('hidden')
      const careful = read({ ...BEST, hard: 'careful' }, g)
      expect(careful.band, g).not.toBe('strong')
      expect(careful.script, g).toEqual(CAREFUL_SCRIPT)
    }
  })

  it('pins the differences that are intended, each with its reason', () => {
    const w = Object.fromEntries(readQuestions('woman').map((q) => [q.id, Object.fromEntries(q.options.map((o) => [o.id, o.weight]))]))
    const m = Object.fromEntries(readQuestions('man').map((q) => [q.id, Object.fromEntries(q.options.map((o) => [o.id, o.weight]))]))
    const differs = Object.keys(w).flatMap((q) => Object.keys(w[q]).filter((o) => w[q][o] !== m[q][o]).map((o) => `${q}.${o}`))
    // known: before his people have gone to hers, her family may not know; a
    //   sister or a friend knowing is the tell on her side (Part 10).
    // secret: discretion protects her name in a community that talks; alone,
    //   it is not a sign against her (class F, RESEARCH L3).
    // initiative: plenty of practising women never open a conversation; her
    //   not texting first is not scored as disinterest.
    expect(differs.sort()).toEqual(
      ['known.friends', 'known.one', 'known.nobody', 'secret.soft', 'secret.explicit', 'initiative.day-two', 'initiative.eventually', 'initiative.silence'].sort(),
    )
    // And every difference is in one direction: his read of her is never harsher.
    for (const k of differs) {
      const [q, o] = k.split('.')
      expect(m[q][o]!, k).toBeGreaterThan(w[q][o]!)
    }
  })

  it('on the same answers, his read of her is never a lower band than hers of him', () => {
    fc.assert(
      fc.property(readAnswers('woman'), (a) => {
        const her = read(a, 'woman')
        const his = read(a, 'man')
        if (her.band === 'caution' || his.band === 'caution') return her.band === his.band && her.concern === his.concern
        if (her.band === 'early' || his.band === 'early') return her.band === his.band
        return rank(his) >= rank(her)
      }),
    )
  })
})

describe('properties over every answer', () => {
  it('words cannot buy a strong read: without being known, it is never strong', () => {
    // Every way of not being known, with everything else at its best: the
    // case random answers rarely reach, and the one the rule exists for. A
    // strong rule that dropped `public` passed the sampled property below.
    for (const g of GENDERS) {
      const q = Object.fromEntries(readQuestions(g).map((x) => [x.id, x.options.map((o) => o.id)]))
      for (const known of q.known)
        for (const secret of q.secret) {
          const r = read({ ...BEST, known, secret }, g)
          if (r.dimensions.find((d) => d.dimension === 'public')!.state !== 'shown') expect(r.band, `${g}: ${known}, ${secret}`).not.toBe('strong')
        }
    }
    for (const g of GENDERS)
      fc.assert(
        fc.property(readAnswers(g), (a) => {
          const r = read(a, g)
          const known = r.dimensions.find((d) => d.dimension === 'public')!.state === 'shown'
          return known || r.band !== 'strong'
        }),
      )
  })

  it('a request for money is named whatever else is answered, for both', () => {
    for (const g of GENDERS)
      fc.assert(fc.property(readAnswers(g), (a) => read({ ...a, money: 'yes' }, g).concern === 'money'))
  })

  it('no single answer on its own raises a caution, except money: ordinary friction is not escalated', () => {
    for (const g of GENDERS)
      for (const q of readQuestions(g))
        for (const o of q.options) {
          const r = read({ ...BEST, [q.id]: o.id }, g)
          expect(r.band === 'caution', `${g}: ${q.id}=${o.id}`).toBe(q.id === 'money' && o.id === 'yes')
        }
  })

  it('is monotone: raising any one answer never lowers the band, and never raises a caution', () => {
    for (const g of GENDERS) {
      const questions = readQuestions(g).filter((q) => q.dimension !== 'context')
      fc.assert(
        fc.property(readAnswers(g), fc.constantFrom(...questions), (a, q) => {
          const before = read(a, g)
          const from = q.options.find((o) => o.id === a[q.id])!.weight
          if (from === null) return true
          return q.options
            .filter((o) => o.weight !== null && o.weight > from)
            .every((o) => {
              const after = read({ ...a, [q.id]: o.id }, g)
              if (after.band === 'caution') return before.band === 'caution'
              if (before.band === 'caution' || before.band === 'early') return true
              return rank(after) >= rank(before)
            })
        }),
      )
    }
  })

  it('careful what she raises: never strong, no words for the other person, and one person to tell', () => {
    for (const g of GENDERS)
      fc.assert(
        fc.property(readAnswers(g), (a) => {
          const r = read({ ...a, hard: 'careful' }, g)
          return r.band !== 'strong' && wordsForOthers(r).length === 0 && r.script === CAREFUL_SCRIPT && (r.band === 'caution' || !!r.careful)
        }),
      )
  })

  it('a caution asks nothing back about words for the other person', () => {
    for (const g of GENDERS)
      fc.assert(fc.property(readAnswers(g), (a) => {
        const r = read(a, g)
        return r.band !== 'caution' || r.careful !== undefined || !asksBack(r)
      }))
  })

  it('two weeks in, it concludes nothing, whatever is answered', () => {
    for (const g of GENDERS)
      fc.assert(
        fc.property(readAnswers(g), (a) => {
          const r = read({ ...a, duration: 'weeks-0' }, g)
          return r.band === 'caution' || (r.band === 'early' && (r.watch?.length ?? 0) > 0)
        }),
      )
  })

  it('holds every read invariant, reads no mind and decides nothing, whatever is answered', () => {
    for (const g of GENDERS)
      fc.assert(
        fc.property(readAnswers(g), (a) => {
          const r = read(a, g)
          expect(readInvariants(r)).toEqual([])
          expect(scriptFindings(r.script.words, r.script.why)).toEqual([])
        }),
      )
  })
})
