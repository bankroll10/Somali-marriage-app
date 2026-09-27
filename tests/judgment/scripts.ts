import { CAREFUL_SCRIPT, NONNEG_SCRIPT, scriptFor, type ReadDimension, type Script } from '../../src/data/read'
import { allHad, beforeYesTopics, ownAnswerFirst, sayTheLine, workItOut } from '../../src/data/beforeYes'
import { familyScripts } from '../../src/data/families'
import { modes, type CoachContext } from '../../src/data/coach'
import * as coach from '../../src/lib/coach'
import type { Gender } from '../../src/types'

/**
 * Every set of words Niyyah hands someone to say, enumerated from the real
 * accessors, for both genders (docs/GUIDE-EVAL.md, "Relationship judgment").
 *
 * Nothing here is a copy of the words: each entry reads them from where the
 * app reads them, so a script added to the product is in the registry the day
 * it ships, and ./scripts.test.ts fails until its shape is declared below.
 *
 * The shape is a judgement about what the words are for, made once, by a
 * person, when the script is written:
 *
 *   ask        a real question the listener can answer. Carries a "?".
 *   statement  says a thing plainly: a line, a feeling, news. A question is optional.
 *   confide    to one person who knows her, not to the one she is reading.
 *   close      ends something. Asks nothing.
 *   fill-in    a template she completes: blanks are the point.
 */

export type Shape = 'ask' | 'statement' | 'confide' | 'close' | 'fill-in'
/** Who hears it. The register a sentence needs depends on who it is said to. */
export type Listener = 'partner' | 'family' | 'elder' | 'confidant' | 'self'

export interface ScriptEntry {
  /** Stable id: source, key, gender. */
  id: string
  source: 'read' | 'eleven' | 'families' | 'guide' | 'voice'
  gender: Gender
  shape: Shape
  to: Listener
  words: string
  /** Travels with the words when she sends them (src/lib/words.ts). Empty for the Guide's lines. */
  why: string
  /** Never travels. Empty for the Guide's lines. */
  tells: string
}

// ── Declared shapes ──────────────────────────────────────────────────────────

const READ_SHAPE: Record<ReadDimension | 'early', Shape> = {
  public: 'ask',
  intent: 'ask',
  family: 'ask',
  consistency: 'ask',
  // "Can I tell you something?" then what it is like for her, then what she wants: said, not asked.
  pressure: 'statement',
  early: 'ask',
}

/**
 * Topics whose words say rather than ask. Every other topic opens a
 * conversation with a question.
 */
const ELEVEN_SHAPE: Record<string, Shape> = {
  // Names what to talk about — the wedding, what is realistic, the mahr — and
  // proposes they talk first. An invitation with its agenda, not a question.
  'aroos-mahr:woman': 'statement',
  'aroos-mahr:man': 'statement',
  // His own answer, offered first "so you never have to ask it" (Part 10).
  'second-wife:man': 'statement',
}

const ELEVEN_FIXED: [string, (g: Gender) => Script, Shape, Listener][] = [
  // She asks for time to find her own answer: a request he can say yes or no to.
  ['own-answer-first', ownAnswerFirst, 'ask', 'partner'],
  ['work-it-out', workItOut, 'ask', 'partner'],
  // A line is said once, and never put as a question to bargain over (Part 8).
  ['say-the-line', sayTheLine, 'statement', 'partner'],
  ['all-had', allHad, 'ask', 'partner'],
]

const FAMILY_SHAPE: Record<string, [Shape, Listener]> = {
  'tell-wali-online': ['statement', 'elder'],
  'tell-family-online': ['statement', 'elder'],
  'first-with-hooyo': ['statement', 'elder'],
  // She asks for the step, and asks when if not now: a request, said.
  'send-his-people': ['statement', 'partner'],
  // "My name is ———." His own name, which the product does not have.
  'approach-her-family': ['fill-in', 'elder'],
  'open-mahr-and-living': ['ask', 'partner'],
  'families-meet': ['fill-in', 'elder'],
  'end-it-kindly': ['close', 'partner'],
  'in-laws-after': ['ask', 'partner'],
}

/** The Guide's fixed replies with a "Try:" line, and who the line is for. */
const GUIDE_FIXED: Record<string, [Shape, Listener]> = {
  NO_REPLY: ['close', 'partner'],
  MAHR_OWNER_REPLY: ['statement', 'family'],
  CLAN_RELIGION_REPLY: ['ask', 'elder'],
  DIFFERENCE_REPLY: ['ask', 'partner'],
  // A line, said once: never a question that invites a middle.
  LINE_REPLY: ['statement', 'partner'],
  PROCESS_REPLY: ['ask', 'partner'],
  PRESSURE_REPLY: ['ask', 'family'],
  WENT_DIFFERENTLY_REPLY: ['ask', 'partner'],
}

/** The Guide's replies built from her context, with a "Try:" line. */
const GUIDE_BUILT: Record<string, [Shape, Listener]> = {
  intentReply: ['ask', 'partner'],
  familyYesReply: ['statement', 'family'],
  momentumReply: ['ask', 'partner'],
  countReply: ['ask', 'partner'],
}

/**
 * Every quotation in a voice's answers, classified. A quotation is either words
 * handed over to say (with a shape) or something else, named: her own thought,
 * a hadith, an example of a fact. A new quotation fails ./scripts.test.ts until
 * it is placed here, so words cannot slip into a voice unjudged.
 */
export const VOICE_QUOTES: Record<string, [Shape, Listener] | 'thought' | 'scripture' | 'example' | 'fragment'> = {
  'For me, if this is serious, it goes to my family — that’s how I do things.': ['statement', 'partner'],
  'I want to be upfront — I’m looking for marriage, and I’d like to get to know you for that. Is that what you want too?': ['ask', 'partner'],
  'I’m serious, and I’m taking my time to do it right': ['statement', 'partner'],
  'I’ve come to you because I’m serious about her for marriage, and I want to do this the right way.': ['statement', 'elder'],
  'What matters most to you in the man who marries her?': ['ask', 'elder'],
  'I see this going to marriage. I want to involve our families and take the next step.': ['statement', 'partner'],
  'I need a bit of time to myself — I’ll come back to you.': ['statement', 'partner'],
  'is he perfect?': 'thought',
  'is he good, and is he good *for me*?': 'thought',
  'do I feel butterflies?': 'thought',
  'do we want a life we could both live, and is this someone I respect?': 'thought',
  'this is the fear talking': 'thought',
  'he replied after four hours': 'example',
  'he’s losing interest': 'example',
  'actions are but by intentions.': 'scripture',
  'choose the one of deen, may your hands be dusty': 'scripture',
  'the best of you are best to their families': 'scripture',
  'The most complete of believers in faith are the best of them in character, and the best of you are those best to their wives.': 'scripture',
  'fun,': 'fragment',
}

/** A believable map, for replies built from context. Not scored: it only has to reach every branch that writes words. */
export function contextFor(gender: Gender): CoachContext {
  return {
    identity: { gender, scene: 'twin-cities' } as CoachContext['identity'],
    answers: { timeline: 'within-1', attachment: 'anxious', dealbreakers: ['honesty'] } as CoachContext['answers'],
    stage: 'deciding',
    readNote: 'real signals with one significant gap; thinnest ground: moving toward family',
    beforeYesNote: 'say they agree on five of eleven; not had yet: four; still open: where you’d live; open next: where you’d live',
  }
}

/** Every quotation in every voice's answers, for both genders. */
export function voiceQuotes(gender: Gender): string[] {
  const ctx = contextFor(gender)
  const texts = modes.flatMap((m) => [...m.intents.map((i) => i.respond(ctx)), m.fallback(ctx), m.greeting(ctx)])
  return [...new Set(texts.flatMap((t) => [...t.matchAll(/“([^”]+)”/g)].map((q) => q[1])))]
}

const GENDERS: Gender[] = ['woman', 'man']

function entry(source: ScriptEntry['source'], key: string, gender: Gender, shape: Shape, to: Listener, s: Pick<Script, 'words'> & Partial<Script>): ScriptEntry {
  return { id: `${source}:${key}:${gender}`, source, gender, shape, to, words: s.words, why: s.why ?? '', tells: s.tells ?? '' }
}

/** Unregistered scripts, by id: each needs a shape declared above before the suite passes. */
export const undeclared: string[] = []

function declared<T>(table: Record<string, T>, key: string, id: string): T | undefined {
  if (!(key in table)) undeclared.push(id)
  return table[key]
}

export function registry(): ScriptEntry[] {
  undeclared.length = 0
  const out: ScriptEntry[] = []
  for (const g of GENDERS) {
    for (const key of Object.keys(READ_SHAPE) as (ReadDimension | 'early')[]) out.push(entry('read', key, g, READ_SHAPE[key], 'partner', scriptFor(key, g)))
    out.push(entry('read', 'careful', g, 'confide', 'confidant', CAREFUL_SCRIPT))
    out.push(entry('read', 'nonneg', g, 'statement', 'partner', NONNEG_SCRIPT))

    // Every topic asks: it opens a conversation nobody has had.
    for (const t of beforeYesTopics(g)) out.push(entry('eleven', t.id, g, ELEVEN_SHAPE[`${t.id}:${g}`] ?? 'ask', 'partner', t.script))
    for (const [key, of, shape, to] of ELEVEN_FIXED) out.push(entry('eleven', key, g, shape, to, of(g)))

    for (const f of familyScripts(g)) {
      const d = declared(FAMILY_SHAPE, f.id, `families:${f.id}:${g}`)
      if (d) out.push(entry('families', f.id, g, d[0], d[1], f.script))
    }

    for (const [name, value] of Object.entries(coach)) {
      if (typeof value === 'string' && name.endsWith('_REPLY')) {
        const words = coach.scriptIn(value)
        if (!words) continue
        const d = declared(GUIDE_FIXED, name, `guide:${name}`)
        if (d) out.push(entry('guide', name, g, d[0], d[1], { words }))
      }
      if (typeof value === 'function' && /[a-z]Reply$/.test(name) && value.length === 1 && name !== 'localReply') {
        const words = coach.scriptIn((value as (c: CoachContext) => string)(contextFor(g)))
        if (!words) continue
        const d = declared(GUIDE_BUILT, name, `guide:${name}`)
        if (d) out.push(entry('guide', name, g, d[0], d[1], { words }))
      }
    }

    for (const q of voiceQuotes(g)) {
      const d = declared(VOICE_QUOTES, q, `voice:${q}`)
      if (Array.isArray(d)) out.push(entry('voice', q.slice(0, 40), g, d[0], d[1], { words: q }))
    }
  }
  return out
}

/**
 * Where a detector's rule does not fit a script, by name and with the reason.
 * Kept here, not in the regex, so the exception is read by whoever reads the
 * test, and a new script gets no exemption it was not given.
 */
export const EXEMPT: Record<string, { property: string; why: string }[]> = {
  'families:approach-her-family:man': [
    {
      property: 'NATURAL_REGISTER',
      why: 'Said to her father, the first time they meet, with salaam first. Uncontracted is how respect sounds to an elder here; a casual register would be the error. The sessions decide (docs/PROTOCOL.md Q13).',
    },
  ],
}

export function exempt(e: ScriptEntry, property: string): boolean {
  return (EXEMPT[e.id] ?? []).some((x) => x.property === property)
}
