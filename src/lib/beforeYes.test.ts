import { describe, expect, it } from 'vitest'
import { beforeYesSummary, buildBeforeYes } from './beforeYes'
import { BEFORE_YES_COUNT, LINE, STATES, allHad, beforeYesTopics, pickedOf, sayTheLine, sheetOf, workItOut, yourSideLine } from '../data/beforeYes'

/**
 * Before you say yes tells a woman which conversation to open with a real man.
 * As with the Read, what matters most is what it is structurally unable to say.
 */

const IDS = beforeYesTopics('woman').map((t) => t.id)
const all = (state: string) => Object.fromEntries(IDS.map((id) => [id, state]))
const answers = (over: Record<string, string> = {}) => ({ ...all('agree'), ...over })

function prose(r: ReturnType<typeof buildBeforeYes>): string {
  if (!r) return ''
  const notes = Object.values(r.byState).flatMap((xs) => xs.map((x) => x.note))
  return [r.headline, r.summary, r.open.why, r.open.script.why, r.open.script.words, r.open.script.tells, ...notes]
    .join(' ')
    .toLowerCase()
}

describe('what it refuses to say', () => {
  const banned = [
    'good man', 'bad man', 'a player', 'red flag', 'he loves you', "he doesn't love you",
    'leave him', 'dump him', 'end it', 'walk away', 'you deserve better',
    'you should marry', 'do not marry', "don't marry", 'call it off', 'not right for you', 'dealbreaker',
  ]
  const cases = [
    answers(),
    all('not-talked'),
    all('differ'),
    all('settled'),
    all('unknown'),
    answers({ live: 'differ', 'second-wife': 'differ', qabiil: 'not-talked' }),
    answers({ 'money-home': 'unknown' }),
  ]
  it('never judges him or tells her to stay or go when she has named a line, or all eleven', () => {
    for (const lines of [['second-wife'], IDS]) {
      const a = lines.length === IDS.length ? all('differ') : answers({ 'second-wife': 'differ' })
      const text = prose(buildBeforeYes(a, 'woman', lines))
      for (const phrase of banned) expect(text).not.toContain(phrase)
    }
  })
  it('never judges him, and never tells her to stay or go', () => {
    for (const a of cases) {
      const text = prose(buildBeforeYes(a))
      for (const phrase of banned) expect(text, JSON.stringify(a)).not.toContain(phrase)
    }
  })

  it('never puts a digit in front of her — counts are spelled out', () => {
    for (const a of cases) expect(prose(buildBeforeYes(a))).not.toMatch(/\d/)
  })
})

describe('what it needs', () => {
  it('needs every conversation answered before it says anything', () => {
    const partial = answers()
    delete (partial as Record<string, string>).qabiil
    expect(buildBeforeYes(partial)).toBeNull()
  })
  it('rejects an answer it does not recognise', () => {
    expect(buildBeforeYes(answers({ live: 'maybe' }))).toBeNull()
  })
  it('asks the same conversations of everyone', () => {
    expect(beforeYesTopics('woman')).toHaveLength(BEFORE_YES_COUNT)
    expect(beforeYesTopics('man')).toHaveLength(BEFORE_YES_COUNT)
  })
})

describe('which one to open', () => {
  it('a disagreement about where you would live outranks an unasked question about the wedding', () => {
    const r = buildBeforeYes(answers({ live: 'differ', 'aroos-mahr': 'not-talked' }))!
    expect(r.open.id).toBe('live')
  })
  it('an unasked question about where you would live outranks a disagreement about the wedding', () => {
    const r = buildBeforeYes(answers({ live: 'not-talked', 'aroos-mahr': 'differ' }))!
    expect(r.open.id).toBe('live')
  })
  it('a disagreement about a second wife outranks an unasked question about money', () => {
    const r = buildBeforeYes(answers({ 'second-wife': 'differ', 'money-home': 'not-talked' }))!
    expect(r.open.id).toBe('second-wife')
  })
  it('when she does not know her own answer, the words are for herself first', () => {
    const r = buildBeforeYes(answers({ 'money-home': 'unknown' }))!
    expect(r.open.id).toBe('money-home')
    expect(r.open.script.words).toMatch(/come back to it in a week/i)
    expect(r.summary).toMatch(/starts with you, not him/i)
  })
  it('when everything is agreed, it still ends in words — to revisit, not to celebrate', () => {
    const r = buildBeforeYes(answers())!
    expect(r.headline).toMatch(/you agree on every one/i)
    expect(r.open.script.words).toMatch(/go back over/i)
  })
})

describe('the headline is about the conversations, never about him', () => {
  it('names one open difference as one conversation still open', () => {
    const r = buildBeforeYes(answers({ live: 'differ' }))!
    expect(r.headline).toBe('One conversation is still open between you.')
  })
  it('names two as two', () => {
    const r = buildBeforeYes(answers({ live: 'differ', 'second-wife': 'differ' }))!
    expect(r.headline).toBe('Two conversations are still open between you.')
  })
  it('never says a difference is on its way to agreement — no "yet", no "line up" (docs/DECISIONS.md Part 8)', () => {
    for (const r of [buildBeforeYes(answers({ live: 'differ' }))!, buildBeforeYes(answers({ live: 'settled', work: 'differ' }))!]) {
      expect(r.headline).not.toMatch(/\byet\b|line up|crossed/i)
    }
  })
  it('never calls a difference light — the wedding and the mahr read like any other (docs/PRODUCT.md S6)', () => {
    const light = buildBeforeYes(answers({ 'aroos-mahr': 'differ' }))!
    const heavy = buildBeforeYes(answers({ live: 'differ' }))!
    expect(light.headline).toBe(heavy.headline)
    expect(light.headline).not.toMatch(/mostly|weight|heav/i)
  })
  it('says nothing is still open when nothing has been talked about', () => {
    const r = buildBeforeYes(all('not-talked'))!
    expect(r.headline).toMatch(/nothing you have talked about is still open/i)
    expect(r.summary).toMatch(/eleven you haven’t had yet/i)
  })
})

describe('her own answers, read back', () => {
  it('states each conversation as a fact from her side', () => {
    const r = buildBeforeYes(answers({ qabiil: 'not-talked', work: 'differ' }))!
    expect(r.byState['not-talked'][0].note).toBe('you have not talked about qabiil')
    expect(r.byState.differ[0].note).toMatch(/whether you’d work, and it is still open between you/)
  })
  it('gives two different women two different readings', () => {
    const a = buildBeforeYes(answers({ live: 'differ' }))!
    const b = buildBeforeYes(answers({ 'going-back': 'not-talked', children: 'unknown' }))!
    expect(a.summary).not.toEqual(b.summary)
    expect(a.open.script.words).not.toEqual(b.open.script.words)
  })
  it('every conversation ends in words she can say', () => {
    for (const t of beforeYesTopics('woman')) {
      expect(t.script.words.length, t.id).toBeGreaterThan(60)
      expect(t.script.tells.length, t.id).toBeGreaterThan(40)
      expect(t.why.length, t.id).toBeGreaterThan(60)
    }
  })
})

describe('a man reading a woman', () => {
  it('flips every pronoun and leaves no token behind', () => {
    const text = beforeYesTopics('man')
      .map((t) => `${t.label} ${t.prompt} ${t.why} ${t.script.why} ${t.script.words} ${t.script.tells}`)
      .join(' ')
    expect(text).not.toMatch(/\bhe\b|\bhim\b|\bhis\b|\bhimself\b/)
    expect(text).toMatch(/\bshe\b/)
    expect(text).not.toMatch(/\{/)
  })
  it('reads for him too', () => {
    const r = buildBeforeYes(answers({ live: 'unknown' }), 'man')!
    expect(r.summary).toMatch(/starts with you, not her/i)
  })
  it('asks a man about a second wife as the one who would take one', () => {
    const his = beforeYesTopics('man').find((t) => t.id === 'second-wife')!
    expect(his.prompt).toMatch(/what you believe/i)
    expect(his.script.words).toMatch(/what I want for my own life/i)
    const hers = beforeYesTopics('woman').find((t) => t.id === 'second-wife')!
    expect(hers.script.words).toMatch(/would you ever want a second wife/i)
  })
})

describe('what the Guide is told', () => {
  it('is one short line with no detail a stranger could use', () => {
    const r = buildBeforeYes(answers({ live: 'differ', 'money-home': 'not-talked' }))!
    const s = beforeYesSummary(r)
    expect(s).toMatch(/^agreed on nine of eleven; still open: where you’d live; open next: where you’d live$/)
    expect(s.length).toBeLessThan(120)
    expect(s).not.toMatch(/\d/)
  })
})

// Moved from tests/alignment-audit.test.ts (docs/PRODUCT.md), when matching went.
describe('Before you say yes never ranks a difference as a light one', () => {
  it('a single difference on qabiil is named, not weighed', () => {
    const topics = beforeYesTopics('woman')
    const answers = Object.fromEntries(topics.map((t) => [t.id, t.id === 'qabiil' ? 'differ' : 'agree']))
    const r = buildBeforeYes(answers)!
    expect(r.headline).not.toMatch(/weight|heav|light|mostly/i)
    expect(r.headline).toMatch(/one/i)
  })

  it('all eleven agreed is said as what it is, without a statistic about other couples', () => {
    const topics = beforeYesTopics('woman')
    const r = buildBeforeYes(Object.fromEntries(topics.map((t) => [t.id, 'agree'])))!
    expect(r.headline).not.toMatch(/most couples/i)
  })
})

describe('a difference the two of you have worked out', () => {
  it('ranks below every conversation not yet had, and above nothing agreed', () => {
    // Where you'd live carries the most; settled there still waits behind an
    // unasked question about the wedding, which carries the least.
    const r = buildBeforeYes(answers({ live: 'settled', 'aroos-mahr': 'not-talked' }))!
    expect(r.open.id).toBe('aroos-mahr')
  })
  it('is not reopened ahead of anything, and not counted as open', () => {
    const r = buildBeforeYes(answers({ 'money-home': 'settled' }))!
    expect(r.counts.differ).toBe(0)
    expect(r.counts.settled).toBe(1)
    expect(r.byState.settled[0].note).toBe('you see money sent home differently, and have worked out how to live with it')
  })
  it('counts as had: agreed and arranged together end in going back over them', () => {
    const r = buildBeforeYes(answers({ 'money-home': 'settled', work: 'settled' }))!
    expect(r.allHad).toBe(true)
    expect(r.headline).toBe('You have had all eleven. Where you see things differently, you have worked out how.')
    expect(r.open.id).toBe('money-home')
    expect(r.open.script.words).toMatch(/go back over/i)
  })
  it('an open difference still comes first — it is the one conversation started and not finished', () => {
    const r = buildBeforeYes(answers({ 'aroos-mahr': 'differ', live: 'settled', work: 'not-talked' }))!
    expect(r.open.id).toBe('aroos-mahr')
  })
})

describe('after a difference, the words are for after a difference', () => {
  it('an open difference is not handed the words that open a conversation nobody has had', () => {
    const r = buildBeforeYes(answers({ 'second-wife': 'differ' }))!
    expect(r.open.id).toBe('second-wife')
    expect(r.open.script.words).toBe(workItOut('woman').words)
    expect(r.open.script.words).not.toBe(beforeYesTopics('woman').find((t) => t.id === 'second-wife')!.script.words)
  })
  it('asks what each could not live with before any middle', () => {
    const w = workItOut('woman')
    const couldnt = w.words.indexOf('couldn’t live with')
    expect(couldnt).toBeGreaterThan(-1)
    expect(couldnt).toBeLessThan(w.words.indexOf('a way of doing it'))
    expect(w.tells).toMatch(/that is a line, and it is allowed to be one/)
    // How, not only what: a way to stop that comes back (docs/DECISIONS.md Part 9).
    expect(w.tells).toMatch(/If it gets heated, you can stop/)
    expect(w.tells).toMatch(/and then come back to it/)
  })
  it('reads the same from a man, with her in it', () => {
    expect(workItOut('man').tells).toMatch(/whether she can name what she couldn’t live with/)
  })
})

describe('a line she has named', () => {
  it('is never the conversation to open, even where it carries the most', () => {
    const r = buildBeforeYes(answers({ 'second-wife': 'differ', 'aroos-mahr': 'not-talked' }), 'woman', ['second-wife'])!
    expect(r.open.id).toBe('aroos-mahr')
    expect(r.open.script.words).not.toBe(workItOut('woman').words)
  })
  it('is listed as hers, and not as a difference still open', () => {
    const r = buildBeforeYes(answers({ 'second-wife': 'differ', work: 'differ' }), 'woman', ['second-wife'])!
    expect(r.lines.map((l) => l.id)).toEqual(['second-wife'])
    expect(r.byState.differ.map((l) => l.id)).toEqual(['work'])
    expect(r.counts.differ).toBe(1)
    expect(r.lines[0].note).toBe('you have talked about a second wife, and it is a line for you')
  })
  it('is named first, as what she said, and the summary says it will not be handed back', () => {
    const r = buildBeforeYes(answers({ 'second-wife': 'differ', work: 'differ' }), 'woman', ['second-wife'])!
    expect(r.headline).toBe('You’ve named one line the two of you don’t share.')
    expect(r.summary).toMatch(/A line is not on this list to be worked out, and nothing here will hand it back to you as the conversation to open\./)
  })
  it('counts as had: with everything else agreed or worked out, what is left is going back over them', () => {
    const r = buildBeforeYes(answers({ 'second-wife': 'differ', 'money-home': 'settled' }), 'woman', ['second-wife'])!
    expect(r.allHad).toBe(true)
    expect(r.open.id).toBe('money-home')
    expect(r.open.script.words).toBe(allHad('woman').words)
  })
  it('when all eleven are lines, there is nothing to open — only the words for saying one plainly', () => {
    const r = buildBeforeYes(all('differ'), 'woman', IDS)!
    expect(r.lines).toHaveLength(IDS.length)
    expect(r.open.script.words).toBe(sayTheLine('woman').words)
    expect(r.summary).toMatch(/There is nothing here to open/)
  })
  it('is only ever a difference — a stale line on a topic now agreed is ignored', () => {
    const r = buildBeforeYes(answers(), 'woman', ['second-wife'])!
    expect(r.lines).toHaveLength(0)
    expect(r.headline).toMatch(/agree on every one/)
  })
  it('says it plainly, once, and never asks her to bend it', () => {
    const w = sayTheLine('woman')
    expect(w.words).toMatch(/This one is a line for me/)
    expect(w.words).toMatch(/not asking you to meet me halfway/)
    expect(w.tells).toMatch(/You are not listening for agreement/)
    expect(sayTheLine('man').tells).toMatch(/If she asks you to give it up/)
  })
})

describe('a line lives only on her phone, as she answered it', () => {
  it('splits into a plain difference and her own list when saved', () => {
    expect(sheetOf({ 'second-wife': LINE, live: 'agree', work: 'settled' })).toEqual({
      answers: { 'second-wife': 'differ', live: 'agree', work: 'settled' },
      lines: ['second-wife'],
    })
  })
  it('comes back as she answered it', () => {
    const picked = { 'second-wife': LINE, live: 'agree', work: 'differ' }
    expect(pickedOf(sheetOf(picked))).toEqual(picked)
  })
})

describe('what the guide is told about differences', () => {
  it('says which are worked out and which is a line, so it never coaches a line toward a middle', () => {
    const r = buildBeforeYes(answers({ 'money-home': 'settled', work: 'differ', 'second-wife': 'differ', qabiil: 'differ' }), 'woman', ['second-wife', 'qabiil'])!
    const s = beforeYesSummary(r)
    expect(s).toBe('agreed on seven of eleven; worked out one; still open: whether you’d work; a line for them: qabiil and one more; open next: whether you’d work')
    expect(s.length).toBeLessThan(200)
  })
})

describe('family, read the right way round (docs/DECISIONS.md Part 10)', () => {
  it('asks a man about his own mother in the house, not hers', () => {
    expect(beforeYesTopics('man').find((t) => t.id === 'live')!.prompt).toMatch(/whether with your mother/)
    expect(beforeYesTopics('woman').find((t) => t.id === 'live')!.prompt).toMatch(/whether with his mother/)
  })
  it('reads "involved once serious" back as what she chose, not as an authority she never named', () => {
    const t = beforeYesTopics('woman').find((t) => t.id === 'families-disagree')!
    expect(t.yourSide!.lines.guided).toBe('You told your map you want family involved once it is serious.')
    expect(t.yourSide!.lines.guided).not.toMatch(/decide/)
  })
})

describe('her own side, from her map', () => {
  const live = beforeYesTopics('woman').find((t) => t.id === 'live')!
  it('shows for the answer the map stores as Flexible — capital F — too', () => {
    expect(yourSideLine(live, { household: 'Flexible' })).toBe('You told your map you are flexible on where you’d live.')
    expect(yourSideLine(live, { household: 'with-family' })).toMatch(/one household/)
    expect(yourSideLine(live, {})).toBeUndefined()
  })
})

describe('the eleven questions, read by both sides (Part 13)', () => {
  it('never asks what only one side assumes, expects or plans', () => {
    for (const t of beforeYesTopics('woman')) expect(t.prompt, t.id).not.toMatch(/\b(he|she) (assumes|expects|plans)\b/i)
  })

  it('asks for agreement each could say back, and counts part of a topic as not talked', () => {
    const state = (id: string) => STATES.find((s) => s.id === id)!
    expect(state('agree').hint).toMatch(/each say what you agreed/i)
    expect(state('not-talked').hint).toMatch(/part of it/i)
  })
})
