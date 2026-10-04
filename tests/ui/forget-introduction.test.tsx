// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/App'
import ForgetMe, { type Forgot } from '../../src/components/ForgetMe'
import { formatCode } from '../../src/lib/code'
import { day } from '../../netlify/shared/day'
import { answerDelete, appHtml } from '../support/answers'
import { Phone, onPhone, reload } from '../support/device'
import { recoveryCodes, recoveryKey, recoveryKeys } from '../support/recovery'
import { mount, type Mounted } from '../support/render'
import { blobs, serve, type Served } from '../support/server'

vi.mock('@netlify/blobs', async () => (await import('../support/blobs')).blobsModule)

/**
 * Forget me, on the screen, when the introduction list's deletion is not
 * confirmed (docs/DECISIONS.md Part 33).
 *
 * Two layers. The component alone, with a stub in place of `onForget`, for what
 * each result says to a person: the sentences, the codes in full, the plural and
 * singular forms, and no claim the phone cannot make. Then the real app over the
 * real handler (the DELETE's answer the only thing replaced) for the page-
 * replacement condition, the recovery that is reachable afterwards, and the
 * automatic retry on launch. The classifier's own matrix is in
 * src/lib/introduce.test.ts and is not repeated here. Text and storage are
 * checked; what a screen reader says is not.
 */

const CONTACT = 'zq.forget.screen@example.test'
const A = 'QRTWXY34'
const B = 'HJKMNPQR'
const C = 'ACDEFGHJ'
/** What no screen may say about an introduction deletion nobody confirmed. */
const FALSE_CLAIMS = ['Your name is off the list', 'Nothing was under that code', 'Nothing has changed', 'We could not reach the list', 'it goes by hand', 'This browser is not saving anything']

let server: Served
let phone: Phone
let screen: Mounted | undefined
beforeEach(() => {
  blobs.reset()
  server = serve()
  phone = onPhone(new Phone('hers'))
  vi.stubGlobal('scrollTo', vi.fn())
})
afterEach(() => {
  screen?.unmount()
  screen = undefined
  reload()
  vi.unstubAllGlobals()
  ;(document.activeElement as HTMLElement | null)?.blur()
})

/** Tap Forget me, then confirm, on a stub that answers `result`. */
async function forgetOnStub(result: Awaited<ReturnType<Forgot>>) {
  const m = await mount(<ForgetMe onForget={async () => result} />)
  screen = m
  await m.press(/^Forget me$/)
  await m.press('Yes, delete everything')
  await m.settle()
  return m
}
const noFalseClaims = (m: Mounted) => {
  for (const claim of FALSE_CLAIMS) expect(m.text(), claim).not.toContain(claim)
}
const ALL = { map: true, progress: true, couple: true }

describe('the message, on a stub', () => {
  it('one unconfirmed code, saved on this phone: says it could not confirm, shows the code in full, and promises no completion', async () => {
    const m = await forgetOnStub({ ...ALL, intro: false, introHeld: [A], kept: true })
    const said = m.text()
    expect(said).toContain('This phone is cleared.')
    expect(said).toContain('We could not confirm that your name came off the introduction list. It may have, or it may not.')
    expect(said).toContain(formatCode(A))
    expect(said).toContain('with the code')
    expect(said).toContain('to ask for help removing it.')
    expect(said).toContain('tries again each time Niyyah opens, though that may not get through')
    expect(said).toContain('or tap Forget me again in a moment')
    expect(said).toContain('“Take a name off with its code” on the looking screen')
    // Not blame, not a completion promise, not the not-saving sentence, not a hand-off that sounds like a deletion.
    expect(said).not.toContain('that is us, not you')
    expect(said).not.toContain('still held')
    expect(said).not.toContain('cannot try again')
    noFalseClaims(m)
    expect(m.container.querySelector('[role="status"]')).not.toBeNull()
    // Recovery is back in reach: the button that sends it again.
    expect(m.has(/^Forget me$/)).toBe(true)
  })

  it('two codes: plural everywhere, each shown in full', async () => {
    const m = await forgetOnStub({ ...ALL, intro: false, introHeld: [B, A], kept: true })
    const said = m.text()
    expect(said).toContain('with these codes')
    expect(said).toContain(`${formatCode(B)} and ${formatCode(A)}`)
    expect(said).toContain('to ask for help removing them.')
    expect(said).not.toContain('with the code ')
    noFalseClaims(m)
  })

  it('three codes, because an earlier forget left one: a list, not a pair', async () => {
    const m = await forgetOnStub({ ...ALL, intro: false, introHeld: [C, B, A], kept: true })
    const said = m.text()
    expect(said).toContain(`${formatCode(C)}, ${formatCode(B)} and ${formatCode(A)}`)
    expect(said).toContain('with these codes')
    expect(said).toContain('removing them')
  })

  it('storage refused: says this browser could not save the code, that it cannot try again once the page is closed, and to copy it now', async () => {
    const m = await forgetOnStub({ ...ALL, intro: false, introHeld: [A], kept: false })
    const said = m.text()
    expect(said).toContain('This browser could not save this recovery code, so it cannot try again once this page is closed or reloaded. Copy it now. Until then you can tap Forget me again.')
    expect(said).toContain(formatCode(A))
    // The keeps-only-what-it-needs sentence is not true of this phone, and is not said.
    expect(said).not.toContain('keeps only what it needs')
    expect(said).not.toContain('tries again each time Niyyah opens')
    noFalseClaims(m)
  })

  it('storage refused, two codes: plural', async () => {
    const m = await forgetOnStub({ ...ALL, intro: false, introHeld: [B, A], kept: false })
    const said = m.text()
    expect(said).toContain('This browser could not save these recovery codes')
    expect(said).toContain('Copy them now.')
  })

  it('a map that could not be reached as well: both said, in their own words, and the recovery sentence does not claim only introduction codes are kept', async () => {
    const m = await forgetOnStub({ map: false, progress: true, couple: true, intro: false, mapHeld: ['ACDEFG'], introHeld: [A], kept: true })
    const said = m.text()
    expect(said).toContain('We could not confirm that your kept map was deleted. It may have been, or it may not.')
    expect(said).toContain('We could not confirm that your name came off the introduction list. It may have, or it may not.')
    expect(said).toContain(`with these codes ACDEFG and ${formatCode(A)} to ask for help removing them.`)
    expect(said).toContain('keeps only codes')
    expect(said).not.toMatch(/only (the )?introduction/i)
    // The introduction list is not among the things said to be "still held".
    expect(said).not.toContain('kept map and your name')
    expect(said).not.toContain('your name on the introduction list just now')
  })

  it('a map alone: the sentence for it, as before, with the hand-off no longer sounding like a deletion', async () => {
    const m = await forgetOnStub({ map: false, progress: true, couple: true, intro: true, mapHeld: ['ACDEFG'], kept: true })
    const said = (m.container.querySelector('[role="status"]')?.textContent ?? '').replace(/\s+/g, ' ')
    expect(said).toContain('This phone is cleared.')
    expect(said).toContain('We could not confirm that your kept map was deleted. It may have been, or it may not.')
    expect(said).toContain('with the code ACDEFG to ask for help removing it.')
    expect(said).not.toContain('introduction')
    expect(said).not.toContain('it goes by hand')
  })

  it('everything confirmed: nothing is said', async () => {
    const m = await forgetOnStub({ ...ALL, intro: true })
    expect(m.container.querySelector('[role="status"]')).toBeNull()
  })

  it('a second result replaces the first, and an empty one clears it', async () => {
    let n = 0
    const results = [
      { ...ALL, intro: false, introHeld: [A], kept: true },
      { ...ALL, intro: true },
    ]
    const m = await mount(<ForgetMe onForget={async () => results[n++]} />)
    screen = m
    await m.press(/^Forget me$/)
    await m.press('Yes, delete everything')
    await m.settle()
    expect(m.text()).toContain(formatCode(A))
    await m.press(/^Forget me$/)
    await m.press('Yes, delete everything')
    await m.settle()
    expect(m.container.querySelector('[role="status"]')).toBeNull()
    expect(m.text()).not.toContain(formatCode(A))
  })
})

/** What the map, the count and the eleven may not be said to be when nobody confirmed them (docs/DECISIONS.md Part 34). */
const NO_CLAIMS = ['still held', 'that is us, not you', 'We could not reach', 'Nothing has changed', 'is deleted', 'are deleted', 'has been deleted']

describe('the message for the map, the count and the eleven, on a stub', () => {
  it('the count alone: uncertain, no hand-off, no code, and the same recovery sentence as for a code that is kept', async () => {
    const m = await forgetOnStub({ map: true, progress: false, couple: true, intro: true, kept: true })
    const said = (m.container.querySelector('[role="status"]')?.textContent ?? '').replace(/\s+/g, ' ')
    expect(said).toContain('This phone is cleared. We could not confirm that the count of your steps was deleted. It may have been, or it may not.')
    expect(said).toContain('tries again each time Niyyah opens, though that may not get through')
    // Nothing a person can hand over, so nothing is offered to be written in with.
    expect(said).not.toContain('Or write to')
    expect(said).not.toContain('with the code')
    for (const claim of NO_CLAIMS) expect(said, claim).not.toContain(claim)
    expect(m.has(/^Forget me$/)).toBe(true)
  })

  it('the eleven alone is singular, and the three together are a list with the plural', async () => {
    const one = await forgetOnStub({ map: true, progress: true, couple: false, intro: true, kept: true })
    expect(one.text()).toContain('We could not confirm that the eleven you sent was deleted. It may have been, or it may not.')
    one.unmount()
    screen = undefined
    const all = await forgetOnStub({ map: false, progress: false, couple: false, intro: true, mapHeld: ['ACDEFG'], kept: true })
    const said = all.text()
    expect(said).toContain('We could not confirm that your kept map, the count of your steps and the eleven you sent were deleted. They may have been, or they may not.')
    expect(said).toContain('with the code ACDEFG')
    for (const claim of NO_CLAIMS) expect(said, claim).not.toContain(claim)
  })

  it('two map codes, one earlier: both shown in full, plural', async () => {
    const m = await forgetOnStub({ map: false, progress: true, couple: true, intro: true, mapHeld: ['ACDEFG', 'CDEFGHJK'], kept: true })
    expect(m.text()).toContain('with these codes ACDEFG and CDEFGHJK to ask for help removing them.')
  })

  it('storage refused, only the step id or the couple code held: it says so, shows nothing to copy, and offers no hand-off', async () => {
    const m = await forgetOnStub({ map: true, progress: false, couple: false, intro: true, kept: false })
    const said = (m.container.querySelector('[role="status"]')?.textContent ?? '').replace(/\s+/g, ' ')
    expect(said).toContain('This browser could not save what it needs to try again, so it cannot once this page is closed or reloaded. Until then you can tap Forget me again.')
    expect(said).not.toContain('Copy')
    expect(said).not.toContain('Or write to')
    expect(said).not.toContain('keeps only what it needs')
  })

  it('storage refused, a map code held with the step id: the code is shown to copy, the step id is not', async () => {
    const m = await forgetOnStub({ map: false, progress: false, couple: true, intro: true, mapHeld: ['ACDEFG'], kept: false })
    const said = m.text()
    expect(said).toContain('This browser could not save this recovery code, so it cannot try again once this page is closed or reloaded. Copy it now. Until then you can tap Forget me again.')
    expect(said).toContain('with the code ACDEFG')
  })
})

describe('an unreadable record of an earlier attempt, on a stub', () => {
  it('says it could not check, and does not say anything is held that is not', async () => {
    const m = await forgetOnStub({ ...ALL, intro: true, unchecked: true })
    const said = m.text()
    expect(said).toContain('This phone is cleared.')
    expect(said).toContain('We could not check whether anything from an earlier attempt is still waiting on this phone.')
    expect(said).not.toContain('We could not confirm')
    expect(said).not.toContain('Or write to')
    noFalseClaims(m)
  })

  it('says nothing about it when the record was read', async () => {
    const m = await forgetOnStub({ ...ALL, intro: false, introHeld: [A], kept: true })
    expect(m.text()).not.toContain('We could not check')
  })
})

// ── The real app ────────────────────────────────────────────────────────────

const records = () => blobs.keys('introductions').filter((k) => !k.startsWith('withdrawn/'))
const markers = () => blobs.keys('introductions').filter((k) => k.startsWith('withdrawn/'))
const deletes = () => server.requests.filter((r) => r.startsWith('DELETE ') && r.includes('introduce')).length
const heldOnPhone = () => recoveryCodes(phone.storage, 'intros')
/** Nothing is waiting on the phone: no recovery key is left (Part 35). */
const nothingWaiting = () => recoveryKeys(phone.storage).length === 0

/** `window.location.replace`, observed: the app calls it when everything is confirmed, and a test must not leave the page. */
function watchReplace() {
  const replace = vi.fn()
  const real = window.location
  vi.stubGlobal(
    'location',
    new Proxy(real, {
      get: (t, k) => (k === 'replace' ? replace : Reflect.get(t, k)),
    }),
  )
  return replace
}

async function receipt() {
  const m = await mount(<App />)
  screen = m
  await m.press(/I’m looking for someone serious/)
  await m.press(/^I am a woman/)
  await m.press(/^Minneapolis/)
  await m.type('Email or phone', CONTACT)
  await m.press(/I confirm I am 18/)
  await m.press(/^Put my name down/)
  await m.until(() => m.text().includes('Your request was saved on'), 'the receipt')
  return { m, code: records()[0] }
}
async function throughTrust(m: Mounted) {
  await m.press(/^What we hold, exactly/)
  await m.press(/^Forget me$/)
  await m.press('Yes, delete everything')
}

describe('the real app, with an invalid success-looking answer and the handler never run', () => {
  it('does not replace the page, says it could not confirm, shows the code, clears her things, and a second tap that is answered finishes it', async () => {
    const replace = watchReplace()
    const { m, code } = await receipt()
    expect(replace).not.toHaveBeenCalled()
    const back = answerDelete(server, appHtml, false)
    await throughTrust(m)
    await m.until(() => m.text().includes('We could not confirm that your name came off the introduction list'), 'the unconfirmed message')
    expect(replace).not.toHaveBeenCalled()
    expect(m.text()).toContain(formatCode(code))
    noFalseClaims(m)
    // Her things are gone from the phone; the code is the one thing kept.
    expect(phone.keys()).toEqual([recoveryKey('intros', code)])
    expect(heldOnPhone()).toEqual([code])
    expect([...phone.storage.entries()].flat().join(' ')).not.toContain(CONTACT)
    expect(records()).toEqual([code])
    expect(deletes()).toBe(1)

    // The button is back, and tapping it again, now answered for real, finishes it and replaces the page.
    back()
    await m.press(/^Forget me$/)
    await m.press('Yes, delete everything')
    await m.until(() => records().length === 0, 'the record is deleted')
    await m.until(() => replace.mock.calls.length > 0, 'the page is replaced')
    expect(markers()).toEqual([`withdrawn/${code}/${day()}`])
    expect(phone.keys()).toEqual([])
  })

  it('every confirmed answer replaces the page, and nothing else does', async () => {
    const replace = watchReplace()
    const { m, code } = await receipt()
    await throughTrust(m)
    await m.until(() => replace.mock.calls.length > 0, 'the page is replaced')
    expect(records()).toEqual([])
    expect(markers()).toEqual([`withdrawn/${code}/${day()}`])
  })
})

describe('the real app, with the step count answered by an invalid success-looking answer', () => {
  it('does not replace the page, says it could not confirm, offers no hand-off, shows no step id, and a tap answered for real finishes it', async () => {
    const replace = watchReplace()
    const { m } = await receipt()
    const ids = blobs.keys('progress')
    expect(ids).toHaveLength(1)
    const back = answerDelete(server, appHtml, false, undefined, 'progress')
    await throughTrust(m)
    await m.until(() => m.text().includes('We could not confirm that the count of your steps was deleted'), 'the unconfirmed message')
    expect(replace).not.toHaveBeenCalled()
    expect(m.text()).not.toContain('Or write to')
    expect(m.text()).not.toContain(ids[0])
    for (const claim of NO_CLAIMS) expect(m.text(), claim).not.toContain(claim)
    expect(phone.keys()).toEqual([recoveryKey('installs', ids[0])])
    expect(phone.storage.get(recoveryKey('installs', ids[0]))).toBe('1')
    expect(blobs.keys('progress')).toEqual(ids)

    back()
    await m.press(/^Forget me$/)
    await m.press('Yes, delete everything')
    await m.until(() => replace.mock.calls.length > 0, 'the page is replaced')
    expect(blobs.keys('progress')).toEqual([])
    expect(phone.keys()).toEqual([])
  })
})

describe('the real app, in a browser that cannot save the recovery code', () => {
  it('shows the code, says it cannot try again after the page closes, and a tap in the same page sends it', async () => {
    phone.refuse(/^niyyah\.(intro|forget)/)
    const replace = watchReplace()
    const { m, code } = await receipt()
    expect(nothingWaiting()).toBe(true)
    const back = answerDelete(server, appHtml, false)
    await throughTrust(m)
    await m.until(() => m.text().includes('This browser could not save this recovery code'), 'the denied message')
    expect(m.text()).toContain(formatCode(code))
    expect(m.text()).toContain('cannot try again once this page is closed or reloaded')
    expect(nothingWaiting()).toBe(true)
    expect(replace).not.toHaveBeenCalled()
    expect(records()).toEqual([code])

    back()
    await m.press(/^Forget me$/)
    await m.press('Yes, delete everything')
    await m.until(() => records().length === 0, 'the record is deleted from the same page')
    await m.until(() => replace.mock.calls.length > 0, 'the page is replaced')
  })
})

describe('the launch retry, on the same contract', () => {
  /** A record the server has, and a forget that left its code behind. */
  async function leftBehind(): Promise<string> {
    const { m, code } = await receipt()
    const back = answerDelete(server, appHtml, false)
    await throughTrust(m)
    await m.until(() => m.text().includes('We could not confirm'), 'the unconfirmed message')
    back()
    m.unmount()
    screen = undefined
    reload()
    return code
  }

  it('an invalid success-looking answer keeps the code; a later valid answer on the next launch finishes it, with no tap', async () => {
    const code = await leftBehind()
    expect(heldOnPhone()).toEqual([code])
    const before = deletes()

    // The app opens, and the answer is still wrong: the launch retry asks once, and keeps the code.
    const back = answerDelete(server, appHtml, false)
    const opened = await mount(<App />)
    screen = opened
    await opened.until(() => deletes() === before + 1, 'the launch retry asks')
    await opened.settle()
    expect(heldOnPhone()).toEqual([code])
    expect(records()).toEqual([code])
    opened.unmount()
    screen = undefined
    reload()
    back()

    // The next launch is answered for real: the code goes, the record goes, one marker.
    const again = await mount(<App />)
    screen = again
    await again.until(() => nothingWaiting(), 'the pending forget is finished')
    expect(records()).toEqual([])
    expect(markers()).toEqual([`withdrawn/${code}/${day()}`])
    expect(deletes()).toBe(before + 2)
  })

  it('a lost answer after a real deletion stays unconfirmed until a valid one: the next launch\'s answer, `removed: false`, resolves it', async () => {
    const { m, code } = await receipt()
    // The deletion runs on the server; the answer is cut on the way back.
    const back = answerDelete(server, () => new Response(null, { status: 204 }), true)
    await throughTrust(m)
    await m.until(() => m.text().includes('We could not confirm'), 'the unconfirmed message')
    expect(records()).toEqual([])
    expect(heldOnPhone()).toEqual([code])
    back()
    m.unmount()
    screen = undefined
    reload()

    const again = await mount(<App />)
    screen = again
    await again.until(() => nothingWaiting(), 'the pending forget is finished')
    expect(markers()).toEqual([`withdrawn/${code}/${day()}`])
  })
})

describe('the real app, when this phone cannot list what it holds', () => {
  it('does not replace the page on an answered delete, says it could not check, and a tap once storage can be read finishes it', async () => {
    const replace = watchReplace()
    const { m } = await receipt()
    phone.scanRefused = true
    await throughTrust(m)
    await m.until(() => m.text().includes('We could not check whether anything from an earlier attempt'), 'the unchecked message')
    expect(replace).not.toHaveBeenCalled()
    expect(records()).toEqual([])
    phone.scanRefused = false
    await m.press(/^Forget me$/)
    await m.press('Yes, delete everything')
    await m.until(() => replace.mock.calls.length > 0, 'the page is replaced')
  })
})

describe('the real app, when an older tab changes the record this build imports from', () => {
  it('a storage event on that key reaches the listener: the codes in its old and new values are kept under recovery keys', async () => {
    const m = await mount(<App />)
    screen = m
    window.dispatchEvent(new StorageEvent('storage', { key: 'niyyah.forget.pending.v1', oldValue: JSON.stringify({ code: 'ACDEFG' }), newValue: JSON.stringify({ id: 'HJKMNPQR' }) }))
    expect(recoveryCodes(phone.storage, 'maps')).toEqual(['ACDEFG'])
    expect(recoveryCodes(phone.storage, 'installs')).toEqual(['HJKMNPQR'])
    expect(phone.storage.has('niyyah.forget.pending.v1')).toBe(false)
    // After the page goes away the listener goes with it.
    m.unmount()
    screen = undefined
    window.dispatchEvent(new StorageEvent('storage', { key: 'niyyah.forget.pending.v1', oldValue: null, newValue: JSON.stringify({ code: 'CDEFGH' }) }))
    expect(recoveryCodes(phone.storage, 'maps')).toEqual(['ACDEFG'])
  })
})
