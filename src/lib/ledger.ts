import type { Answers, ReadRecord, VouchState, WaitlistState } from '../types'

/**
 * The ledger — what a person has actually done here.
 *
 * Every marriage app has a "marriage-minded" checkbox, and everyone ticks it,
 * so it means nothing. This is the alternative: not what she says she is, but
 * what she has done — built a map, read a man, worked through the eleven, said
 * how she'd live, kept it, been counted, been vouched for. Each costs time and
 * honesty. None can be tapped.
 *
 * Deliberately not a score. There is no number, no percentage, no "trust
 * level". Seven facts, each true or not yet, in the order a serious person
 * tends to do them. When a city opens this is what decides who meets whom —
 * and she is told that plainly, so that the effort is a choice, not a trick.
 *
 * Pure: everything it needs is passed in, including the kept code, so it can
 * be tested without a browser and never reads storage itself.
 */

export type LedgerId = 'map' | 'read' | 'beforeYes' | 'living' | 'kept' | 'counted' | 'vouched'

export interface LedgerEntry {
  id: LedgerId
  /** As it appears in the list. */
  label: string
  done: boolean
  /** A fact about her, in either state. Never praise, never a nudge. */
  line: string
}

export interface LedgerInput {
  completed: boolean
  read: ReadRecord | null
  beforeYes: ReadRecord | null
  answers: Answers
  keptCode: string | null
  waitlist: WaitlistState | null
  vouch: VouchState | null
}

export const LEDGER_IDS: LedgerId[] = ['map', 'read', 'beforeYes', 'living', 'kept', 'counted', 'vouched']

const LIVING = ['household', 'work', 'money-home']

export function ledger(i: LedgerInput): LedgerEntry[] {
  const living = LIVING.every((id) => typeof i.answers[id] === 'string' && i.answers[id] !== '')
  const rows: Record<LedgerId, { label: string; done: boolean; yes: string; no: string }> = {
    map: {
      label: 'Built your map',
      done: i.completed,
      yes: 'You built your map.',
      no: 'You haven’t built your map yet.',
    },
    read: {
      label: 'Took a read on someone',
      done: !!i.read,
      yes: 'You took a read on someone.',
      no: 'You haven’t taken a read on anyone.',
    },
    beforeYes: {
      label: 'Worked through the eleven',
      done: !!i.beforeYes,
      yes: 'You worked through the eleven conversations.',
      no: 'You haven’t been through the eleven yet.',
    },
    living: {
      label: 'Said how you’d live',
      done: living,
      yes: 'You said how you’d live — whose house, work, money home.',
      no: 'You haven’t said how you’d live yet.',
    },
    kept: {
      label: 'Kept your map',
      done: !!i.keptCode,
      yes: 'Your map is kept under a code.',
      no: 'Your map lives only on this phone.',
    },
    counted: {
      label: 'Counted in your city',
      done: !!i.waitlist,
      yes: 'You’re counted in your city.',
      no: 'You’re not counted yet.',
    },
    vouched: {
      label: 'Vouched for by family',
      done: !!i.vouch,
      yes: 'Your family has vouched for you.',
      no: 'Nobody in your family has vouched yet.',
    },
  }
  return LEDGER_IDS.map((id) => {
    const r = rows[id]
    return { id, label: r.label, done: r.done, line: r.done ? r.yes : r.no }
  })
}

/** The ids that are done — what travels with her place in the cohort. */
export function ledgerDone(i: LedgerInput): LedgerId[] {
  return ledger(i)
    .filter((e) => e.done)
    .map((e) => e.id)
}
