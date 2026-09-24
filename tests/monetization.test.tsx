// @vitest-environment happy-dom
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import Ending from '../src/components/Ending'
import Trust from '../src/components/Trust'
import { modes } from '../src/data/coach'
import { buildEnding } from '../src/lib/ending'
import { audit } from './support/a11y'
import { mount, type Mounted } from './support/render'

/**
 * Nothing is for sale — held to docs/PRODUCT.md.
 *
 * There is no price and no paid line: the Plus screen that described what
 * might one day cost money went on 2026-09-24, and its three promises moved
 * to Trust. What stops the rest drifting back is here: the one screen a
 * marriage is reported from asks for nothing, the guide never sells, and no
 * payment code arrives before a gate in docs/PRODUCT.md has passed.
 */

let screen: Mounted | undefined
afterEach(() => {
  screen?.unmount()
  screen = undefined
})

describe('what she is promised', () => {
  it('Trust says nothing that protects her is paid, and staying single never earns us more', async () => {
    screen = await mount(
      <Trust
        identity={{ gender: 'woman' }}
        guideOnDevice={false}
        onGuideOnDevice={() => {}}
        countMe
        onCountMe={() => {}}
        onForget={async () => ({ map: true, progress: true, couple: true })}
        onBack={() => {}}
      />,
    )
    const text = screen.text()
    expect(text).toMatch(/Nothing that protects you is ever paid/)
    expect(text).toMatch(/staying single never earns us more/)
    expect(text).toMatch(/never charge you without asking first/)
    expect(text).not.toMatch(/[$£€]\s?\d|\d+\s?(USD|GBP|EUR|dollars|pounds)/)
  })

  it('the guide never sells: no voice mentions a payment, a price or an upgrade', () => {
    // The guide is the thing members trust most. The day it says a human one
    // costs money, the advice is a funnel (docs/PRODUCT.md, the
    // incentive audit).
    const ctx = { answers: {}, identity: { firstName: 'Hodan', gender: 'woman' as const } }
    const said = modes.flatMap((m) => [m.greeting(ctx as never), m.fallback(ctx as never), ...m.intents.map((i) => i.respond(ctx as never)), ...m.starters.map((s) => s.prompt)])
    expect(said.length).toBeGreaterThan(40)
    for (const line of said) expect(line).not.toMatch(/\bpay\b|\bpaid\b|\bprice|\bfee\b|\$\d|upgrade|premium|in your corner/i)
  })

  it('the Ending asks for no money', async () => {
    const ending = buildEnding(
      { gender: 'woman', answers: {}, mapHistory: [], read: null, beforeYes: null, couple: null, followups: [], completed: true },
      '2026-09-24',
    )
    screen = await mount(
      <Ending identity={{ firstName: 'Hodan', gender: 'woman', adult: true }} ending={ending} didEleven={false} saved={null} onSave={() => {}} onForget={async () => ({ map: true, progress: true, couple: true })} onBack={() => {}} />,
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
    // docs/PRODUCT.md, "No payment infrastructure": payments start by
    // hand — an invoice, a bank transfer, a hosted link — once a gate in its
    // section B has passed, and code only when collecting by hand is the
    // bottleneck. Adding one of these means that page records the gate that
    // passed; then change this test with it.
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'))
    const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })
    const payment = deps.filter((d) => /stripe|paypal|braintree|square|lemon-?squeezy|paddle|chargebee|recurly|adyen/i.test(d))
    expect(payment, 'no gate in docs/PRODUCT.md has passed').toEqual([])
    const doc = readFileSync(join(process.cwd(), 'docs/PRODUCT.md'), 'utf8')
    expect(doc).toMatch(/No gate has passed/)
  })
})
