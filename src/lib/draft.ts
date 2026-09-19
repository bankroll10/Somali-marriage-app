import type { Gender } from '../types'

/**
 * Nine answers, and then the phone rang.
 *
 * The read and the eleven kept their answers in component state, so leaving
 * either one before the last question destroyed every answer given — silently,
 * with no warning and nothing on the way back in to say it had happened. The
 * device already recorded that she *began* (src/data/instruments.ts, the
 * `began` bit), so the product knew, and greeted her on her return as though
 * she had never been there.
 *
 * Under BJ Fogg's model this is the clearest failure in the product: at
 * question nine motivation is as high as it will ever be — she has spent
 * ninety seconds and is one tap from the thing she came for — and ability
 * drops to zero for a reason that has nothing to do with her
 * (docs/FOGG.md). Nothing here raises motivation. It removes an obstacle.
 *
 * Three rules, so this never becomes something else:
 *
 *  1. **It is offered, never pushed.** A draft is read on the way into an
 *     instrument and nowhere else. No badge, no reminder, no notification, no
 *     count of unfinished things on any screen. If she never comes back, the
 *     product never mentions it.
 *  2. **It expires.** A read half-answered a month ago is about a person she
 *     may not be speaking to any more, and offering it back would be worse
 *     than losing it. After `STALE_DAYS` it is gone.
 *  3. **It stays on the device.** Its own key, like the keep code and the via
 *     — deliberately *not* part of the kept snapshot, so it never reaches the
 *     server and Trust's account of what leaves the phone stays true without
 *     changing a word. Half-answered questions about somebody are the most
 *     ambiguous thing this product could hold, so it holds them in one place
 *     only, and lets them go.
 */

const KEY = 'niyyah.draft.v1'

/** A read half-answered a month ago is about a person, not a questionnaire. */
export const STALE_DAYS = 30
const DAY_MS = 24 * 60 * 60 * 1000

/** The two instruments a person can be dropped out of mid-way. */
export type DraftKind = 'read' | 'eleven'

export interface Draft {
  /** Answers so far, by question id. */
  answers: Record<string, string>
  /** Which side it is being taken as, so resuming asks the same questions. */
  gender: Gender
  /** The day it was last touched. A day, never a time — as everywhere else. */
  at: string
}

type Store = Partial<Record<DraftKind, Draft>>

function read(): Store {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    return parsed && typeof parsed === 'object' ? (parsed as Store) : {}
  } catch {
    return {}
  }
}

function write(store: Store) {
  try {
    if (Object.keys(store).length === 0) localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, JSON.stringify(store))
  } catch {
    /* storage refused — she loses nothing she had before this existed */
  }
}

export function isStale(draft: Draft, now = Date.now()): boolean {
  const at = Date.parse(draft.at)
  return !Number.isFinite(at) || now - at >= STALE_DAYS * DAY_MS
}

/**
 * What she has answered so far, or nothing.
 *
 * Returns nothing for an empty or stale draft, and clears a stale one on the
 * way past — the only place expiry happens, so it needs no sweep.
 */
export function loadDraft(kind: DraftKind, now = Date.now()): Draft | null {
  const store = read()
  const draft = store[kind]
  if (!draft || typeof draft !== 'object' || !draft.answers) return null
  if (Object.keys(draft.answers).length === 0) return null
  if (isStale(draft, now)) {
    clearDraft(kind)
    return null
  }
  return draft
}

/** Remember where she is. Called on every answer; the last one clears it. */
export function saveDraft(kind: DraftKind, answers: Record<string, string>, gender: Gender, now = new Date()) {
  if (Object.keys(answers).length === 0) return clearDraft(kind)
  write({ ...read(), [kind]: { answers, gender, at: now.toISOString().slice(0, 10) } })
}

export function clearDraft(kind: DraftKind) {
  const store = read()
  if (!(kind in store)) return
  delete store[kind]
  write(store)
}

/** Everything, for Start over and Forget me. */
export function clearAllDrafts() {
  write({})
}

/**
 * Where to pick up: the first question she has not answered.
 *
 * Indexed by the instrument's *current* question order rather than by how many
 * she answered, for the reason `resume` in useNiyyah gives — a count drifts the
 * moment the question set changes, and would skip a real question for anyone
 * who paused before an edit.
 */
export function resumeIndex(ids: string[], answers: Record<string, string>): number {
  const first = ids.findIndex((id) => answers[id] === undefined)
  return first === -1 ? Math.max(0, ids.length - 1) : first
}

/** "You answered 9 of 11." Counts only answers the instrument still asks for. */
export function answeredOf(ids: string[], answers: Record<string, string>): number {
  return ids.filter((id) => answers[id] !== undefined).length
}
