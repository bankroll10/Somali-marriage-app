import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { fromHerTurn, guideRequest } from '../netlify/functions/guide'
import { buildSystemPrompt, sanitiseContext } from '../netlify/shared/prompt'
import { modes, type CoachContext } from '../src/data/coach'
import { askCoach, fromFirstMessage } from '../src/lib/coach'
import type { CoachMessage } from '../src/types'

/**
 * Trust says "here is exactly what it sends". This is what keeps that word.
 *
 * It was not exact. The Guide's system prompt carried the member's age, her
 * gender, her attachment lean and what she said she feels safe with — the two
 * most clinically sensitive answers in the intake — and up to ten earlier
 * turns of the conversation, none of which the sentence named. Nothing was
 * hidden on purpose; four fields were added to the prompt over time and the
 * disclosure was not (docs/DECISIONS.md, the reality-sprint pass).
 *
 * So the disclosure is checked against the prompt itself rather than against a
 * list someone remembered to update. Every slot the prompt fills is built here
 * with a word Trust must contain; the day a field is added to the prompt, this
 * fails until the sentence names it.
 */

// Collapsed, because the file is wrapped for reading and a sentence in it
// routinely spans three lines.
const trust = readFileSync('src/components/Trust.tsx', 'utf8').replace(/\s+/g, ' ')

/**
 * Each slot, the marker that proves it reached the prompt, and the words Trust
 * has to use for it. Trust speaks to a member, so it says "how you lean in
 * closeness" rather than "attachment lean" — the test asks for the member's
 * words, not the field's.
 */
const SENT: { slot: string; marker: string; named: RegExp }[] = [
  { slot: 'gender', marker: 'woman', named: /whether you are a woman or a man/i },
  { slot: 'scene', marker: 'toronto', named: /your city|city,/i },
  { slot: 'timeline', marker: '1-2', named: /timeline/i },
  { slot: 'practice', marker: 'consistent', named: /where you are in your practice/i },
  { slot: 'faith-role', marker: 'Faith centrality: 4', named: /how central faith is/i },
  { slot: 'family-role', marker: 'guided', named: /family’s role/i },
  { slot: 'children', marker: 'want', named: /children/i },
  { slot: 'attachment', marker: 'anxious', named: /how you lean in closeness/i },
  { slot: 'dealbreakers', marker: 'honesty', named: /your non-negotiables/i },
  { slot: 'hardest-part', marker: 'serious', named: /the hardest part/i },
  { slot: 'stage', marker: 'deciding together', named: /which stage you said you’re at/i },
  { slot: 'readNote', marker: 'a pattern of being kept hidden', named: /if you’ve taken a read/i },
  { slot: 'beforeYesNote', marker: 'agreed on 3 of 11', named: /Before you say yes/i },
]

const ctx = sanitiseContext({
  identity: { firstName: 'Khadija', age: 31, gender: 'woman', scene: 'toronto' },
  answers: {
    timeline: '1-2',
    practice: 'consistent',
    'faith-role': 4,
    'family-role': 'guided',
    children: 'want',
    attachment: 'anxious',
    dealbreakers: ['honesty'],
    'hardest-part': 'serious',
  },
  stage: 'deciding',
  readNote: 'a pattern of being kept hidden; thinnest ground: whether you exist in his life',
  beforeYesNote: 'agreed on 3 of 11; open next: where you would live',
})
const prompt = buildSystemPrompt('auntie', ctx)

describe('what the Guide sends, and what Trust says it sends', () => {
  for (const { slot, marker, named } of SENT) {
    it(`sends ${slot}, and Trust names it`, () => {
      // It really is in the prompt — otherwise this test would pass by
      // describing something the guide no longer does.
      expect(prompt, `${slot} is not in the prompt`).toContain(marker)
      expect(named.test(trust), `${slot} is sent and Trust does not name it`).toBe(true)
    })
  }

  it('never sends her name or her age, even from an older client that still sends both — and never says it does', () => {
    // docs/PRIVACY.md, C5. The guide speaks to "you". Age was asked only by
    // the door, and went with it on 2026-09-24.
    expect(prompt).not.toContain('Khadija')
    expect(prompt).not.toMatch(/\b31\b|30-34|Aged/)
    expect(trust).not.toMatch(/your first name|your age/i)
  })

  it('says the thread goes too, not only the newest message', () => {
    // netlify/functions/guide.ts forwards up to ten prior turns. Trust used to
    // say "your message", singular.
    expect(trust).toMatch(/the earlier messages in that conversation/i)
  })

  it('still names where it goes and what is not kept', () => {
    expect(trust).toMatch(/Claude, made by Anthropic/)
    expect(trust).toMatch(/We don’t store it/)
    expect(trust).toMatch(/Keep the Guide on this device/)
  })

  it('covers every slot the prompt has — no field can be added unnoticed', () => {
    // The prompt renders one labelled line per group of map fields. If a new
    // label appears, this list is out of date and so, probably, is Trust.
    // Only the map block — the lines between the heading that introduces it
    // and the blank line that ends it. The grounding rules below are also
    // "- Label: ..." lines and are the server's own, not the member's.
    const lines = prompt.split('\n')
    const from = lines.findIndex((l) => l.startsWith('THE PERSON YOU ARE GUIDING'))
    const block = lines.slice(from + 1, lines.indexOf('', from + 1))
    const labels = block
      .flatMap((l) => l.split('·'))
      .map((part) => part.replace(/^-\s*/, '').split(':')[0].trim())
      // The first line is the identity line — a side and a city — and each
      // of its fields is covered row by row above.
      .filter((label) => /^[A-Z]/.test(label) && !label.includes(','))
    expect(labels.sort()).toEqual(
      [
        'Attachment lean',
        'Children',
        'Faith centrality',
        'Family involvement',
        'Hardest part right now',
        'Non-negotiables',
        'Practice',
        'Timeline',
      ].sort(),
    )
  })
})

describe('her first name never leaves the phone with the thread', () => {
  // docs/PRIVACY.md, C5. The prompt never carried it, but the thread did: the
  // greeting opens every conversation with her name, and the thread went as
  // history from its first turn (docs/DECISIONS.md, the completion review, B2).
  const her: CoachContext = { identity: { firstName: 'Khadija', gender: 'woman', adult: true }, answers: {} }

  it('no voice’s fallback line uses it, since a fallback sits after her first message', () => {
    for (const mode of modes) {
      expect(mode.greeting(her), mode.id).toContain('Khadija')
      expect(mode.fallback(her), mode.id).not.toContain('Khadija')
    }
  })

  it('sends the thread from her first message, so the greeting stays behind', async () => {
    const bodies: string[] = []
    vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
      bodies.push(String(init.body))
      return new Response('Say it to him plainly.')
    })
    try {
      for (const mode of modes) {
        const thread: CoachMessage[] = [
          { id: 'g', role: 'coach', text: mode.greeting(her) },
          { id: 'u', role: 'user', text: 'He only texts me late at night' },
          { id: 'f', role: 'coach', text: mode.fallback(her) },
        ]
        const reply = await askCoach('What do I say?', her, mode.id, thread)
        expect(reply.live).toBe(true)
      }
    } finally {
      vi.unstubAllGlobals()
    }
    expect(bodies).toHaveLength(modes.length)
    for (const body of bodies) {
      expect(body).not.toContain('Khadija')
      const sent = JSON.parse(body) as { history: { role: string }[] }
      expect(sent.history[0].role).toBe('user')
      expect(sent.history).toHaveLength(2)
    }
  })

  it('sends no history at all before she has written', () => {
    expect(fromFirstMessage([{ id: 'g', role: 'coach', text: 'Salaam, Khadija.' }])).toEqual([])
  })

  it('opens what the model is handed with her, whatever an older client sends', () => {
    // The server's own floor: an old client still sends the greeting, and a
    // trimmed tail can begin with the guide's own words.
    const old = guideRequest('auntie', {}, [
      { role: 'coach', text: 'Kaalay, Khadija. Sit with your auntie a moment.' },
      { role: 'user', text: 'He only texts me late at night' },
      { role: 'coach', text: 'Then ask him why.' },
    ], 'What do I say?')
    expect(old.messages[0].role).toBe('user')
    expect(JSON.stringify(old)).not.toContain('Khadija')
    expect(fromHerTurn([{ role: 'coach', text: 'only me' }])).toEqual([])
    expect(guideRequest('auntie', {}, [], 'hi').messages).toEqual([{ role: 'user', content: 'hi' }])
  })
})
