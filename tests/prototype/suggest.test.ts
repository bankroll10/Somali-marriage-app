import { describe, expect, it } from 'vitest'
import { CRITERIA, PROMPTS, labelOf } from '../../src/prototype/match/criteria'
import { PAIR_TEXT, SCENARIOS, fingerprint, pairTextFor, peopleFor, scenarioOf } from '../../src/prototype/match/fixtures'
import { SHOWN_LIMIT, basisLine, compare, evaluate, judge, looksLikeContact, orList, pairFixture, resolveBasis, summaryPoints, type Self } from '../../src/prototype/match/suggest'
import { CRITERION_IDS, type Asks, type Side } from '../../src/prototype/match/types'

/**
 * Eligibility and comparison, on the sample scenarios (docs/MATCH-PROTOTYPE.md).
 * The counts below are what the scenarios promise the tester; nothing is
 * relaxed to reach them, and a requirement that fails is never softened.
 */

const selfOf = (id: 'three' | 'one' | 'none', side: Side): Self => {
  const s = scenarioOf(id)
  return { side, answers: s.answers, asks: s.asks }
}
const SIDES: Side[] = ['woman', 'man']

describe('the sample scenarios', () => {
  it.each(SIDES)('give three, one and no suggestions for a tester who is a %s, with nothing relaxed', (side) => {
    const people = peopleFor(side)
    expect(evaluate(selfOf('three', side), people).shown.map((p) => p.id.split('-')[1])).toEqual(['p1', 'p2', 'p3'])
    expect(evaluate(selfOf('one', side), people).shown.map((p) => p.id.split('-')[1])).toEqual(['p4'])
    expect(evaluate(selfOf('none', side), people).shown).toEqual([])
  })

  it('leave people out by the tester’s requirement, by the other person’s, and by both', () => {
    const people = peopleFor('woman')
    const reasons = (id: 'three' | 'one' | 'none') =>
      Object.fromEntries(evaluate(selfOf(id, 'woman'), people).leftOut.map((j) => [j.person.id.split('-')[1], { you: j.byYou.length > 0, them: j.byThem.length > 0 }]))
    expect(reasons('three')).toEqual({ p4: { you: true, them: true }, p5: { you: false, them: true } })
    expect(reasons('one')).toMatchObject({ p2: { you: true, them: false }, p1: { you: true, them: true } })
    // Nobody is eligible in the third, and both directions are at work.
    const none = reasons('none')
    expect(Object.values(none).some((r) => r.you && !r.them)).toBe(true)
    expect(Object.values(none).some((r) => !r.you && r.them)).toBe(true)
  })

  it('never show more than the limit, however many are eligible, and never reorder by anything but the fixed order', () => {
    const everyoneWelcome: Self = {
      side: 'woman',
      answers: scenarioOf('three').answers,
      asks: CRITERION_IDS.reduce((a, c) => ({ ...a, [c]: { accept: [], firm: 'any' as const } }), {} as Asks),
    }
    const people = peopleFor('woman').map((p) => ({ ...p, asks: everyoneWelcome.asks }))
    const out = evaluate(everyoneWelcome, people)
    expect(out.eligible).toHaveLength(5)
    expect(out.shown).toHaveLength(SHOWN_LIMIT)
    expect(out.shown.map((p) => p.id)).toEqual(people.slice(0, SHOWN_LIMIT).map((p) => p.id))
  })

  it('are made of adult, fictional people on both sides', () => {
    for (const side of SIDES) {
      for (const p of peopleFor(side)) {
        expect(p.age).toBeGreaterThanOrEqual(25)
        expect(p.side).not.toBe(side)
        expect(p.words.join(' ')).not.toMatch(/@|\d{5,}|https?:|www\./)
      }
    }
    for (const s of SCENARIOS) expect(s.age).toBeGreaterThanOrEqual(18)
  })
})

describe('a requirement works in both directions, and a preference never excludes', () => {
  const people = peopleFor('woman')
  const me = selfOf('three', 'woman')

  it('a requirement the person fails leaves them out; the same point as a preference does not', () => {
    const p4 = people.find((p) => p.id.endsWith('p4'))!
    expect(judge(me, p4).byYou).toEqual(['timeline'])
    const loosened: Self = { ...me, asks: { ...me.asks, timeline: { ...me.asks.timeline, firm: 'preference' } } }
    expect(judge(loosened, p4).byYou).toEqual([])
    // Left alone, the same tester still does not see p4: the prototype never loosens a requirement for them.
    expect(evaluate(me, people).shown.map((p) => p.id)).not.toContain(p4.id)
  })

  it('the other person’s requirement leaves the tester out of their suggestions', () => {
    const p5 = people.find((p) => p.id.endsWith('p5'))!
    expect(judge(me, p5)).toMatchObject({ byYou: [], byThem: ['practice'] })
  })
})

const selfWith = (me: Self, asks: Partial<Asks>): Self => ({ ...me, asks: { ...me.asks, ...asks } })

describe('where two sets of answers line up and differ', () => {
  const me = selfOf('three', 'woman')
  const [p1, p2, p3] = peopleFor('woman')

  it('reads only the tester’s own asks, and only a preference can differ', () => {
    expect(compare(me, p1).differ).toEqual([])
    expect(compare(me, p2).differ.map((d) => d.id)).toEqual(['work'])
    expect(compare(me, p3).differ.map((d) => d.id)).toEqual(['practice', 'city', 'work', 'household'])
    for (const p of [p1, p2, p3]) for (const d of compare(me, p).differ) expect(me.asks[d.id].firm).toBe('preference')
  })

  it('attributes each answer to the person who gave it, against what the tester said would work, and shows no number', () => {
    const c = compare(me, p2)
    expect(c.differ[0]).toEqual({ id: 'work', theirs: 'I plan to be at home', preferred: ['A partner who plans to work', 'A partner who is open to working or staying at home'] })
    for (const x of c.lineUp) expect(x.text).not.toMatch(/\d/)
    expect(orList(c.differ[0].preferred)).toBe('“A partner who plans to work” or “A partner who is open to working or staying at home”')
    expect(orList(['A', 'B', 'C'])).toBe('“A”, “B” or “C”')
    expect(orList(['A'])).toBe('“A”')
  })

  // MATCH-02, refinement 1: the comparison is with the answers the tester accepted, not with their own answer.
  describe('regression: a preference is compared with the accepted answers, not with the tester’s own answer', () => {
    it('a different personal answer that the tester accepted still lines up, and is not a difference', () => {
      // Liban said “In one to two years”; the tester said “Within a year”, and accepts both.
      expect(p2.answers.timeline).not.toBe(me.answers.timeline)
      const c = compare(selfWith(me, { timeline: { accept: ['t-year', 't-two'], firm: 'preference' } }), p2)
      expect(c.lineUp.find((x) => x.id === 'timeline')).toMatchObject({ theirs: 'In one to two years' })
      expect(c.differ.map((d) => d.id)).not.toContain('timeline')
    })

    it('the same answer as the tester’s own is still a difference when the tester did not accept it', () => {
      // The tester answers “I plan to work” but would prefer someone “open to either”; Abdi plans to work.
      expect(p1.answers.work).toBe(me.answers.work)
      const c = compare(selfWith(me, { work: { accept: ['w-either'], firm: 'preference' } }), p1)
      expect(c.differ.find((d) => d.id === 'work')).toEqual({ id: 'work', theirs: 'I plan to work', preferred: ['A partner who is open to working or staying at home'] })
      expect(c.lineUp.map((x) => x.id)).not.toContain('work')
    })

    it('reports exactly the answers the tester selected as preferred, in the order the form lists them and not the order they were ticked', () => {
      const c = compare(selfWith(me, { household: { accept: ['h-open', 'h-own'], firm: 'preference' } }), p3)
      expect(c.differ.find((d) => d.id === 'household')!.preferred).toEqual(['A partner who wants us to have our own home', 'A partner who is open to living with family for a time'])
    })
  })

  it('does not compare a point the tester said does not matter', () => {
    const lax: Self = { ...me, asks: { ...me.asks, work: { accept: [], firm: 'any' } } }
    const c = compare(lax, p2)
    expect(c.unused).toEqual(['work'])
    expect([...c.lineUp, ...c.differ].map((x) => x.id)).not.toContain('work')
  })

  it('updates when the answers change', () => {
    // Changing only the tester's own answer changes nothing: the comparison reads what they accepted.
    const edited: Self = { ...me, answers: { ...me.answers, work: 'w-either' } }
    expect(compare(edited, p2).differ.find((d) => d.id === 'work')).toEqual(compare(me, p2).differ.find((d) => d.id === 'work'))
    const accepting: Self = { ...me, asks: { ...me.asks, work: { accept: ['w-work', 'w-either', 'w-home'], firm: 'preference' } } }
    expect(compare(accepting, p2).differ.map((d) => d.id)).toEqual([])
  })
})

describe('fixed pair text', () => {
  const [p1, p2] = peopleFor('woman')
  const me = selfOf('three', 'woman')

  it('is available while the answers equal the scenario it was written for', () => {
    const f = pairFixture(me, 'three', p1)
    expect(f.available).toBe(true)
    if (f.available) {
      expect(f.text.summary).toContain('Abdi')
      expect(f.text.summary).toContain('Abdi chose “Prayer is steady and central to my days”')
      expect(f.text.questions).toHaveLength(3)
    }
  })

  it('is unavailable after any edit to an answer or an ask, rather than saying what the answers no longer say', () => {
    const edited: Self = { ...me, answers: { ...me.answers, work: 'w-home' } }
    expect(pairFixture(edited, 'three', p2)).toEqual({ available: false, reason: 'edited' })
    const loosened: Self = { ...me, asks: { ...me.asks, city: { accept: ['mpls', 'london'], firm: 'preference' } } }
    expect(pairFixture(loosened, 'three', p2)).toEqual({ available: false, reason: 'edited' })
  })

  it('is unavailable for a tester who started with blank answers, and for a person with no text in that scenario', () => {
    expect(pairFixture(me, null, p1)).toEqual({ available: false, reason: 'no-scenario' })
    const [, , , p4] = peopleFor('woman')
    expect(pairFixture(me, 'three', p4)).toEqual({ available: false, reason: 'none-written' })
  })

  it('does not depend on the words, the name or the age, which no pair text mentions', () => {
    // The fingerprint covers only answers and asks.
    expect(fingerprint('woman', me.answers, me.asks)).toBe(fingerprint('woman', { ...me.answers }, { ...me.asks }))
  })

  it('has a text for every person each scenario shows, and none for a person it does not show', () => {
    for (const side of SIDES) {
      for (const sc of SCENARIOS) {
        const self = selfOf(sc.id, side)
        const shown = evaluate(self, peopleFor(side)).shown
        for (const p of shown) expect(pairFixture(self, sc.id, p).available, `${sc.id}/${p.id}`).toBe(true)
      }
    }
  })
})

describe('the hand-written summaries, held against the answers they were written for', () => {
  // The structured facts are metadata the writer keeps beside the prose. These tests catch drift between the
  // prose, the facts and the answers; they cannot show that every sentence is accurate. Each sentence was read
  // against the scenario's answers when it was written, and the claims below pin the specific phrases.
  const cases = SIDES.flatMap((side) =>
    SCENARIOS.flatMap((sc) => {
      const self = selfOf(sc.id, side)
      return evaluate(self, peopleFor(side)).shown.map((p) => ({ side, sc, self, p }))
    }),
  )

  it('every person each scenario shows has a text whose facts match the comparison', () => {
    expect(cases.length).toBeGreaterThan(0)
    for (const { sc, self, p } of cases) {
      const text = pairTextFor(sc.id, p.id)!
      const c = compare(self, p)
      const why = `${sc.id}/${p.id}`
      expect([...text.facts.differs].sort(), why).toEqual(c.differ.map((d) => d.id).sort())
      for (const id of text.facts.same) expect(p.answers[id], `${why} same ${id}`).toBe(self.answers[id])
      for (const id of text.facts.workable) {
        expect(p.answers[id], `${why} workable ${id}`).not.toBe(self.answers[id])
        expect(c.lineUp.map((x) => x.id), `${why} workable ${id}`).toContain(id)
      }
      // No point is claimed twice.
      const all = [...text.facts.same, ...text.facts.workable, ...text.facts.differs]
      expect(new Set(all).size, why).toBe(all.length)
    }
  })

  it('the points a summary names are exactly the points its facts claim', () => {
    const WORDS: Record<(typeof CRITERION_IDS)[number], RegExp> = {
      timeline: /\btiming\b|\btimeline\b/i,
      children: /\bchildren\b/i,
      practice: /\bpractice\b/i,
      city: /\bcity\b|\bToronto\b|\bLondon\b/i,
      work: /\bwork\b|at home/i,
      household: /\bhousehold\b/i,
    }
    for (const [sc, byPerson] of Object.entries(PAIR_TEXT)) {
      for (const [key, text] of Object.entries(byPerson!)) {
        const claimed = new Set([...text.facts.same, ...text.facts.workable, ...text.facts.differs])
        const named = new Set(CRITERION_IDS.filter((id) => WORDS[id].test(text.summary)))
        expect([...named].sort(), `${sc}/${key}`).toEqual([...claimed].sort())
      }
    }
  })

  // Each entry is a sentence of prose and what it says about the answers, written by reading the sentence.
  const CLAIMS: { sc: 'three' | 'one'; key: string; says: string; holds: (self: Self, p: ReturnType<typeof peopleFor>[number]) => boolean }[] = [
    { sc: 'three', key: 'p1', says: 'give the same answers on timing, children, city, work and household', holds: (m, p) => (['timeline', 'children', 'city', 'work', 'household'] as const).every((id) => p.answers[id] === m.answers[id]) },
    { sc: 'three', key: 'p1', says: 'you both want to marry within a year', holds: (m, p) => p.answers.timeline === 't-year' && m.answers.timeline === 't-year' },
    { sc: 'three', key: 'p1', says: 'chose “Prayer is steady and central to my days”, a steadier answer than your “I am building the habit”', holds: (m, p) => p.answers.practice === 'p-steady' && m.answers.practice === 'p-build' },
    { sc: 'three', key: 'p2', says: 'a little later on timing (one to two years, where you said within a year)', holds: (m, p) => p.answers.timeline === 't-two' && m.answers.timeline === 't-year' },
    { sc: 'three', key: 'p2', says: 'open on children where you said you want them', holds: (m, p) => p.answers.children === 'c-open' && m.answers.children === 'c-want' },
    { sc: 'three', key: 'p2', says: 'plans to be at home and you plan to work', holds: (m, p) => p.answers.work === 'w-home' && m.answers.work === 'w-work' },
    { sc: 'three', key: 'p2', says: 'The one difference you marked as a preference is work', holds: (m, p) => compare(m, p).differ.length === 1 && compare(m, p).differ[0].id === 'work' },
    { sc: 'three', key: 'p3', says: 'meets your requirements on timing and children', holds: (m, p) => judge(m, p).byYou.length === 0 && m.asks.timeline.firm === 'requirement' && m.asks.children.firm === 'requirement' },
    { sc: 'three', key: 'p3', says: 'differs from your preferences on practice, city, work and household', holds: (m, p) => compare(m, p).differ.map((d) => d.id).join() === 'practice,city,work,household' },
    { sc: 'three', key: 'p3', says: 'lives in Toronto, where you do not', holds: (m, p) => p.answers.city === 'toronto' && m.answers.city !== 'toronto' },
    { sc: 'one', key: 'p4', says: 'give the same answers on timing, children, city and household', holds: (m, p) => (['timeline', 'children', 'city', 'household'] as const).every((id) => p.answers[id] === m.answers[id]) },
    { sc: 'one', key: 'p4', says: 'chose “I practise occasionally”, where you chose “Prayer is steady and central to my days”, and you marked practice as a preference', holds: (m, p) => p.answers.practice === 'p-occasional' && m.answers.practice === 'p-steady' && m.asks.practice.firm === 'preference' },
  ]

  it.each(SIDES)('the specific claims each summary makes are true of the answers, for a tester who is a %s', (side) => {
    for (const c of CLAIMS) {
      const self = selfOf(c.sc, side)
      const p = peopleFor(side).find((x) => x.id.endsWith(c.key))!
      const f = pairFixture(self, c.sc, p)
      expect(f.available).toBe(true)
      if (f.available) expect(f.text.summary, `${c.sc}/${c.key}`).toContain(c.says)
      expect(c.holds(self, p), `${c.sc}/${c.key}: ${c.says}`).toBe(true)
    }
  })

  it('every sentence-level claim table entry belongs to a text that exists, and every text has at least one claim', () => {
    for (const [sc, byPerson] of Object.entries(PAIR_TEXT)) for (const key of Object.keys(byPerson!)) expect(CLAIMS.some((c) => c.sc === sc && c.key === key), `${sc}/${key}`).toBe(true)
  })
})

describe('contact details', () => {
  it.each(['write me at a.b@example.com', 'call 612 555 0148', '+44 7700 900123', 'find me @hodan_made_up', 'see https://example.com/me', 'www.example.org', 'my site is hodan.com'])(
    'are noticed in %s',
    (text) => expect(looksLikeContact(text)).toBe(true),
  )
  it.each(['I want a calm home.', 'I am 29 and I work.', 'Within a year, in 2 or 3 steps.'])('are not seen in %s', (text) => expect(looksLikeContact(text)).toBe(false))
})

describe('the criteria', () => {
  it('are the six provisional points, each with at least two options, and none of the four that stay conversations', () => {
    expect(CRITERIA.map((c) => c.id)).toEqual([...CRITERION_IDS])
    for (const c of CRITERIA) expect(c.options.length).toBeGreaterThanOrEqual(2)
    const all = JSON.stringify(CRITERIA).toLowerCase()
    for (const banned of ['qabiil', 'clan', 'mahr', 'going back', 'going-back']) expect(all).not.toContain(banned)
  })
})

// MATCH-04: what each line of the fixed text is based on.
//
// These are REFERENCE checks. They show that every cited answer exists, belongs to the person it is attributed to,
// and is the text on screen, and that every quotation in a summary or a question is a label or an exact piece of a
// cited written answer. They do not show that a question follows from what it cites, that it invents no problem or
// motive, or that the prose is accurate: that was read by hand, sentence by sentence (docs/MATCH-PROTOTYPE.md).
describe('what the fixed text is based on (MATCH-04)', () => {
  const quotes = (text: string) => [...text.matchAll(/“([^”]+)”/g)].map((m) => m[1])
  const cases = SIDES.flatMap((side) =>
    SCENARIOS.flatMap((sc) => {
      const self = selfOf(sc.id, side)
      return evaluate(self, peopleFor(side)).shown.map((p) => ({ side, sc, self, p, why: `${side}/${sc.id}/${p.id}` }))
    }),
  )

  it('gives every question a basis or marks it general, and says what each summary draws on', () => {
    expect(cases.length).toBeGreaterThan(0)
    for (const { sc, p, why } of cases) {
      const text = pairTextFor(sc.id, p.id)!
      expect(Array.isArray(text.summaryWords), why).toBe(true)
      expect(text.questions, why).toHaveLength(3)
      for (const q of text.questions) expect(q.basis === 'general' || (Array.isArray(q.basis) && q.basis.length > 0), `${why}: ${q.text}`).toBe(true)
    }
  })

  it('resolves every cited answer from the data, for the person it belongs to', () => {
    for (const { side, sc, self, p, why } of cases) {
      const text = pairFixture(self, sc.id, p)
      if (!text.available) throw new Error(why)
      const raw = pairTextFor(sc.id, p.id)!
      for (const q of raw.questions) {
        if (q.basis === 'general') continue
        // Written answers cited are the other person’s, never the tester’s.
        for (const r of q.basis) if ('words' in r) expect(r.who, `${why}: ${q.text}`).toBe('them')
        const resolved = resolveBasis(q.basis, self, p)
        expect(resolved).toHaveLength(new Set(q.basis.map((r) => ('pick' in r ? r.pick : `w${r.words}`))).size)
        for (const r of resolved) {
          if (r.kind === 'pick') {
            expect(CRITERION_IDS, why).toContain(r.point)
            if (r.you !== undefined) expect(r.you, why).toBe(labelOf(r.point, self.answers[r.point]))
            if (r.them !== undefined) expect(r.them, why).toBe(labelOf(r.point, p.answers[r.point]))
          } else {
            expect(r.text, why).toBe(p.words[r.index])
            expect(r.text.trim(), why).not.toBe('')
            expect(r.prompt, why).toBe(PROMPTS[r.index].short)
            expect(sc.words, `${why}: the tester’s own words are never cited`).not.toContain(r.text)
          }
        }
      }
      expect(side).toBeTruthy()
    }
  })

  it('every quotation in a summary or a question is a cited answer’s label or an exact piece of a cited written answer', () => {
    for (const { sc, self, p, why } of cases) {
      const raw = pairTextFor(sc.id, p.id)!
      const filled = pairFixture(self, sc.id, p)
      if (!filled.available) throw new Error(why)
      const labelsOf = (points: (typeof CRITERION_IDS)[number][]) => points.flatMap((id) => [labelOf(id, self.answers[id]), labelOf(id, p.answers[id])])
      // The summary: labels of the points its facts claim; a quotation from a written answer only if summaryWords names it.
      const claimed = [...raw.facts.same, ...raw.facts.workable, ...raw.facts.differs]
      for (const quote of quotes(filled.text.summary)) {
        if (labelsOf(claimed).includes(quote)) continue
        const from = p.words.findIndex((w) => w.includes(quote))
        expect(from, `${why}: summary quotes “${quote}”`).toBeGreaterThanOrEqual(0)
        expect(raw.summaryWords, `${why}: summary quotes a written answer`).toContain(from)
      }
      // Each question: only what it cites.
      filled.text.questions.forEach((q, i) => {
        const qb = raw.questions[i].basis
        const cited = qb === 'general' ? [] : qb
        const points = cited.flatMap((r) => ('pick' in r ? [r.pick] : []))
        const words = cited.flatMap((r) => ('words' in r ? [p.words[r.words]] : []))
        for (const quote of quotes(q.text)) {
          const ok = labelsOf(points).includes(quote) || words.some((w) => w.includes(quote))
          expect(ok, `${why}: question ${i + 1} quotes “${quote}” without citing it`).toBe(true)
        }
      })
    }
  })

  it('marks exactly the questions that draw on no answer as general, and they quote nothing', () => {
    const general = Object.entries(PAIR_TEXT).flatMap(([sc, by]) =>
      Object.entries(by!).flatMap(([key, t]) => t.questions.flatMap((q, i) => (q.basis === 'general' ? [`${sc}/${key}/${i + 1}`] : []))),
    )
    expect(general.sort()).toEqual(['three/p1/2', 'three/p3/1'])
    for (const by of Object.values(PAIR_TEXT)) for (const t of Object.values(by!)) for (const q of t.questions) if (q.basis === 'general') expect(quotes(q.text)).toEqual([])
  })

  it('writes each line of a basis from the data, and names the points a summary uses in the form’s order', () => {
    const me = selfOf('three', 'woman')
    const [, p2] = peopleFor('woman')
    const [pick] = resolveBasis([{ who: 'you', pick: 'work' }, { who: 'them', pick: 'work' }], me, p2)
    expect(basisLine(pick, p2.firstName)).toBe('Work. You: “I plan to work”. Liban: “I plan to be at home”.')
    const [one] = resolveBasis([{ who: 'them', pick: 'children' }], me, p2)
    expect(basisLine(one, p2.firstName)).toBe('Children. Liban: “I am open to them, and would decide together”.')
    const [words] = resolveBasis([{ who: 'them', words: 0 }], me, p2)
    expect(basisLine(words, p2.firstName)).toBe('Liban’s written answer, Looking for: “I am looking for someone kind and patient who wants to build slowly.”')
    expect(summaryPoints({ same: ['city'], workable: ['timeline'], differs: ['work', 'children'] })).toEqual(['timeline', 'children', 'city', 'work'])
  })

  it('reads the same reference from whichever person it is resolved for', () => {
    const me = selfOf('three', 'woman')
    const [p1, p2] = peopleFor('woman')
    const a = resolveBasis([{ who: 'them', pick: 'work' }], me, p1)[0]
    const b = resolveBasis([{ who: 'them', pick: 'work' }], me, p2)[0]
    expect(a).toMatchObject({ them: 'I plan to work' })
    expect(b).toMatchObject({ them: 'I plan to be at home' })
  })

  // The corrections this change made.
  it('words no practice answer as something a person described, and keeps Yusuf’s answer under Families about family', () => {
    for (const by of Object.values(PAIR_TEXT)) for (const t of Object.values(by!)) expect(t.summary).not.toMatch(/describes? \{his\}|describes? \{her\}/)
    const yusuf = peopleFor('woman')[2]
    expect(PROMPTS[2].short).toBe('Families')
    expect(yusuf.words[2]).toMatch(/\bfamily\b/i)
    expect(yusuf.words[2]).not.toMatch(/honest disagreement/)
    // Nothing new about him: the family idea in his third answer is the one already in his first.
    expect(yusuf.words[0]).toMatch(/\bfamily\b/i)
    expect(yusuf.answers.household).toBe('h-family')
  })
})

// MATCH-04 follow-up: five questions reworded to invite clarification, with the references that support them.
describe('the reworded questions, on both sides', () => {
  const texts = (side: Side, sc: 'three' | 'one', key: string) => {
    const self = selfOf(sc, side)
    const p = peopleFor(side).find((x) => x.id.endsWith(key))!
    const f = pairFixture(self, sc, p)
    if (!f.available) throw new Error(`${side}/${sc}/${key}`)
    return { self, p, q: f.text.questions.map((x) => x.text), raw: PAIR_TEXT[sc]![key].questions }
  }

  const NAMES = { woman: { p1: 'Abdi', p2: 'Liban' }, man: { p1: 'Amina', p2: 'Sahra' } } as const
  it.each(SIDES)('say exactly this, with the right fixture name, for a tester who is a %s', (side) => {
    const n = NAMES[side]
    expect(texts(side, 'three', 'p1').q[0]).toBe('What does prayer look like in an ordinary week for each of you?')
    expect(texts(side, 'three', 'p1').q[2]).toBe(`${n.p1} wrote about families knowing you both while leaving daily decisions to the couple. What would that involvement look like for each of you?`)
    expect(texts(side, 'three', 'p2').q[0]).toBe(`${n.p2} chose “I plan to be at home”. What would you want to understand about that day to day?`)
    expect(texts(side, 'three', 'p2').q[1]).toBe('You chose different marriage timelines. What timing could work for both of you?')
    expect(texts(side, 'one', 'p4').q[1]).toBe('What would each of you want your partner to understand about your practice?')
  })

  it('cite the answers they are about, and nothing else', () => {
    const cites = (key: string, sc: 'three' | 'one', i: number) => JSON.stringify(PAIR_TEXT[sc]![key].questions[i].basis)
    expect(cites('p1', 'three', 0)).toBe(JSON.stringify([{ who: 'you', pick: 'practice' }, { who: 'them', pick: 'practice' }]))
    expect(cites('p1', 'three', 2)).toBe(JSON.stringify([{ who: 'them', words: 2 }]))
    expect(cites('p2', 'three', 0)).toBe(JSON.stringify([{ who: 'them', pick: 'work' }]))
    expect(cites('p2', 'three', 1)).toBe(JSON.stringify([{ who: 'you', pick: 'timeline' }, { who: 'them', pick: 'timeline' }]))
    expect(cites('p4', 'one', 1)).toBe(JSON.stringify([{ who: 'you', pick: 'practice' }, { who: 'them', pick: 'practice' }]))
  })

  // What a question says about the answers is checked in every scenario and on every side where it can render.
  it('say only what the answers say, wherever they render', () => {
    const rendered: string[] = []
    for (const side of SIDES) {
      for (const sc of SCENARIOS) {
        const self = selfOf(sc.id, side)
        for (const p of evaluate(self, peopleFor(side)).shown) {
          const f = pairFixture(self, sc.id, p)
          if (!f.available) continue
          for (const q of f.text.questions) {
            // “Name chose “I plan to be at home”.” is the person’s own answer, under their own name.
            if (q.text === `${p.firstName} chose “I plan to be at home”. What would you want to understand about that day to day?`) {
              rendered.push(`${side}/${sc.id}/${p.id}: home`)
              expect(p.answers.work, `${side}/${sc.id}/${p.id}`).toBe('w-home')
            }
            // Different timelines. Nothing is said about what either asked for.
            if (q.text.startsWith('You chose different marriage timelines.')) {
              rendered.push(`${side}/${sc.id}/${p.id}: timing`)
              expect(p.answers.timeline, `${side}/${sc.id}/${p.id}`).not.toBe(self.answers.timeline)
              expect(q.text).not.toMatch(/asked for|fit/)
            }
            // “Name wrote about families…” is the person’s own written answer about families, under their own name.
            if (q.text.startsWith(`${p.firstName} wrote about families knowing you both while leaving daily decisions to the couple.`)) {
              rendered.push(`${side}/${sc.id}/${p.id}: families`)
              expect(p.words[2]).toBe('I expect our families to know us both well, and to leave the daily decisions to us.')
            }
          }
        }
      }
    }
    // Each renders only in the one sample scenario it was written for, on both sides.
    expect(rendered.sort()).toEqual([
      'man/three/woman-p1: families',
      'man/three/woman-p2: home',
      'man/three/woman-p2: timing',
      'woman/three/man-p1: families',
      'woman/three/man-p2: home',
      'woman/three/man-p2: timing',
    ])
  })

  it('invite clarification: none of the five says a difference is a problem or asks what someone would give up', () => {
    for (const [sc, key, i] of [['three', 'p1', 0], ['three', 'p1', 2], ['three', 'p2', 0], ['three', 'p2', 1], ['one', 'p4', 1]] as const) {
      const text = PAIR_TEXT[sc]![key].questions[i].text
      expect(text, `${sc}/${key}/${i + 1}`).not.toMatch(/\b(problem|issue|conflict|struggle|worry|concern|give up|compromise|sacrifice|disagree)/i)
    }
  })
})
