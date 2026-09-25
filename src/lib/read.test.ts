import { describe, expect, it } from 'vitest'
import { buildRead, readSummary } from './read'
import { CAREFUL_SCRIPT, DIMENSION_LABEL, EXAMPLE_ANSWERS, NONNEG_SCRIPT, READ_QUESTION_COUNT, readQuestions, scriptFor } from '../data/read'
import { familyScripts, familyScriptsLine } from '../data/families'

/**
 * The read says things about a real man to a woman who is already anxious. The
 * tests that matter are therefore not about arithmetic — they are about what it
 * is structurally incapable of saying.
 */

/** A complete set of answers, overridable per test. */
function answers(over: Record<string, string> = {}) {
  return {
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
    ...over,
  }
}

/** Everything he could fail to do. */
const nothing = {
  named: 'no',
  timeline: 'none',
  known: 'nobody',
  secret: 'soft',
  family: 'no',
  initiative: 'silence',
  'in-person': 'never',
  plans: 'no-plans',
  nonneg: 'deflected',
  hard: 'quiet',
}

function allText(r: ReturnType<typeof buildRead>): string {
  if (!r) return ''
  return [r.headline, r.summary, r.script.why, r.script.words, r.script.tells, r.caution ?? '', ...(r.watch ?? []), ...r.shown, ...r.missing]
    .join(' ')
    .toLowerCase()
}

describe('what it refuses to say', () => {
  it('never judges his character, and never tells her to stay or go', () => {
    const banned = [
      'good man', 'bad man', 'a player', 'red flag', 'he loves you', "he doesn't love you",
      'leave him', 'dump him', 'end it', 'he is not worth', 'you deserve better', 'walk away',
    ]
    const cases = [
      answers(),
      answers(nothing),
      answers({ ...nothing, duration: 'weeks-0' }),
      answers({ secret: 'explicit', hard: 'blames' }),
      answers({ duration: 'months-plus', known: 'nobody' }),
    ]
    for (const a of cases) {
      const text = allText(buildRead(a))
      for (const phrase of banned) expect(text, `for ${JSON.stringify(a)}`).not.toContain(phrase)
    }
  })

  it('never attaches a number to a human being', () => {
    const r = buildRead(answers())!
    expect(allText(r)).not.toMatch(/\b\d{1,3}\s*(%|out of|\/)/)
    // The dimensions she sees are three words, never a score.
    for (const d of r.dimensions) expect(['shown', 'partly', 'not-yet']).toContain(d.state)
  })
})

describe('honesty about what it can know', () => {
  it('refuses to conclude anything under two weeks, however good it looks', () => {
    const r = buildRead(answers({ duration: 'weeks-0' }))!
    expect(r.band).toBe('early')
    expect(r.headline).toMatch(/too early/i)
    expect(r.watch).toHaveLength(5)
    expect(r.script.words).toMatch(/what you are looking for/i)
  })

  it('will not call him strong while she is being kept hidden', () => {
    // Everything else perfect; nobody knows she exists.
    const r = buildRead(answers({ known: 'nobody', secret: 'soft' }))!
    expect(r.band).not.toBe('strong')
    expect(r.thin).toBe('public')
  })

  it('needs every answer before it says anything at all', () => {
    const partial = answers()
    delete (partial as Record<string, string>).hard
    expect(buildRead(partial)).toBeNull()
  })
})

describe('the pattern it declines to coach', () => {
  it('names being hidden and blamed, and sends her to a real person', () => {
    const r = buildRead(answers({ secret: 'explicit', hard: 'blames' }))!
    expect(r.band).toBe('caution')
    expect(r.caution).toMatch(/tell one person/i)
    // Not a diagnosis of him.
    expect(r.summary).toMatch(/cannot tell you what he intends/i)
  })

  it('treats explicit secrecy with total isolation the same way', () => {
    const r = buildRead(answers({ secret: 'explicit', known: 'nobody' }))!
    expect(r.band).toBe('caution')
  })

  it('does not fire on secrecy alone when everything else is healthy', () => {
    const r = buildRead(answers({ secret: 'explicit' }))!
    expect(r.band).not.toBe('caution')
  })
})

describe('money asked for before the families meet', () => {
  // The most common thing the worst people on a marriage platform do, and the
  // read had no question that could see it (docs/SECURITY.md, romance scams).
  it('is named as the shape scams take, whatever else he has shown', () => {
    const r = buildRead(answers({ money: 'yes' }))!
    expect(r.band).toBe('caution')
    expect(r.summary).toMatch(/shape romance scams take/)
    expect(r.caution).toMatch(/Send nothing more until your families have met/)
  })

  it('reads the same way for a man asked for money', () => {
    const r = buildRead(answers({ money: 'yes' }), 'man')!
    expect(r.band).toBe('caution')
    expect(r.caution).toMatch(/a brother, a friend/)
    expect(r.summary).not.toMatch(/\bhis\b|\bhim\b/)
  })

  it('does not fire on once, small, and paid back', () => {
    expect(buildRead(answers({ money: 'once-small' }))!.band).not.toBe('caution')
  })

  it('a read kept before the question existed is still whole', () => {
    const kept = answers() as Record<string, string>
    delete kept.money
    expect(buildRead(kept)).not.toBeNull()
  })
})

describe('the reading itself', () => {
  it('recognises a man who has actually done the things', () => {
    const r = buildRead(answers())!
    expect(r.band).toBe('strong')
    expect(r.shown.length).toBeGreaterThan(4)
    expect(r.missing).toHaveLength(0)
  })

  it('recognises when almost nothing has happened', () => {
    const r = buildRead(answers(nothing))!
    expect(r.band).toBe('thin')
    expect(r.missing.length).toBeGreaterThan(4)
  })

  it('always ends in words she can actually say', () => {
    for (const a of [answers(), answers(nothing), answers({ duration: 'weeks-0' }), answers({ secret: 'explicit', hard: 'blames' })]) {
      const r = buildRead(a)!
      expect(r.script.words.length).toBeGreaterThan(60)
      expect(r.script.tells.length).toBeGreaterThan(40)
    }
  })

  it('speaks to the thinnest ground, not a generic script', () => {
    expect(buildRead(answers({ known: 'nobody', secret: 'soft' }))!.thin).toBe('public')
    // The thinnest state first, and among equals the one that comes first:
    // being hidden outranks a gap of the same depth. Asking how he'd approach her family is
    // the wrong question to put to a man who has told nobody she exists.
    expect(buildRead(answers({ known: 'nobody', secret: 'soft', family: 'no' }))!.thin).toBe('public')
    expect(buildRead(answers({ family: 'avoids' }))!.thin).toBe('family')
    expect(buildRead(answers({ initiative: 'silence', 'in-person': 'never', plans: 'no-plans' }))!.thin).toBe('consistency')
    expect(buildRead(answers({ named: 'no', timeline: 'none' }))!.thin).toBe('intent')
  })

  it('reads back her own answers rather than generic advice', () => {
    const r = buildRead(answers({ duration: 'months-plus', known: 'nobody', secret: 'soft' }))!
    expect(r.summary).toMatch(/past three months/i)
    expect(r.missing.join(' ')).toMatch(/nobody in his life knows you exist/i)
    // A gap this late is fair to ask about directly — named, but not read as his intent.
    expect(r.summary).toMatch(/fair to ask about it directly/i)
    expect(r.summary).not.toMatch(/decision rather than an oversight/i)
  })

  it('gives two different women two different readings', () => {
    const a = buildRead(answers({ named: 'no', timeline: 'none' }))!
    const b = buildRead(answers({ initiative: 'silence', 'in-person': 'never', plans: 'few' }))!
    expect(a.summary).not.toEqual(b.summary)
    expect(a.script.words).not.toEqual(b.script.words)
  })
})

describe('a man reading a woman', () => {
  it('flips every pronoun, in prompts, options and notes', () => {
    const qs = readQuestions('man')
    const text = qs.map((q) => `${q.prompt} ${q.helper ?? ''} ${q.options.map((o) => `${o.label} ${o.note}`).join(' ')}`).join(' ')
    expect(text).not.toMatch(/\bhe\b|\bhim\b|\bhis\b|\bhimself\b/i)
    expect(text).toMatch(/\bshe\b/)
    expect(text).not.toMatch(/\{/)
  })

  it('asks the same number of questions of everyone', () => {
    expect(readQuestions('woman')).toHaveLength(READ_QUESTION_COUNT)
    expect(readQuestions('man')).toHaveLength(READ_QUESTION_COUNT)
  })

  it('produces a reading for him too', () => {
    const r = buildRead(answers(), 'man')!
    expect(r.band).toBe('strong')
    expect(r.summary).not.toMatch(/\bhis\b/)
  })

  it('reaches every band from both sides, naming only the right one', () => {
    // On 2026-09-12 a man who finished the read on the live site was told "we
    // cannot tell you what he intends" and to go and tell "an older woman you
    // trust". tests/invariants/both-sides.test.ts sweeps generated answers;
    // these fixed sets make sure the rare bands are in the sweep at all.
    const pick = (i: number, over: Record<string, string>) =>
      Object.fromEntries(readQuestions('woman').map((q) => [q.id, over[q.id] ?? (q.options[i] ?? q.options.at(-1)!).id]))
    const bands: [string, Record<string, string>][] = [
      ['early', pick(0, { duration: 'weeks-0' })],
      ['caution', pick(3, { duration: 'months-plus', secret: 'explicit', hard: 'blames' })],
      ['strong', pick(0, { duration: 'months-plus' })],
      ['thin', pick(3, { duration: 'months-plus', secret: 'no', hard: 'quiet', money: 'no' })],
      ['mixed', pick(1, { duration: 'months-3', secret: 'no' })],
      ['caution', pick(0, { duration: 'months-plus', money: 'yes' })],
    ]
    const wrong = { man: /\b(he|him|his|women|sister)\b/i, woman: /\b(she|her|hers)\b/i }
    for (const [band, set] of bands) {
      for (const g of ['woman', 'man'] as const) {
        const r = buildRead(set, g)!
        expect(r.band, `${band}, read by a ${g}`).toBe(band)
        const text = [r.headline, r.summary, r.caution ?? '', ...(r.watch ?? []), ...r.shown, ...r.missing,
          ...r.dimensions.map((d) => d.label), r.script.why, r.script.words, r.script.tells, readSummary(r, g)].join('\n')
        expect(wrong[g].exec(text)?.[0] ?? null, `${band}, read by a ${g}`).toBeNull()
      }
    }
  })

  it('offers the same answers to both sides, so a kept read stays readable', () => {
    const his = readQuestions('man')
    const hers = readQuestions('woman')
    expect(his.map((x) => x.id)).toEqual(hers.map((x) => x.id))
    for (const [i, x] of his.entries()) {
      expect(x.options.map((o) => o.id), x.id).toEqual(hers[i].options.map((o) => o.id))
      expect(x.dimension, x.id).toBe(hers[i].dimension)
    }
  })

  it('never grades him on the step the product gives him', () => {
    // A serious man asks how to approach HER family. His read cannot ask
    // whether she was asked about hers: it would mark him down for her
    // waiting on the step that is his to take.
    const family = (g: 'man' | 'woman') => readQuestions(g).find((q) => q.id === 'family')!
    expect(family('woman').prompt).toMatch(/asked about your family/i)
    expect(family('man').prompt).not.toBe(family('woman').prompt)
    const best = family('man').options.find((o) => o.weight === 1)!
    expect(best.note).toMatch(/her family/i)
    expect(best.note).not.toMatch(/your family/i)
    expect(scriptFor('family', 'man').words).toMatch(/approach your family/i)
    expect(scriptFor('family', 'woman').words).toMatch(/approach my family/i)
  })

  it('hands him the words for that step, and advertises only scripts he can open', () => {
    expect(familyScripts('man').map((s) => s.id)).toContain('approach-her-family')
    expect(familyScripts('woman').map((s) => s.id)).not.toContain('approach-her-family')
    // He comes to her father because she told him to — the words say so, and
    // do not put the father ahead of the conversation with her (Part 10).
    const his = familyScripts('man').find((s) => s.id === 'approach-her-family')!
    expect(his.script.words).toMatch(/she told me you are the one I should come to/)
    expect(his.script.words).not.toMatch(/without coming to you first/)
    for (const g of ['woman', 'man'] as const) {
      const mine = new Set(familyScripts(g).map((s) => s.title.split(',')[0].toLowerCase()))
      for (const part of familyScriptsLine(g).replace(/ — word for word\.$/, '').split(', ')) {
        expect(mine.has(part), `${g}: ${part}`).toBe(true)
      }
    }
  })

  it('gives a man as many family scripts as a woman, including telling his own', () => {
    const hers = familyScripts('woman').map((s) => s.id)
    const his = familyScripts('man').map((s) => s.id)
    expect(his).toHaveLength(hers.length)
    expect(his).toContain('tell-family-online')
    expect(hers).toContain('tell-wali-online')
  })

  it('does not read her restraint as his red flag', () => {
    // Never texting first, and asking for discretion before the families have
    // met, are ordinary on her side and the two sharpest signals on his.
    const opt = (g: 'man' | 'woman', id: string, o: string) =>
      readQuestions(g).find((q) => q.id === id)!.options.find((x) => x.id === o)!
    expect(opt('man', 'initiative', 'silence').weight).toBeGreaterThan(0)
    expect(opt('man', 'secret', 'explicit').weight).toBeGreaterThan(0)
    expect(opt('woman', 'initiative', 'silence').weight).toBe(0)
    expect(opt('woman', 'secret', 'explicit').weight).toBe(0)
  })

  it('does not mark her down for a family that does not know yet — the approach is his step (docs/DECISIONS.md Part 10)', () => {
    const opt = (g: 'man' | 'woman', id: string, o: string) =>
      readQuestions(g).find((q) => q.id === id)!.options.find((x) => x.id === o)!
    expect(opt('man', 'known', 'nobody').weight).toBeGreaterThan(0)
    expect(opt('woman', 'known', 'nobody').weight).toBe(0)
    expect(readQuestions('man').find((q) => q.id === 'known')!.helper).toMatch(/that is hers to time/)
    // And "it has not come up" reads as his unasked step, not her gap.
    expect(opt('man', 'family', 'no').label).toBe('It has not come up — I haven’t asked yet')
    expect(opt('man', 'family', 'no').note).toMatch(/you have not yet asked her/)
  })
})

describe('what the Guide is told', () => {
  it('summarises a read in one line, with no personal detail in it', () => {
    const r = buildRead(answers({ known: 'nobody', secret: 'soft' }))!
    const s = readSummary(r)
    expect(s).toMatch(/thinnest ground/)
    expect(s.length).toBeLessThan(120)
  })

  it('names a money request as one, not as being kept hidden', () => {
    // Every caution used to reach the guide as "a pattern of being kept
    // hidden" — including the one it most needs to know about.
    const money = buildRead(answers({ money: 'yes' }))!
    expect(money.band).toBe('caution')
    expect(money.concern).toBe('money')
    expect(readSummary(money)).toMatch(/asked for money before the families have met/)
    expect(readSummary(money)).not.toMatch(/hidden/)
    const hidden = buildRead(answers({ secret: 'explicit', known: 'nobody' }))!
    expect(hidden.concern).toBe('hidden')
    expect(readSummary(hidden)).toMatch(/kept hidden/)
  })
})

describe('the example on the introduction', () => {
  // The tool's introduction shows one worked result so a stranger knows what
  // she is about to get. It is built by the real engine from these answers, so
  // it is pinned here: a change to the engine that turns the example into a
  // warning or an "it's too early" would be a change to the landing page.
  for (const gender of ['woman', 'man'] as const) {
    it(`reads as real signals with one gap, for a ${gender}`, () => {
      const r = buildRead(EXAMPLE_ANSWERS, gender)
      expect(r).not.toBeNull()
      expect(r!.band).toBe('mixed')
      expect(r!.caution).toBeUndefined()
      expect(r!.thin).toBe('intent')
      expect(r!.shown.length).toBeGreaterThanOrEqual(2)
      expect(r!.script.words.length).toBeGreaterThan(20)
    })
  }
})

// Moved from tests/alignment-audit.test.ts (docs/PRODUCT.md), when matching went.
describe('the read summarises her answers; it does not predict', () => {
  // He named marriage, gave a date, his family knows, never asked for secrecy,
  // asked how to approach her family, and is steady — and he pushed back on
  // what she will not compromise on, and goes quiet when something is hard.
  // The old weights summed that past 0.72 and told her he had "shown you the
  // things that predict it". The states on her screen say pressure: not yet.
  const answers = {
    duration: 'months-3',
    named: 'early',
    timeline: 'dated',
    known: 'family',
    secret: 'no',
    family: 'how',
    initiative: 'same-day',
    'in-person': 'several',
    plans: 'never',
    money: 'no',
    nonneg: 'pushed',
    hard: 'quiet',
  }

  it('the band follows the dimension states she can see', () => {
    const r = buildRead(answers)!
    expect(r.dimensions.find((d) => d.dimension === 'pressure')!.state).toBe('not-yet')
    expect(r.band).not.toBe('strong')
  })

  it('a read she can check: strong only when being known is shown, nothing is not-yet, and four of five are shown', () => {
    const r = buildRead({ ...answers, nonneg: 'straight', hard: 'listens' })!
    expect(r.band).toBe('strong')
    expect(r.dimensions.every((d) => d.state !== 'not-yet')).toBe(true)
  })

  it('"I have not told him" says nothing about him, so it is not scored', () => {
    // Scored at 0.5 it dragged "gets defensive, but comes back" under the line.
    const r = buildRead({ ...answers, nonneg: 'untold', hard: 'defensive' })!
    expect(r.dimensions.find((d) => d.dimension === 'pressure')!.state).toBe('shown')
  })

  it('never claims to predict, in the result or in what the guide is told', () => {
    const r = buildRead({ ...answers, nonneg: 'straight', hard: 'listens' })!
    expect(`${r.headline} ${r.summary}`).not.toMatch(/\bpredicts?\b|passing time produces|rarer than/i)
    expect(r.summary).toMatch(/not a prediction/)
    expect(readSummary({ band: 'strong', thin: 'public' })).not.toMatch(/predict/i)
  })
})

describe('a difference is not pressure, and a pause is not a gap (docs/DECISIONS.md Part 8)', () => {
  const base = {
    duration: 'months-3',
    named: 'early',
    timeline: 'dated',
    known: 'family',
    secret: 'no',
    family: 'how',
    initiative: 'same-day',
    'in-person': 'several',
    plans: 'never',
    money: 'no',
  }
  const option = (q: string, id: string) => readQuestions('woman').find((x) => x.id === q)!.options.find((o) => o.id === id)!

  it('a plain answer that is not hers is still a straight answer', () => {
    expect(readQuestions('woman').find((q) => q.id === 'nonneg')!.helper).toMatch(/A plain answer counts, even one that isn’t yours/)
    expect(option('nonneg', 'straight').note).toMatch(/whatever it was/)
  })
  it('names pressure as pressure, not disagreement', () => {
    expect(option('nonneg', 'pushed').label).toBe('Yes — and he keeps trying to talk me out of them')
    expect(option('nonneg', 'pushed').label).not.toMatch(/pushed back/)
  })
  it('reads a pause that comes back the way her own map does — as coming back', () => {
    expect(option('hard', 'defensive').label).toBe('Gets defensive or goes quiet, but comes back')
    expect(option('hard', 'defensive').weight).toBe(0.7)
    expect(option('hard', 'quiet').label).toBe('Goes quiet, and it doesn’t come back up')
  })
  it('when her non-negotiables are the gap, the words ask for a plain answer, not agreement', () => {
    for (const nonneg of ['pushed', 'deflected']) {
      const r = buildRead({ ...base, nonneg, hard: 'listens' })!
      expect(r.thin).toBe('pressure')
      expect(r.script.words).toBe(NONNEG_SCRIPT.words)
    }
    expect(NONNEG_SCRIPT.words).toMatch(/not agreement, and not an argument/)
    expect(NONNEG_SCRIPT.tells).toMatch(/“That isn’t me” is another, and it is one you can decide with/)
  })
  it('when being made to feel like the problem is the gap, the words are for that', () => {
    const r = buildRead({ ...base, nonneg: 'straight', hard: 'blames' })!
    expect(r.thin).toBe('pressure')
    expect(r.script.words).toBe(scriptFor('pressure').words)
  })
})

describe('what the dimensions are called', () => {
  it('does not call contact follow-through', () => {
    // Two of the three answers under `consistency` are how soon they text back
    // and how often you have met: contact, which the most eager person has
    // most of. The label says what is counted (docs/DECISIONS.md, the
    // commitment audit).
    const consistency = readQuestions('woman').filter((q) => q.dimension === 'consistency').map((q) => q.id)
    expect(consistency.sort()).toEqual(['in-person', 'initiative', 'plans'])
    expect(DIMENSION_LABEL.consistency).not.toMatch(/follow-through/i)
    expect(DIMENSION_LABEL.consistency).toMatch(/contact/i)
    expect(DIMENSION_LABEL.consistency).toMatch(/plans/i)
  })
})

describe('careful what she raises (docs/DECISIONS.md Part 9)', () => {
  const base = {
    duration: 'months-3',
    named: 'early',
    timeline: 'dated',
    known: 'family',
    secret: 'no',
    family: 'how',
    initiative: 'same-day',
    'in-person': 'several',
    plans: 'never',
    money: 'no',
    nonneg: 'straight',
  }

  it('is her report of her own caution, said as that', () => {
    const q = readQuestions('woman').find((x) => x.id === 'hard')!
    const o = q.options.find((x) => x.id === 'careful')!
    expect(o.label).toBe('I’m careful what I raise, because of how he reacts')
    expect(o.weight).toBe(0)
    expect(readQuestions('man').find((x) => x.id === 'hard')!.options.find((x) => x.id === 'careful')!.label).toMatch(/because of how she reacts/)
  })

  it('says it back quietly, with somewhere to take it — not the caution band', () => {
    const r = buildRead({ ...base, hard: 'careful' })!
    expect(r.band).not.toBe('caution')
    expect(r.caution).toBeUndefined()
    expect(r.careful).toMatch(/worth saying out loud to one person who knows you/)
    expect(r.careful).toMatch(/So that someone other than him knows/)
  })

  it('hands her words for one person who knows her, not a question for him — whatever ground is thinnest', () => {
    for (const over of [{}, { known: 'nobody' }, { named: 'no', timeline: 'none' }]) {
      const r = buildRead({ ...base, ...over, hard: 'careful' })!
      expect(r.script.words).toBe(CAREFUL_SCRIPT.words)
    }
    expect(CAREFUL_SCRIPT.words).toMatch(/I just want someone to know/)
  })

  it('holds from the first fortnight, when nothing else can be concluded', () => {
    const r = buildRead({ ...base, duration: 'weeks-0', hard: 'careful' })!
    expect(r.band).toBe('early')
    expect(r.careful).toBeDefined()
    expect(r.script.words).toBe(CAREFUL_SCRIPT.words)
  })

  it('is never told he has done most of it, or pointed at asking him directly', () => {
    // Everything else shown: this used to be the strong band, "worth closing,
    // not worth panicking about … one clear conversation".
    const r = buildRead({ ...base, hard: 'careful' })!
    expect(r.band).toBe('mixed')
    expect(r.summary).not.toMatch(/not worth panicking|ask about it directly|one clear conversation/)
  })

  it('with being kept hidden, is the same pattern feeling like the problem is', () => {
    const r = buildRead({ ...base, secret: 'explicit', hard: 'careful' })!
    expect(r.band).toBe('caution')
    expect(r.concern).toBe('hidden')
    expect(r.summary).toMatch(/you are careful about what you raise, because of how he reacts/)
  })

  it('tells the guide, so it never hands words to say to him first', () => {
    const r = buildRead({ ...base, hard: 'careful' })!
    expect(readSummary(r)).toMatch(/they are careful what they raise with him, because of how he reacts/)
    expect(readSummary(buildRead({ ...base, hard: 'listens' })!)).not.toMatch(/careful/)
  })

  it('gives no clinical label and no verdict on him', () => {
    const r = buildRead({ ...base, hard: 'careful' })!
    const text = [r.careful, r.summary, r.script.why, r.script.words, r.script.tells].join(' ').toLowerCase()
    expect(text).not.toMatch(/abus|controlling|narciss|toxic|stonewall|contempt|red flag/)
  })
})
