import { describe, expect, it } from 'vitest'
import * as vocab from '../netlify/shared/vocab'
import * as prompt from '../netlify/shared/prompt'
import { joint } from '../netlify/functions/couple'
import { RUNG_IDS } from '../src/lib/rungs'
import { VIAS } from '../src/lib/entry'
import { LEDGER_IDS } from '../src/lib/ledger'
import { buildReflection } from '../src/lib/reflection'
import { DIMENSION_LABEL, SCRIPTS } from '../src/data/read'
import { STATES, beforeYesTopics } from '../src/data/beforeYes'
import { familyScripts } from '../src/data/families'
import { endingQuestions } from '../src/data/ending'
import { ENDED_REASON_IDS, REASONS_WITH_WHICH, dealbreakerOptions } from '../src/data/ended'
import { modes as MODES } from '../src/data/coach'
import { stages } from '../src/data/stages'
import { scenes } from '../src/data/scenes'
import { COUNTRY_IDS } from '../src/data/countries'
import { REACH_IDS } from '../src/data/reach'
import { hookOptions } from '../src/data/hook'
import { SAFETY_OUTCOMES, SAFETY_REASONS } from '../src/data/safety'
import { ALPHABET as CLIENT_ALPHABET, CODE_LENGTH as CLIENT_CODE_LENGTH } from '../src/lib/code'
import { ALPHABET as SERVER_ALPHABET, CODE_LENGTH as SERVER_CODE_LENGTH } from '../netlify/shared/code'
import { HESITATION_IDS } from '../src/data/hesitation'
import { INSTRUMENT_IDS } from '../src/data/instruments'
import { ASKED } from '../src/lib/facts'

/**
 * The server accepts only words from closed lists, and each list has a twin in
 * src/ that the app is built from. If either side moves without the other, a
 * real person's report is refused for a word the app itself handed her. This
 * fails first.
 */

const sorted = (xs: Iterable<string>) => [...xs].sort()

describe('every word the server accepts is a word the app uses', () => {
  it('the code alphabet and its length — the field can only accept what the server can mint', () => {
    // The alphabet is chosen so nothing in it can be misread off a cracked
    // screen or misheard down a phone: no B against 8, no O or 0, no I or 1.
    // That was the server's secret until the entry field enforced it too
    // (src/lib/code.ts, docs/NORMAN.md), and a second private copy of it used
    // to sit in src/lib/progress.ts. One of them now, held in step here.
    expect(CLIENT_ALPHABET).toEqual(SERVER_ALPHABET)
    expect(CLIENT_CODE_LENGTH).toEqual(SERVER_CODE_LENGTH)
    for (const c of 'BIOLSUVZ01256') expect(CLIENT_ALPHABET).not.toContain(c)
  })

  it('rungs', () => expect(sorted(vocab.RUNGS)).toEqual(sorted(RUNG_IDS)))
  it('vias', () => expect(sorted(vocab.VIAS)).toEqual(sorted(VIAS)))
  it('ledger', () => expect(sorted(vocab.LEDGER)).toEqual(sorted(LEDGER_IDS)))
  it('scenes', () => expect(sorted(vocab.SCENES)).toEqual(sorted(scenes.map((s) => s.id))))

  it('the countries, how far a person would go, and which country each named city is in', () => {
    expect(sorted(vocab.COUNTRIES)).toEqual(sorted(COUNTRY_IDS))
    expect(sorted(vocab.REACH)).toEqual(sorted(REACH_IDS))
    const named = Object.fromEntries(scenes.filter((s) => s.country).map((s) => [s.id, s.country]))
    expect(vocab.SCENE_COUNTRY).toEqual(named)
    // Every city's country is a country the server accepts; only `other` has none.
    for (const s of scenes) {
      if (s.id === 'other') expect(s.country).toBeUndefined()
      else expect(vocab.COUNTRIES.has(s.country!)).toBe(true)
    }
  })
  it('asked — what a person asked, ever', () => expect(sorted(vocab.ASKED)).toEqual(sorted(ASKED)))
  it('hardest parts, plus none', () => expect(sorted(vocab.HOOKS)).toEqual(sorted([...hookOptions.map((h) => h.id), 'none'])))

  it('the map’s seven grounds and their three states', () => {
    const r = buildReflection({})
    expect(sorted(vocab.DIMENSIONS)).toEqual(sorted(r.dimensions.map((d) => d.dimension)))
    for (const d of r.dimensions) expect(vocab.GROUND_STATES.has(d.state)).toBe(true)
  })

  it('the read’s dimensions, and what a read follow-up can be about', () => {
    expect(sorted(vocab.READ_DIMENSIONS)).toEqual(sorted(Object.keys(DIMENSION_LABEL)))
    expect(sorted(vocab.READ_TOPICS)).toEqual(sorted(Object.keys(SCRIPTS)))
  })

  it('the eleven and their four states', () => {
    expect(sorted(vocab.TOPICS)).toEqual(sorted(beforeYesTopics('woman').map((t) => t.id)))
    expect(sorted(vocab.TOPICS)).toEqual(sorted(beforeYesTopics('man').map((t) => t.id)))
    expect(sorted(vocab.YES_STATES)).toEqual(sorted(STATES.map((s) => s.id)))
  })

  it('every joint the couple function can produce', () => {
    const states = [...vocab.YES_STATES] as Parameters<typeof joint>[0][]
    const produced = new Set<string>()
    for (const a of states) for (const b of states) produced.add(joint(a, b))
    expect(sorted(vocab.JOINTS)).toEqual(sorted(produced))
  })

  it('the guide\u2019s five voices, and the copy the prompt speaks them in', () => {
    // The prompt lives on the server now (netlify/shared/prompt.ts), so the
    // voices and the stage lines have a second copy. These are the two halves
    // of the same words; a change to either without the other would put a
    // persona on the screen that the model was never given.
    expect(sorted(vocab.GUIDE_MODES)).toEqual(sorted(MODES.map((m) => m.id)))
    for (const m of MODES) {
      expect(prompt.MODE_VOICE[m.id], m.id).toEqual({
        label: m.label,
        tagline: m.tagline,
        description: m.description,
      })
    }
    expect(sorted(vocab.STAGES)).toEqual(sorted(stages.map((s) => s.id)))
    for (const s of stages) {
      expect(prompt.STAGE_FOCUS[s.id], s.id).toEqual({ label: s.label, focus: s.focus })
    }
  })

  it('the family scripts, for both of them', () => {
    const ids = new Set([...familyScripts('woman'), ...familyScripts('man')].map((s) => s.id))
    expect(sorted(vocab.FAMILY_SCRIPT_IDS)).toEqual(sorted(ids))
  })

  it('the three closed questions on the way out', () => {
    const q = Object.fromEntries(endingQuestions('woman').map((q) => [q.id, q.options.map((o) => o.id)]))
    expect(sorted(vocab.WHO)).toEqual(sorted(q.who))
    expect(sorted(vocab.MATTERED)).toEqual(sorted(q.mattered))
    expect(sorted(vocab.USED)).toEqual(sorted(q.used))
  })

  it('the reasons a courtship can end, and the non-negotiables they may name', () => {
    expect(sorted(vocab.ENDED_REASONS)).toEqual(sorted(ENDED_REASON_IDS))
    expect(sorted(vocab.DEALBREAKERS)).toEqual(sorted(dealbreakerOptions().map((o) => o.id)))
    expect(sorted(Object.keys(vocab.ENDED_WHICH))).toEqual(sorted(REASONS_WITH_WHICH))
    expect(sorted(vocab.ENDED_STAGES)).toEqual(['deciding', 'talking'])
  })

  it('a conversation can be confirmed under every source but the guide', () => {
    expect(sorted(Object.keys(vocab.THROUGH_TOPICS))).toEqual(['beforeYes', 'couple', 'family', 'read'])
  })

  it('the reasons a safety report can give', () => {
    expect(sorted(vocab.SAFETY_REASONS)).toEqual(sorted(SAFETY_REASONS.map((r) => r.id)))
    expect(sorted(vocab.SAFETY_OUTCOMES)).toEqual(sorted(SAFETY_OUTCOMES.map((r) => r.id)))
  })

  it('the reasons someone can give for stopping at the door', () => {
    expect(sorted(vocab.HESITATIONS)).toEqual(sorted(HESITATION_IDS))
  })

  it('the four questionnaires a person can begin', () => {
    expect(sorted(vocab.INSTRUMENTS)).toEqual(sorted(INSTRUMENT_IDS))
  })
})
