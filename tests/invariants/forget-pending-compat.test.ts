import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { forgetMe, pendingForget, resetForgetMirror } from '../../src/lib/forget'
import { Phone, onPhone } from '../support/device'
import { failedForget07d, read07d, save07d, unconfirmedRetry07d } from '../support/forget-07d'

/**
 * COMPATIBILITY — what the build before this one does with a pending-forget record
 * this build wrote (docs/DECISIONS.md Part 34).
 *
 * This is a demonstration of what survives and what is lost. It does not make the
 * risk go away: **a build that can read what an older build wrote is not a build an
 * older build can read.** The older build here is BATCH-07D's reader and writer, kept
 * as a fixture (tests/support/forget-07d.ts). An old tab left open across an upgrade,
 * a cached shell, or a rollback can run it against the same `localStorage`; it does
 * not need a deletion to succeed to rewrite the file — a failed one rewrites it too.
 *
 * Two codes of one kind are the only case the new fields exist for, and the only one
 * an older build cannot keep.
 */

const PENDING = 'niyyah.forget.pending.v1'
const MAPS = ['ACDEFG', 'CDEFGH']
const IDS = ['HJKMNPQR', 'JKMNPQRT']
const PAIRS = ['QRTWXY', 'RTWXY3']
const INTROS = ['QRTWXY34', 'XY347QRT']

let phone: Phone
beforeEach(() => {
  phone = onPhone(new Phone('hers'))
  resetForgetMirror()
  vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
})
afterEach(() => vi.unstubAllGlobals())

const file = () => JSON.parse(phone.storage.get(PENDING)!) as Record<string, unknown>

/** A record with two codes of each kind, written by this build: two unresolved forgets in a row. */
async function twoOfEach() {
  phone.storage.set('niyyah.keep.code.v1', MAPS[0])
  phone.storage.set('niyyah.install.v1', IDS[0])
  phone.storage.set('niyyah.intake.v1', JSON.stringify({ answers: {}, couple: { code: PAIRS[0], sentAt: 'x' } }))
  phone.storage.set('niyyah.intro.v1', JSON.stringify({ code: INTROS[0], at: '2026-09-27', removeOn: '2027-03-21' }))
  await forgetMe()
  phone.storage.set('niyyah.keep.code.v1', MAPS[1])
  phone.storage.set('niyyah.install.v1', IDS[1])
  phone.storage.set('niyyah.intake.v1', JSON.stringify({ answers: {}, couple: { code: PAIRS[1], sentAt: 'x' } }))
  phone.storage.set('niyyah.intro.v1', JSON.stringify({ code: INTROS[1], at: '2026-09-27', removeOn: '2027-03-21' }))
  await forgetMe()
}

describe('a record with one code of each kind is the file the build before it writes', () => {
  it('byte for byte, and both builds read it the same way', async () => {
    phone.storage.set('niyyah.keep.code.v1', MAPS[0])
    phone.storage.set('niyyah.install.v1', IDS[0])
    phone.storage.set('niyyah.intake.v1', JSON.stringify({ answers: {}, couple: { code: PAIRS[0], sentAt: 'x' } }))
    phone.storage.set('niyyah.intro.v1', JSON.stringify({ code: INTROS[0], at: '2026-09-27', removeOn: '2027-03-21' }))
    await forgetMe()
    const mine = phone.storage.get(PENDING)!
    phone.storage.delete(PENDING)
    save07d({ code: MAPS[0], id: IDS[0], pair: PAIRS[0], intros: [INTROS[0]] })
    expect(mine).toBe(phone.storage.get(PENDING))
    expect(read07d()).toEqual({ code: MAPS[0], id: IDS[0], pair: PAIRS[0], intros: [INTROS[0]] })
  })
})

describe('a record with two codes of a kind, read by the build before it', () => {
  it('shows it the first code of each kind and no other: the second is not retried, and is not there for it', async () => {
    await twoOfEach()
    expect(file()).toEqual({
      code: MAPS[0],
      moreCodes: [MAPS[1]],
      id: IDS[0],
      moreIds: [IDS[1]],
      pair: PAIRS[0],
      morePairs: [PAIRS[1]],
      intros: [...INTROS].sort(),
    })
    // This build holds all of it…
    expect(pendingForget()).toEqual({ maps: MAPS, installs: IDS, pairs: PAIRS, intros: [...INTROS].sort() })
    // …the build before it holds one of each, and both introduction codes (it reads `intros`).
    expect(read07d()).toEqual({ code: MAPS[0], id: IDS[0], pair: PAIRS[0], intros: [...INTROS].sort() })
  })

  it('and when it rewrites the file after a Forget me whose deletes did not land, the second codes are gone — nothing had to succeed', async () => {
    await twoOfEach()
    // The old build, on a phone that now holds one more of each (which it asks about and cannot reach).
    failedForget07d({ code: 'DEFGHJ', id: 'KMNPQRTW', pair: 'WXY347' })
    // What it wrote: its own new codes replaced the slots (the single-slot overwrite, as before), and the file
    // holds nothing of what this build kept in the fields it does not know.
    expect(file()).toEqual({ code: 'DEFGHJ', id: 'KMNPQRTW', pair: 'WXY347', intros: [...INTROS].sort() })
    expect(JSON.stringify(file())).not.toContain('more')
    // Survives: the introduction codes (07D keeps a list). Lost: every code this build had kept in `more*`, and
    // the first codes the old build's own slots overwrote — the loss BATCH-07E removes, and cannot remove for a
    // build that is not 07E.
    expect(pendingForget()).toEqual({ maps: ['DEFGHJ'], installs: ['KMNPQRTW'], pairs: ['WXY347'], intros: [...INTROS].sort() })
    const survivors = [file().code, file().id, file().pair, ...(file().intros as string[])]
    for (const lost of [...MAPS, ...IDS, ...PAIRS]) expect(survivors).not.toContain(lost)
  })

  it('and when its launch retry settles with nothing confirmed, it still rewrites the file: the overflow goes, the first codes stay', async () => {
    await twoOfEach()
    unconfirmedRetry07d()
    expect(file()).toEqual({ code: MAPS[0], id: IDS[0], pair: PAIRS[0], intros: [...INTROS].sort() })
    // Survives: the first code of each kind, and the introduction list. Lost: MAPS[1], IDS[1], PAIRS[1].
    expect(pendingForget()).toEqual({ maps: [MAPS[0]], installs: [IDS[0]], pairs: [PAIRS[0]], intros: [...INTROS].sort() })
  })
})

describe('the other direction, which is not downgrade compatibility', () => {
  it('this build reads what the build before it wrote — the slots and the introduction fields', () => {
    phone.storage.set(PENDING, JSON.stringify({ code: MAPS[0], id: IDS[0], pair: PAIRS[0], intro: INTROS[0], introPending: INTROS[1] }))
    expect(pendingForget()).toEqual({ maps: [MAPS[0]], installs: [IDS[0]], pairs: [PAIRS[0]], intros: [...INTROS].sort() })
  })
})
