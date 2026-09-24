// @vitest-environment happy-dom
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import Ending from '../src/components/Ending'
import Plus from '../src/components/Plus'
import { modes } from '../src/data/coach'
import { freeForever, paidLater, promises } from '../src/data/plus'
import { stages } from '../src/data/stages'
import { buildEnding } from '../src/lib/ending'
import { RUNGS } from '../netlify/shared/vocab'
import { audit } from './support/a11y'
import { mount, type Mounted } from './support/render'

/**
 * What may be sold, to whom, when — held to docs/MONETIZATION.md.
 *
 * The audit's decisions are only worth what stops them drifting back. Every
 * one of these was, at some point, the other way round in this repository: a
 * paid line that bundled two free things, a badge that said "bought once" of a
 * fee a family pays at a wedding, a money ask on the screen a marriage is
 * reported from. Nothing here tests a price, because there is none: prices are
 * a prediction in docs/STRATEGY.md until a gate in docs/MONETIZATION.md passes.
 */

let screen: Mounted | undefined
afterEach(() => {
  screen?.unmount()
  screen = undefined
})

/** Pricing by time or by use — the mechanism that earns more from a worse night, or from staying. */
const METERED = /\b(per|a|each|every) (month|week|year|day|reply|message|introduction|hour)\b|\bmonthly\b|\bunlimited\b|\bsubscri|\btrial\b|\brenew/i

/** The free things, by the words a paid line would have to use to sell them. */
const FREE_THINGS = /\beleven\b|joint view|family (scripts|words|conversations)|\bscripts?\b|\bvouch|\breport|\brepl(y|ies)\b|\bprivacy\b|being introduced/i

describe('every paid line says who pays, when, and after what', () => {
  it('names a payer, a moment and a rung that has already happened', () => {
    expect(paidLater.length).toBeGreaterThan(0)
    for (const item of paidLater) {
      expect(item.who, item.title).toBeTruthy()
      expect(item.when, item.title).toBeTruthy()
      // After what value: a real rung, and never the first ones — nothing is
      // asked of a person who has only arrived or only built her map.
      expect(RUNGS.has(item.after), `${item.title}: ${item.after} is not a rung`).toBe(true)
      expect(['arrived', 'situated', 'mapped', 'kept', 'read', 'eleven']).not.toContain(item.after)
      expect(item.badge, item.title).toBeTruthy()
    }
  })

  it('what a family pays, or a guest gives, is never called something the member buys', () => {
    for (const item of paidLater.filter((i) => i.who !== 'the two of you')) {
      expect(item.badge, item.title).not.toMatch(/bought|buy/i)
      expect(item.body, item.title).not.toMatch(/\bbought\b/i)
    }
  })

  it('nothing is priced by time or by use', () => {
    for (const item of paidLater) {
      for (const text of [item.title, item.body, item.when, item.badge]) {
        expect(text, item.title).not.toMatch(METERED)
      }
    }
  })

  it('no paid line sells anything the free list gives away', () => {
    // The call used to be "Deciding together": "the two-sided eleven, the
    // family scripts, and one call" — two of three already free. What is sold is only what is
    // not on the free list.
    expect(freeForever.join(' ')).toMatch(/eleven/)
    for (const item of paidLater) {
      expect(item.body, item.title).not.toMatch(FREE_THINGS)
    }
  })

  it('the stage product earns nothing from a courtship that ends', () => {
    const deciding = paidLater.find((i) => i.who === 'the two of you')
    expect(deciding?.after).toBe('he-answered')
    expect(deciding?.body).toMatch(/once per person, for life/i)
    expect(deciding?.body).toMatch(/next one’s conversation is free/i)
    expect(deciding?.body).not.toMatch(/per courtship|for one courtship/i)
  })

  it('a family’s payment is fixed in advance, owed only at a nikah, and buys no say', () => {
    const matchmaker = paidLater.find((i) => i.who === 'the families')
    expect(matchmaker?.after).toBe('married')
    expect(matchmaker?.body).toMatch(/agreed before anyone is introduced/)
    expect(matchmaker?.body).toMatch(/nothing is owed/i)
    expect(matchmaker?.body).toMatch(/no say/)
  })

  it('a paid line never carries the name of a stage she declares', () => {
    // The stage "Deciding together" is free and measured (docs/BOARD.md,
    // decision 16); a product by the same name made the free stage, on Home,
    // read as the thing listed under "What will cost money".
    const names = stages.map((s) => s.label.toLowerCase())
    for (const item of paidLater) expect(names).not.toContain(item.title.toLowerCase())
  })

  it('the guide never sells: no voice mentions a payment, a price or a paid line', () => {
    // The guide is the thing members trust most and the one with a voice
    // called "Matchmaker". The day it says a human one costs money, the advice
    // is a funnel (docs/MONETIZATION.md, the incentive audit).
    const ctx = { answers: {}, identity: { firstName: 'Hodan', gender: 'woman' as const } }
    const said = modes.flatMap((m) => [m.greeting(ctx as never), m.fallback(ctx as never), ...m.intents.map((i) => i.respond(ctx as never)), ...m.starters.map((s) => s.prompt)])
    const titles = new RegExp(paidLater.map((i) => i.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'i')
    expect(said.length).toBeGreaterThan(40)
    for (const line of said) {
      expect(line).not.toMatch(/\bpay\b|\bpaid\b|\bprice|\bfee\b|\$\d|upgrade|premium|in your corner/i)
      expect(line).not.toMatch(titles)
    }
  })

  it('the promises keep the member out of every payment', () => {
    // The promises name "the reply" and "subscription" to refuse them, so the
    // metered check is for the lines above; here, what she is charged.
    expect(promises.join(' ')).toMatch(/you are charged nothing/)
    expect(promises.join(' ')).toMatch(/staying single never earns us more/)
  })
})

describe('the screens', () => {
  it('Plus shows who pays each line, and no price', async () => {
    screen = await mount(<Plus onBack={() => {}} />)
    const text = screen.text()
    for (const item of paidLater) expect(text).toContain(item.badge)
    expect(text).not.toMatch(/Bought once/)
    expect(text).not.toMatch(/[$£€]\s?\d|\d+\s?(USD|GBP|EUR|dollars|pounds)/)
    // The founding members' year is its own thing, not a product's name.
    expect(text).toMatch(/A free year, if you were counted early/i)
    expect(text).not.toMatch(/The first year, as a gift/)
    expect(audit(screen.container), 'Plus').toEqual([])
  })

  it('the Ending asks for no money', async () => {
    const ending = buildEnding(
      {
        gender: 'woman',
        answers: {},
        mapHistory: [],
        steps: [],
        read: null,
        beforeYes: null,
        couple: null,
        vouch: null,
        followups: [],
        completed: true,
      },
      '2026-09-24',
    )
    screen = await mount(
      <Ending identity={{ firstName: 'Hodan', gender: 'woman', adult: true }} ending={ending} didEleven={false} saved={null} onSave={() => {}} onBack={() => {}} />,
    )
    const text = screen.text()
    // The one screen a marriage is reported from. The moment reporting it
    // costs anything, or comes with an ask, marriages stop being reported.
    expect(text).toContain('Hodan')
    expect(text).not.toMatch(/\bpay\b|\bpaid\b|sponsor|donat|\$|£|€|\bprice\b|\bfee\b|\bgift\b/i)
    expect(audit(screen.container), 'Ending').toEqual([])
  })
})

describe('no payment code before a gate passes', () => {
  it('package.json carries no payment SDK', () => {
    // docs/MONETIZATION.md, "No payment infrastructure": payments start by
    // hand — an invoice, a bank transfer, a hosted link — once a gate in its
    // section B has passed, and code only when collecting by hand is the
    // bottleneck (about ten a month). Adding one of these means that page
    // records the gate that passed; then change this test with it.
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'))
    const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })
    const payment = deps.filter((d) => /stripe|paypal|braintree|square|lemon-?squeezy|paddle|chargebee|recurly|adyen/i.test(d))
    expect(payment, 'no gate in docs/MONETIZATION.md has passed').toEqual([])
    const doc = readFileSync(join(process.cwd(), 'docs/MONETIZATION.md'), 'utf8')
    expect(doc).toMatch(/No gate has passed/)
  })
})
