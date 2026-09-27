// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/App'
import { seedDemo } from '../../src/lib/demo'
import { entryFromUrl } from '../../src/lib/entry'
import { forgetMe } from '../../src/lib/forget'
import { formatCode } from '../../src/lib/code'
import { rememberedIntro } from '../../src/lib/introduce'
import { day } from '../../netlify/shared/day'
import { removeOn } from '../../netlify/functions/introduce'
import { Phone, onPhone, reload } from '../support/device'
import { mount, type Mounted } from '../support/render'
import { residue } from '../support/residue'
import { blobs, call, serve, type Served } from '../support/server'

vi.mock('@netlify/blobs', async () => (await import('../support/blobs')).blobsModule)

/**
 * JOURNEY — the two doors (docs/DECISIONS.md Parts 22 and 23;
 * docs/BATCH-01-PLAN.md).
 *
 * A stranger on Welcome is looking for someone serious. She walks through the
 * first door and reads, before the button, who runs this, who the pilot is
 * for, what happens first, what is shown before anyone hears about her, and
 * how long a request is kept. She puts her name down, and is handed a receipt
 * only once the server has it — the server's own day and the Sunday it has
 * scheduled the removal for — with exactly the fields the screen names, under
 * a code her phone minted, and nothing about her anywhere else. When the
 * answer is lost, the same request goes again and is never saved twice; when
 * she has changed her mind in between, nothing is written over; when her
 * browser cannot hold the code, she is shown it, and it takes the name off
 * from any phone. A request still in flight cannot land after Forget me. A
 * receipt from before the server gave dates is shown as the phone's own
 * record. Past the scheduled day the code is kept and the truth said. The
 * address bar holds `/?looking` while she is here. And the second door lands
 * on each of the three instruments built for someone already talking to a
 * person.
 */

const DAY = 24 * 60 * 60 * 1000

const CONTACT = 'zq.sagal.looking@example.test'
const INTRO_KEY = 'niyyah.intro.v1'
const PENDING_KEY = 'niyyah.intro.pending.v1'
const CODE_SHAPE = /^[ACDEFGHJKMNPQRTWXY34789]{8}$/

let server: Served
beforeEach(() => {
  blobs.reset()
  server = serve()
})
afterEach(() => {
  reload()
  vi.unstubAllGlobals()
})

/** Through the first door, and the form filled in — everything but the button. */
async function fillIn(m: Mounted, contact = CONTACT, throughTheDoor = true) {
  if (throughTheDoor) await m.press(/I’m looking for someone serious/)
  expect(m.text()).toContain('Put my name down')
  await m.press(/^I am a woman/)
  await m.press(/^Minneapolis/)
  await m.press(/^Anywhere in the US/)
  await m.type('Your first name', 'Sagal')
  await m.type('Email or phone', contact)
  await m.press(/I confirm I am 18/)
}

const saved = (m: Mounted) => m.until(() => m.text().includes('Your request was saved on'), 'the server said saved')
const records = () => blobs.keys('introductions').filter((k) => !k.startsWith('withdrawn/'))
const markers = () => blobs.keys('introductions').filter((k) => k.startsWith('withdrawn/'))
const receipt = (phone: Phone) => JSON.parse(phone.storage.get(INTRO_KEY) ?? 'null') as { code: string; at: string; removeOn: string } | null

describe('looking for someone', () => {
  it('says what matters before the button, then hands her a receipt only once the server has it, with nothing else about her anywhere', async () => {
    const phone = onPhone(new Phone('hers'))
    const m = await mount(<App />)
    // Both doors, in her words, before anything else.
    expect(m.text()).toContain('I’m looking for someone serious.')
    expect(m.text()).toContain('I’m already talking to someone.')
    expect(m.text()).toContain('The founder speaks with you first.')
    await m.press(/I’m looking for someone serious/)

    // Before the button, in order: the operator, the pilot's rule, the
    // conversation first and the one with a person who knows her, the
    // approved description and the release rule, the scheduled removal.
    const before = m.text().slice(0, m.text().indexOf('Put my name down'))
    const order = [
      'Niyyah is run by its founder',
      '18 or older, and serious about marriage',
      'Introductions are beginning in Minneapolis–St. Paul',
      'For the first twenty introductions, nobody currently engaged or married',
      'A conversation with you, by the email or number you give',
      'if you agree to it, one conversation with a person who knows you',
      'does not say who you are',
      'goes to a person proposed to you until you and they have both said yes',
      'scheduled to be removed on the Sunday on or before its 180th day',
      'What goes, exactly',
      'that you confirmed you are 18 or older',
    ]
    let last = -1
    for (const line of order) {
      const at = before.indexOf(line)
      expect(at, line).toBeGreaterThan(last)
      last = at
    }
    expect(before).not.toMatch(/we will (write|find)|you will hear|opens on|your city opens|is down/i)

    await fillIn(m, CONTACT, false)
    // Filling the form sends nothing.
    expect(blobs.keys('introductions')).toEqual([])
    expect(m.text()).not.toContain('was saved on')

    await m.press(/^Put my name down/)
    await saved(m)

    // Exactly the named fields, under the code the phone minted.
    const codes = records()
    expect(codes).toHaveLength(1)
    expect(codes[0]).toMatch(CODE_SHAPE)
    expect(blobs.read('introductions', codes[0])).toEqual({
      contact: CONTACT,
      firstName: 'Sagal',
      gender: 'woman',
      scene: 'twin-cities',
      country: 'us',
      reach: 'country',
      adult: true,
      at: day(),
      v: 1,
    })
    // Her phone holds the receipt: the code and the server's two days — never the contact; the pending attempt is done.
    expect(receipt(phone)).toEqual({ code: codes[0], at: day(), removeOn: removeOn(day()) })
    expect(phone.storage.has(PENDING_KEY)).toBe(false)
    // And the way to reach her is nowhere else: not on the ladder, not in a map, not in her saved state.
    expect(residue([CONTACT], [phone]).filter((l) => !l.startsWith('introductions:'))).toEqual([])
    for (const k of blobs.keys('progress')) expect(JSON.stringify(blobs.read('progress', k))).not.toMatch(/intro|looking|Sagal/)
    // What she told the form, the rest of the app knows: no second asking.
    const identity = () => JSON.parse(phone.storage.get('niyyah.intake.v1') ?? '{}').identity as Record<string, unknown> | undefined
    await m.until(() => identity()?.gender === 'woman', 'her side saved')
    expect(identity()).toMatchObject({ gender: 'woman', scene: 'twin-cities', firstName: 'Sagal', adult: true })

    // The receipt says what the server said, as a receipt — never "your name is down".
    const said = m.text()
    expect(said).toContain(`Your request was saved on ${day()}.`)
    expect(said).toContain(`scheduled to be removed on ${removeOn(day())}`)
    expect(said).not.toMatch(/name is down|at the latest/i)
    expect(said).toContain('speaks with you first')
    expect(said).toContain('does not say who they are')
    expect(said).toContain('Nothing that identifies either of you')
    expect(said).toContain('never that the other person said no')
    expect(said).not.toMatch(/we will (write|find)|you will hear|opens on|your city opens/i)
    // The consent promise the founder corrected (decision 29): not "nothing
    // about them reaches you", which a non-identifying summary would break.
    expect(said).not.toMatch(/nothing about (you|them)[^.]*reach/i)
    expect(said).not.toMatch(/\bfits?\b/i)
    // Minneapolis–St. Paul is where she is: no "for later" note.
    expect(said).not.toContain('for later')
    m.unmount()
  })

  it('sends the named fields and the code, and nothing that joins them to anything else of hers', async () => {
    const phone = onPhone(new Phone('hers'))
    const bodies: string[] = []
    const real = globalThis.fetch
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes('/introduce') && typeof init?.body === 'string') bodies.push(init.body)
      return real(input, init)
    }) as typeof fetch
    const m = await mount(<App />)
    await fillIn(m)
    await m.press(/^Put my name down/)
    await saved(m)
    expect(bodies).toHaveLength(1)
    const body = JSON.parse(bodies[0]) as Record<string, unknown>
    expect(Object.keys(body).sort()).toEqual(['adult', 'code', 'contact', 'firstName', 'gender', 'reach', 'scene'])
    expect(body.adult).toBe(true)
    const code = records()[0]
    expect(body.code).toBe(code)
    // Not the install id the ladder counts under, not a map code (decision 31); never in the address bar.
    for (const k of [...phone.storage.keys()].filter((k) => k !== INTRO_KEY)) {
      expect(phone.storage.get(k) ?? '', k).not.toContain(code)
    }
    for (const k of blobs.keys('progress')) expect(JSON.stringify(blobs.read('progress', k))).not.toContain(code)
    expect(window.location.href).not.toContain(code)
    m.unmount()
  })

  it('from anywhere but Minneapolis–St. Paul, she is told her request is kept for later, with no date', async () => {
    onPhone(new Phone('hers'))
    const m = await mount(<App />)
    await m.press(/I’m looking for someone serious/)
    expect(m.text()).toContain('Introductions are beginning in Minneapolis–St. Paul')
    await m.press(/^Columbus/)
    expect(m.text()).toContain('From Columbus you can leave your name for later: nobody there is being introduced yet, and there is no date for it.')
    await m.press(/^Somewhere else$/)
    await m.press(/^United Kingdom$/)
    expect(m.text()).toContain('From the UK you can leave your name for later')
    await m.press(/^I am a man/)
    await m.type('Email or phone', '+44 20 7946 0000')
    await m.press(/I confirm I am 18/)
    await m.press(/^Put my name down/)
    await saved(m)
    expect(m.text()).toContain('Your request is kept for later: nobody in the UK is being introduced yet, and there is no date for it.')
    expect(m.text()).not.toMatch(/\b(soon|next month|this year|opening)\b/i)
    m.unmount()
  })

  it('the answer lost after the write landed: she is told so, the same request goes again under the same code, and it is saved once', async () => {
    const phone = onPhone(new Phone('hers'))
    const m = await mount(<App />)
    await fillIn(m)
    server.lose(/introduce/)
    await m.press(/^Put my name down/)
    await m.until(() => m.text().includes('could not tell whether that reached us'), 'told it is unsure')
    // The write landed. The phone holds the attempt — its code and the day, never the contact — and no receipt yet.
    expect(records()).toHaveLength(1)
    const code = records()[0]
    expect(JSON.parse(phone.storage.get(PENDING_KEY)!)).toEqual({ code, at: day() })
    expect(phone.storage.has(INTRO_KEY)).toBe(false)
    expect(residue([CONTACT], [phone]).filter((l) => l.startsWith('phone'))).toEqual([])
    expect(m.text()).not.toMatch(/nothing is saved|was saved on/)
    // Her words stay in the form, and the same tap sends the same request again.
    expect((m.container.querySelector('#looking-contact') as HTMLInputElement).value).toBe(CONTACT)
    server.lose(false)
    await m.press(/^Put my name down/)
    await saved(m)
    expect(m.text()).toContain('It had already been saved; the same request was not saved twice.')
    expect(records()).toEqual([code])
    expect(receipt(phone)).toEqual({ code, at: day(), removeOn: removeOn(day()) })
    expect(phone.storage.has(PENDING_KEY)).toBe(false)
    m.unmount()
  })

  it('changed her mind after an unsure answer: the earlier request is never written over, and she chooses', async () => {
    const phone = onPhone(new Phone('hers'))
    const m = await mount(<App />)
    await fillIn(m)
    server.lose(/introduce/)
    await m.press(/^Put my name down/)
    await m.until(() => m.text().includes('could not tell'), 'unsure')
    server.lose(false)
    const first = records()[0]
    // A different number, same code held: the server refuses, and says so.
    await m.type('Email or phone', '+1 612 555 0199')
    await m.press(/^Put my name down/)
    await m.until(() => m.text().includes('An earlier try went through with what you had typed then'), 'told the earlier one landed')
    expect(records()).toEqual([first])
    expect((blobs.read('introductions', first) as { contact: string }).contact).toBe(CONTACT)
    expect(m.text()).toContain('Your changes were not saved over it.')
    // She takes the earlier one off, then sends what is in the form now — under a fresh code.
    await m.press(/^Take the earlier name off/)
    await m.until(() => m.text().includes('Your name is off the list'), 'the earlier one is off')
    expect(records()).toEqual([])
    expect(markers()).toEqual([`withdrawn/${first}`])
    expect(phone.storage.has(PENDING_KEY)).toBe(false)
    await m.press(/^Put my name down/)
    await saved(m)
    const second = records()
    expect(second).toHaveLength(1)
    expect(second[0]).not.toBe(first)
    expect((blobs.read('introductions', second[0]) as { contact: string }).contact).toBe('+1 612 555 0199')
    m.unmount()
  })

  it('a browser that cannot hold the code: she is shown it, and it takes the name off from any phone', async () => {
    const phone = onPhone(new Phone('private'))
    phone.refuse(/^niyyah\.intro/)
    const m = await mount(<App />)
    await fillIn(m)
    server.lose(/introduce/)
    await m.press(/^Put my name down/)
    await m.until(() => m.text().includes('could not tell'), 'unsure')
    const code = records()[0]
    // Nothing on the phone holds it, so the screen does — once, formatted as a person reads it.
    expect(phone.storage.has(PENDING_KEY)).toBe(false)
    expect(m.text()).toContain('this is the only record of it')
    expect(m.text()).toContain(formatCode(code))
    // The page still holds the attempt: the retry goes under the same code.
    server.lose(false)
    await m.press(/^Put my name down/)
    await saved(m)
    expect(records()).toEqual([code])
    expect(m.text()).toContain('This browser is not saving anything')
    expect(m.text()).toContain(formatCode(code))
    expect(phone.storage.has(INTRO_KEY)).toBe(false)
    m.unmount()
    reload()

    // On another phone, with nothing but the code she wrote down.
    onPhone(new Phone('another'))
    const other = await mount(<App />)
    await other.press(/I’m looking for someone serious/)
    await other.press(/^I have a code/)
    await other.type('Your code', code.toLowerCase())
    await other.press(/^Take it off$/)
    await other.until(() => other.text().includes('Your name is off the list'), 'taken off by its code')
    expect(records()).toEqual([])
    expect(markers()).toEqual([`withdrawn/${code}`])
    // The same code again finds nothing, and says so; a code of the wrong shape never leaves the phone.
    await other.type('Your code', code)
    await other.press(/^Take it off$/)
    await other.until(() => other.text().includes('Nothing was under that code any more'), 'nothing under it')
    const before = server.requests.length
    await other.type('Your code', 'ABC')
    await other.press(/^Take it off$/)
    expect(other.text()).toContain('A code is 8 characters')
    expect(server.requests.length).toBe(before)
    other.unmount()
  })

  it('a browser that cannot hold the receipt: the page still does, Home shows it, and Forget me takes the name off', async () => {
    // Reproduced by the review of 2026-09-27: with `setItem` throwing, the
    // request saved, the receipt was dropped, and Forget me — finding no code
    // on the phone — reported the name gone while the record stayed.
    const phone = onPhone(new Phone('private'))
    phone.refuse(/^niyyah\.intro/)
    const m = await mount(<App />)
    await fillIn(m)
    await m.press(/^Put my name down/)
    await saved(m)
    const code = records()[0]
    expect(phone.storage.has(INTRO_KEY)).toBe(false)
    expect(m.text()).toContain('This browser is not saving anything')
    expect(m.text()).toContain(formatCode(code))
    // Away from the screen and back through the door: the page still holds it.
    await m.press(/^Back/)
    await m.until(() => m.text().includes('I’m already talking to someone.'), 'back on Welcome')
    expect(m.text()).not.toContain(formatCode(code))
    await m.press(/I’m looking for someone serious/)
    await m.until(() => m.text().includes(`Your request was saved on ${day()}.`), 'the receipt again')
    expect(m.text()).toContain(formatCode(code))
    expect(rememberedIntro()).toMatchObject({ code, kept: false })
    // Forget me, through Trust: the code the page holds is sent, and the record goes.
    await m.press(/^What we hold, exactly/)
    await m.press(/^Forget me$/)
    await m.press('Yes, delete everything')
    await m.until(() => records().length === 0, 'the record is deleted')
    expect(markers()).toEqual([`withdrawn/${code}`])
    expect(residue([CONTACT], [phone])).toEqual([])
    m.unmount()
  })

  it('two tabs on one phone send the same request: one record, one day, both told', async () => {
    const phone = onPhone(new Phone('hers'))
    const a = await mount(<App />)
    await fillIn(a)
    server.lose(/introduce/)
    await a.press(/^Put my name down/)
    await a.until(() => a.text().includes('could not tell'), 'tab A is unsure')
    server.lose(false)
    // Tab B opens on the same phone, and finds the attempt this phone holds.
    const b = await mount(<App />)
    await fillIn(b)
    await b.press(/^Put my name down/)
    await saved(b)
    expect(b.text()).toContain('the same request was not saved twice')
    await a.press(/^Put my name down/)
    await saved(a)
    expect(records()).toHaveLength(1)
    expect(receipt(phone)!.code).toBe(records()[0])
    a.unmount()
    b.unmount()
  })

  it('a request still in flight when she taps Forget me cannot land afterwards', async () => {
    const phone = onPhone(new Phone('hers'))
    const m = await mount(<App />)
    await fillIn(m)
    const release = server.hold(/introduce/, 'POST')
    await m.press(/^Put my name down/)
    expect(m.text()).toContain('Saving…')
    const pending = JSON.parse(phone.storage.get(PENDING_KEY)!) as { code: string }
    expect(pending.code).toMatch(CODE_SHAPE)
    // Forget me, from Trust, while the request has not been answered.
    const done = await forgetMe()
    expect(done.intro).toBe(true)
    expect(phone.keys()).toEqual([])
    expect(markers()).toEqual([`withdrawn/${pending.code}`])
    // The request lands now — and finds the marker.
    release()
    await m.until(() => m.text().includes('taken off before this request was answered'), 'the late request was refused')
    expect(records()).toEqual([])
    expect(markers()).toEqual([`withdrawn/${pending.code}`])
    expect(residue([CONTACT], [phone])).toEqual([])
    m.unmount()
  })

  it('a request still in flight when she takes the name off by its code cannot land afterwards', async () => {
    const phone = onPhone(new Phone('hers'))
    const m = await mount(<App />)
    await fillIn(m)
    const release = server.hold(/introduce/, 'POST')
    await m.press(/^Put my name down/)
    const pending = JSON.parse(phone.storage.get(PENDING_KEY)!) as { code: string }
    await call('introduce', 'DELETE', `introduce?code=${pending.code}`)
    release()
    await m.until(() => m.text().includes('taken off before this request was answered'), 'refused')
    expect(records()).toEqual([])
    expect(phone.storage.has(PENDING_KEY)).toBe(false)
    m.unmount()
  })

  it('she can take her name off from the receipt, and then nothing of hers is held there', async () => {
    const phone = onPhone(new Phone('hers'))
    const m = await mount(<App />)
    await fillIn(m)
    await m.press(/^Put my name down/)
    await saved(m)
    const code = records()[0]
    await m.press(/^Take my name off/)
    await m.until(() => m.text().includes('Your name is off the list'), 'taken off')
    expect(records()).toEqual([])
    expect(markers()).toEqual([`withdrawn/${code}`])
    expect(phone.storage.has(INTRO_KEY)).toBe(false)
    expect(residue([CONTACT], [phone])).toEqual([])
    // And put down again in the same visit, the receipt shows — found in the
    // phone-width walk of 2026-09-27, where it saved and still showed the form.
    await m.type('Email or phone', CONTACT)
    await m.press(/^Put my name down/)
    await saved(m)
    expect(m.text()).not.toContain('Your name is off the list')
    expect(records()).toHaveLength(1)
    expect(records()[0]).not.toBe(code)
    m.unmount()
  })

  it('a receipt from before the server gave dates is shown as this phone’s own record, and still takes the name off', async () => {
    const phone = onPhone(new Phone('hers'))
    const put = day(Date.now() - 20 * DAY)
    blobs.put('introductions', 'HJKMNPQR', { contact: CONTACT, gender: 'woman', scene: 'twin-cities', country: 'us', reach: 'city', at: put, v: 1 })
    phone.storage.set(INTRO_KEY, JSON.stringify({ code: 'HJKMNPQR', at: put }))
    seedDemo()
    const m = await mount(<App />)
    expect(m.text()).toContain(`A code from around ${put}, by this phone’s own record`)
    await m.press(/^Your request for an introduction/)
    expect(m.text()).toContain(`This phone holds a code for a request from around ${put}.`)
    expect(m.text()).toContain('That day is this phone’s own record')
    expect(m.text()).toContain(`so by ${removeOn(put)}`)
    expect(m.text()).not.toMatch(/was saved on|name is down/)
    await m.press(/^Take my name off/)
    await m.until(() => m.text().includes('Your name is off the list'), 'taken off')
    expect(records()).toEqual([])
    expect(phone.storage.has(INTRO_KEY)).toBe(false)
    m.unmount()
  })

  it('past the scheduled day the code is kept and the truth said; the sweep removes the record on that day', async () => {
    const phone = onPhone(new Phone('hers'))
    // Put down long ago: its Sunday has passed, and the sweep has not run since.
    const put = day(Date.now() - 200 * DAY)
    const goes = removeOn(put)!
    blobs.put('introductions', 'HJKMNPQR', { contact: CONTACT, gender: 'woman', scene: 'twin-cities', country: 'us', reach: 'city', adult: true, at: put, v: 1 })
    phone.storage.set(INTRO_KEY, JSON.stringify({ code: 'HJKMNPQR', at: put, removeOn: goes }))
    seedDemo()
    const m = await mount(<App />)
    expect(m.text()).toContain('The day scheduled for its removal has passed.')
    // Not thrown away on the phone's say-so: the code stays until she acts.
    expect(phone.storage.has(INTRO_KEY)).toBe(true)
    await m.press(/^Your request for an introduction/)
    expect(m.text()).toContain(`Your request was saved on ${put}.`)
    expect(m.text()).toContain(`scheduled to be removed on ${goes}`)
    expect(m.text()).toContain('This phone cannot see whether the removal ran')
    // The sweep takes it — on its day, and on any later run.
    const res = await call('sweep', 'POST', 'sweep')
    expect(((await res.json()) as { swept: { introductions: number } }).swept.introductions).toBe(1)
    expect(records()).toEqual([])
    // Her phone still holds the code; taking it off finds nothing, and clears it.
    await m.press(/^Take my name off/)
    await m.until(() => m.text().includes('Nothing was under that code any more'), 'nothing under it')
    expect(phone.storage.has(INTRO_KEY)).toBe(false)
    expect(m.text()).toContain('Put my name down')
    m.unmount()
  })

  it('a member with a Home finds the list from Home, and Home shows the receipt', async () => {
    const phone = onPhone(new Phone('hers'))
    seedDemo()
    const home = await mount(<App />)
    expect(home.text()).toContain('Looking for someone serious?')
    expect(home.text()).toContain('for adults serious about marriage')
    await home.press(/^Looking for someone serious\?/)
    expect(home.text()).toContain('Put my name down')
    home.unmount()
    reload()
    phone.storage.set(INTRO_KEY, JSON.stringify({ code: 'HJKMNPQR', at: day(), removeOn: removeOn(day()) }))
    const again = await mount(<App />)
    expect(again.text()).toContain('Your request for an introduction')
    expect(again.text()).toContain(`Saved ${day()}; scheduled to be removed on ${removeOn(day())}`)
    expect(again.text()).not.toContain('Looking for someone serious?')
    again.unmount()
  })

  it('the address bar holds /?looking while she is here — on a reload, and after Back it is gone', async () => {
    onPhone(new Phone('hers'))
    window.history.replaceState({}, '', '/')
    const m = await mount(<App />)
    await m.press(/I’m looking for someone serious/)
    expect(window.location.pathname + window.location.search).toBe('/?looking')
    await m.press(/^Back/)
    expect(window.location.pathname + window.location.search).toBe('/')
    m.unmount()
    reload()
    // A reload of the address the bar showed: main.tsx parses it as a link and lands on the form.
    const link = new URL('https://niyyah.test/?looking&via=group')
    window.history.replaceState({}, '', link.pathname)
    const again = await mount(<App entry={entryFromUrl(link.search, link.pathname)} />)
    expect(again.text()).toContain('Put my name down')
    // The kind of link is remembered elsewhere; it is never put back into the bar.
    expect(window.location.pathname + window.location.search).toBe('/?looking')
    again.unmount()
  })
})

describe('already talking to someone', () => {
  const doors: [RegExp, RegExp][] = [
    [/^I can’t tell what they mean yet/, /Are they serious\?/],
    [/^We’re getting serious/, /Before you say yes/],
    [/^The families are coming in/, /Bringing the families in/],
  ]

  it.each(doors)('%s lands on its instrument', async (door, lands) => {
    onPhone(new Phone('theirs'))
    const m = await mount(<App />)
    await m.press(/I’m already talking to someone/)
    expect(m.text()).toContain('Where are you with it?')
    await m.press(door)
    expect(m.text()).toMatch(lands)
    m.unmount()
  })

  it('and the other door is one tap away from each', async () => {
    onPhone(new Phone('theirs'))
    const m = await mount(<App />)
    await m.press(/I’m already talking to someone/)
    await m.press(/Put your name down for an introduction/)
    expect(m.text()).toContain('Put my name down')
    await m.press(/Start there instead/)
    expect(m.text()).toContain('Where are you with it?')
    m.unmount()
  })
})
