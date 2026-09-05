import { describe, expect, it } from 'vitest'
import * as vocab from '../netlify/shared/vocab'
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
import { scenes } from '../src/data/scenes'
import { hookOptions } from '../src/data/hook'

/**
 * The server accepts only words from closed lists, and each list has a twin in
 * src/ that the app is built from. If either side moves without the other, a
 * real person's report is refused for a word the app itself handed her. This
 * fails first.
 */

const sorted = (xs: Iterable<string>) => [...xs].sort()

describe('every word the server accepts is a word the app uses', () => {
  it('rungs', () => expect(sorted(vocab.RUNGS)).toEqual(sorted(RUNG_IDS)))
  it('vias', () => expect(sorted(vocab.VIAS)).toEqual(sorted(VIAS)))
  it('ledger', () => expect(sorted(vocab.LEDGER)).toEqual(sorted(LEDGER_IDS)))
  it('scenes', () => expect(sorted(vocab.SCENES)).toEqual(sorted(scenes.map((s) => s.id))))
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
})
