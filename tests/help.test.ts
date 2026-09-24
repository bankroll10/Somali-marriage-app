import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { COUNTRY_IDS } from '../src/data/countries'
import { HELP, dial } from '../src/data/help'
import { SAFETY_REPLY, askCoach, needsCrisisLine, needsHelpLine } from '../src/lib/coach'
import { buildSystemPrompt, sanitiseContext } from '../netlify/shared/prompt'

/**
 * Somewhere to go when it cannot wait a week (docs/ABUSE.md). Before this
 * there was no emergency number or helpline anywhere in the app, on a report
 * screen whose second reason is a threat, under a read whose caution band
 * said "not a question for an app" and gave no line to call, and behind a
 * guide whose offline voice answered "he threatened me" like a question about
 * late-night texting.
 */

const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

describe('the help directory', () => {
  it('has a row for every country she can pick, and no other', () => {
    expect(Object.keys(HELP).sort()).toEqual([...COUNTRY_IDS].sort())
  })

  it('names an emergency number and a free line for every real country but one', () => {
    // Somalia's numbers differ by region and by source; a number that may ring
    // nowhere is worse than the generic line (src/data/help.ts).
    for (const id of [...COUNTRY_IDS].filter((c) => c !== 'other' && c !== 'so')) {
      expect(HELP[id].emergency, id).toMatch(/^\d{3}$/)
      expect(HELP[id].line?.number, id).toMatch(/^[\d -]+$/)
    }
  })

  it('names a crisis line for every real country but one, and the hours where it is not always open', () => {
    // Checked 2026-09-24 for the Guide's evaluation (docs/GUIDE-EVAL.md).
    for (const id of [...COUNTRY_IDS].filter((c) => c !== 'other' && c !== 'so')) {
      expect(HELP[id].crisis?.number, id).toMatch(/^\+?[\d ]+$/)
    }
    expect(HELP.dk.crisis?.hours).toBeTruthy()
    expect(HELP.ke.crisis?.hours).toBeTruthy()
    expect(HELP.ae.crisis?.hours).toBeTruthy()
  })

  it('dials what it shows', () => {
    expect(dial('1-800-799-7233')).toBe('tel:18007997233')
    expect(dial('0808 2000 247')).toBe('tel:08082000247')
  })
})

describe('where the line is shown', () => {
  it('on the report, and on the read’s caution card', () => {
    expect(src('src/components/ReportConcern.tsx')).toMatch(/<HelpLine /)
    expect(src('src/components/Read.tsx')).toMatch(/<HelpLine urgent/)
  })

  it('the crisis line under a guide answer to thoughts of suicide or self-harm', () => {
    expect(src('src/components/Coach.tsx')).toMatch(/<HelpLine kind="crisis"/)
    expect(needsCrisisLine('I have been thinking about ending my life')).toBe(true)
    expect(needsCrisisLine('I have been hurting myself since the engagement ended')).toBe(true)
    expect(needsCrisisLine('he is killing me with these late replies')).toBe(false)
  })

  it('under a guide answer to a threat, a money ask or force', () => {
    expect(src('src/components/Coach.tsx')).toMatch(/needsHelpLine\(messages\[i - 1\]\.text\)/)
  })
})

describe('the guide', () => {
  const hers = [
    'he threatened me when I said no',
    'he asked me for money for his ticket',
    'my family is forcing me to marry him',
    'he says he will send pictures of me to my brother',
    'she wants me to invest in her cousin’s business before we meet',
  ]
  const ordinary = ['is he serious or just passing time?', 'he only texts me late at night', 'how do I bring my family in?', 'am I being too picky?']

  it('knows the words, as whole words', () => {
    for (const m of hers) expect(needsHelpLine(m), m).toBe(true)
    for (const m of ordinary) expect(needsHelpLine(m), m).toBe(false)
  })

  it('answers them offline with the safety reply, in every voice, before any voice’s own intents', async () => {
    for (const mode of ['auntie', 'brother', 'islamic'] as const) {
      const reply = await askCoach('he threatened me when I said no', { identity: {}, answers: {}, onDeviceOnly: true } as never, mode)
      expect(reply.text).toBe(SAFETY_REPLY)
    }
  })

  it('offers no way to close the conversation under a crisis', async () => {
    const reply = await askCoach('I want to die', { identity: {}, answers: {}, onDeviceOnly: true } as never, 'auntie')
    expect(reply.closers).toEqual([])
  })

  it('never puts a number in its own words — the checked ones go beneath', () => {
    expect(SAFETY_REPLY).not.toMatch(/\d{3}/)
    const prompt = buildSystemPrompt('auntie', sanitiseContext({ identity: { gender: 'woman' }, answers: {}, stage: 'talking' }))
    expect(prompt).toMatch(/Never state a phone number/)
    expect(prompt).toMatch(/pattern romance scams follow/)
    expect(prompt).toMatch(/forced or pressured to marry/)
    expect(prompt).toMatch(/Never help anyone find, follow, watch, expose or pressure another person/)
  })
})
