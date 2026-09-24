// @vitest-environment happy-dom
import fc from 'fast-check'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/App'
import { seedDemo } from '../../src/lib/demo'
import { entryFromUrl } from '../../src/lib/entry'
import { instrumentLink, toolLink } from '../../src/lib/links'
import { inviteLink } from '../../src/data/invite'
import { readQuestions } from '../../src/data/read'
import { beforeYesTopics } from '../../src/data/beforeYes'
import { wordsLink } from '../../src/lib/words'
import { coupleLink } from '../../src/lib/couple'
import { audit } from '../support/a11y'
import { sheet } from '../support/arbitrary'
import { Phone, onPhone, reload } from '../support/device'
import { mount, type Mounted } from '../support/render'
import { blobs, call, serve } from '../support/server'

vi.mock('@netlify/blobs', async () => (await import('../support/blobs')).blobsModule)

/**
 * ACCESSIBILITY, on what React rendered — every screen a person can reach.
 *
 * tests/a11y.test.ts used to hold this line by searching the .tsx source for
 * `<main`, `aria-label` and `role="group"`: a check that passes when the
 * attribute sits on a branch that never renders, and missed every screen it
 * did not name. The intake — the longest flow in the product — had no `main`
 * on any of its questions, and nothing noticed until this rendered it. Each
 * screen here is reached the way a person reaches it (a link, or the taps from
 * Welcome or Home), identified by words only it has, and audited by
 * tests/support/a11y.ts. A new screen gets a row.
 */

interface Visit {
  /** A member with a map (the demo seed), or nobody. */
  who: 'member' | 'stranger'
  /** A link the app was opened on. */
  link?: () => string | Promise<string>
  /** What she taps to get there. */
  taps?: (string | RegExp)[]
  /** Words only that screen has, so the audit is of the screen it says. */
  lands: RegExp
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** A stranger, through Welcome and Identity. */
const START = ['Start where you are', /^I am a woman/, /I confirm I am 18/, /^Continue/]

const HOOK = [...START, /^I’m not talking to anyone/, /^Continue/]

const VISITS: Record<string, Visit> = {
  welcome: { who: 'stranger', lands: /What’s in your way\?/ },
  identity: { who: 'stranger', taps: ['Start where you are'], lands: /Let’s start with you/ },
  situation: { who: 'stranger', taps: START, lands: /What’s happening right now\?/ },
  'situation — getting ready': { who: 'stranger', taps: [...START, /^I’m not talking to anyone/], lands: /Get yourself ready first/ },
  hook: { who: 'stranger', taps: [...START, /^I’m not talking to anyone/, /^Continue/], lands: /What’s the hardest part for you right now\?/ },
  'hook — the answer': { who: 'stranger', taps: [...HOOK, /^Knowing if someone is serious/], lands: /The honest answer/ },
  'intake — a question': { who: 'stranger', taps: [...HOOK, /^Knowing if someone is serious/, /^Build my map/], lands: /Within the next year/ },
  restore: { who: 'stranger', taps: [/Already have a code/], lands: /Your code/ },
  home: { who: 'member', lands: /Salaam, Hodan\./ },
  reflection: { who: 'member', taps: [/^Your map/], lands: /Hodan · your map/ },
  trust: { who: 'member', taps: [/^Your privacy/], lands: /Forget me/ },
  coach: { who: 'member', taps: [/^Talk to your guide/], lands: /Different moments need different wisdom/ },
  'read — the chooser': { who: 'stranger', link: () => instrumentLink('read', 'words'), lands: /Are they serious\?/ },
  'read — a question': { who: 'stranger', link: () => toolLink('is-he-serious', 'words'), taps: ['Start the read'], lands: /1 of 12/ },
  'read — the result': {
    who: 'stranger',
    link: () => toolLink('is-he-serious', 'words'),
    taps: ['Start the read', ...readQuestions('woman').map((q) => new RegExp(`^${esc(q.options[0].label)}`))],
    lands: /Your read.*What he has shown you/,
  },
  'eleven — the front': { who: 'stranger', link: () => inviteLink('beforeYes'), lands: /Before you say yes/ },
  'eleven — a topic': { who: 'stranger', link: () => inviteLink('beforeYes'), taps: ['Start — about him'], lands: /1 of 11/ },
  'eleven — the result': {
    who: 'stranger',
    link: () => inviteLink('beforeYes'),
    taps: ['Start — about him', ...beforeYesTopics('woman').map(() => /^We’ve talked, and we agree/)],
    lands: /Ask him to do this too/,
  },
  families: { who: 'stranger', link: () => wordsLink('family'), lands: /Bringing the families in/ },
  'couple — his side': {
    who: 'stranger',
    link: async () => {
      const [states] = fc.sample(sheet, 1)
      const { code } = await (await call('couple', 'POST', 'couple', { side: 'first', gender: 'woman', states })).json()
      return coupleLink(code, 'https://niyyah.test')
    },
    lands: /She’s asked you to do this too/,
  },
}

beforeEach(() => {
  blobs.reset()
  serve()
})
afterEach(() => {
  reload()
  vi.unstubAllGlobals()
})

async function visit(v: Visit): Promise<Mounted> {
  const url = v.link ? new URL(await v.link()) : null
  onPhone(new Phone('audit'))
  if (v.who === 'member') seedDemo()
  const m = await mount(<App entry={url ? entryFromUrl(url.search, url.pathname) : null} />)
  for (const t of v.taps ?? []) await m.press(t)
  return m
}

describe('the audit itself', () => {
  it('finds what it says it finds, so a clean screen means something', async () => {
    const bad = document.createElement('div')
    bad.innerHTML = `
      <button></button>
      <input type="text">
      <div role="group"><button aria-describedby="nowhere">x</button></div>
      <p id="twice"></p><p id="twice"></p>
      <div aria-checked="true">card</div>`
    const found = audit(bad).join('\n')
    for (const problem of ['no accessible name', 'field with no label', 'a group with no name', 'names #nowhere', 'id #twice', 'aria-checked without', '0 main landmarks', 'no heading']) {
      expect(found).toContain(problem)
    }
  })
})

describe('every screen, as rendered, can be used without sight', () => {
  it.each(Object.entries(VISITS))('%s', async (_name, v) => {
    const m = await visit(v)
    expect(m.text()).toMatch(v.lands)
    expect(audit(m.container)).toEqual([])
    m.unmount()
  })
})

describe('what a generic audit cannot know, checked on the rendered screen', () => {
  // Each of these replaced a regex over the .tsx source in tests/a11y.test.ts
  // (docs/TESTING.md, "Pruned").

  it('says which option is chosen, to a screen reader, on every single-choice card', async () => {
    const m = await visit({ who: 'stranger', taps: ['Start where you are'], lands: /./ })
    const choices = [...m.container.querySelectorAll('[role="radio"]')]
    expect(choices.length).toBeGreaterThanOrEqual(2)
    for (const c of choices) expect(c.getAttribute('aria-checked')).toBe('false')
    await m.press(/^I am a woman/)
    const chosen = m.container.querySelector('[role="radio"][aria-checked="true"]')
    expect(chosen?.textContent).toMatch(/I am a woman/)
    // Grouped under a name, so "1 of 2" has something to be one of.
    expect(chosen?.closest('[role="radiogroup"], [role="group"]')).not.toBeNull()
    m.unmount()
    for (const v of [VISITS['read — a question'], VISITS['eleven — a topic']]) {
      const q = await visit(v)
      const options = [...q.container.querySelectorAll('[role="radio"]')]
      expect(options.length, String(v.lands)).toBeGreaterThanOrEqual(4)
      for (const o of options) expect(o.hasAttribute('aria-checked')).toBe(true)
      q.unmount()
    }
  })

  it('tells the restore field itself what is wrong with a code, not only the screen', async () => {
    const m = await visit(VISITS.restore)
    await m.type('Your code', 'CDFG')
    await m.press(/^Restore$/)
    const field = m.container.querySelector('#restore-code')!
    expect(field.getAttribute('aria-invalid')).toBe('true')
    const said = m.container.querySelector(`#${field.getAttribute('aria-describedby')}`)
    expect(said?.getAttribute('role')).toBe('status')
    expect(said?.textContent).toMatch(/A code is 8 characters/)
    expect(audit(m.container)).toEqual([])
    m.unmount()
  })

  it('marks every Somali line lang="so", apart from its English gloss', async () => {
    for (const [v, line] of [
      [VISITS['eleven — the front'], 'Wada hadallada muhiimka ah.'],
      [VISITS['situation — getting ready'], 'Marka hore is diyaari.'],
      [VISITS.families, null],
    ] as const) {
      const m = await visit(v)
      const somali = [...m.container.querySelectorAll('[lang="so"]')]
      expect(somali.length, String(v.lands)).toBeGreaterThan(0)
      if (line) expect(somali.map((s) => s.textContent)).toContain(line)
      // The gloss is English, so it is never inside the span.
      for (const s of somali) expect(s.textContent).not.toMatch(/\b(the|and|before|yourself)\b/i)
      m.unmount()
    }
  })
})
