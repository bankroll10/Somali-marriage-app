import type {
  Answers,
  CheckIn,
  MapSnapshot,
  CoachMessage,
  ConvMessage,
  Identity,
  ModeId,
  PlusState,
  Stage,
  StepRecord,
  TrustSettings,
  WaitlistState,
} from '../types'
import { defaultPlus, defaultTrust } from '../types'

const KEY = 'niyyah.intake.v1'

export interface PersistedState {
  answers: Answers
  identity: Identity
  trust: TrustSettings
  /** Check-in history, newest entries appended; capped in the hook. */
  checkIns: CheckIn[]
  /** Date key of the user's first visit — powers journey milestones. */
  firstSeen: string
  /** Every readiness reading ever made, oldest first — the record of growth. */
  mapHistory: MapSnapshot[]
  /** Where they are in the arc — the product follows them past the match. */
  stage: Stage
  /** Work taken on from the map, open and completed — oldest first. */
  steps: StepRecord[]
  /** Trial state + this month's guide allowance. */
  plus: PlusState
  /** Their saved place, once they've asked for one. */
  waitlist: WaitlistState | null
  completed: boolean
  // Social + guide state — the product must remember everything between visits.
  matched: string[]
  pendingInterest: string[]
  passed: string[]
  conversations: Record<string, ConvMessage[]>
  coachThreads: Partial<Record<ModeId, CoachMessage[]>>
  /** Optional "what stood out" note per candidate, keyed by candidate id. */
  interestNotes: Record<string, string>
}

interface Persisted extends PersistedState {
  updatedAt: number
}

export function loadProgress(): Persisted | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as Partial<Persisted> & {
      checkIn?: CheckIn | null
      waitlist?: (Partial<WaitlistState> & { email?: string }) | null
    }
    return {
      answers: p.answers ?? {},
      identity: p.identity ?? {},
      trust: { ...defaultTrust, ...(p.trust ?? {}) },
      // Legacy blobs stored a single `checkIn` — fold it into history.
      checkIns: p.checkIns ?? (p.checkIn ? [p.checkIn] : []),
      firstSeen: p.firstSeen ?? '',
      mapHistory: p.mapHistory ?? [],
      stage: p.stage ?? 'preparing',
      steps: p.steps ?? [],
      plus: { ...defaultPlus, ...(p.plus ?? {}) },
      // Earlier saves stored an email; the field now holds email or phone.
      waitlist: p.waitlist
        ? { ...p.waitlist, contact: p.waitlist.contact ?? p.waitlist.email ?? '', joinedAt: p.waitlist.joinedAt ?? '' }
        : null,
      completed: p.completed ?? false,
      matched: p.matched ?? [],
      pendingInterest: p.pendingInterest ?? [],
      passed: p.passed ?? [],
      conversations: p.conversations ?? {},
      coachThreads: p.coachThreads ?? {},
      interestNotes: p.interestNotes ?? {},
      updatedAt: p.updatedAt ?? 0,
    }
  } catch {
    return null
  }
}

/**
 * Persist the journey. Returns false when the browser refuses to store —
 * private browsing, a full quota, or storage disabled entirely.
 *
 * The caller MUST surface a failure: silently pretending to save is how a user
 * spends ten minutes on their reflection and finds it gone tomorrow.
 */
export function saveProgress(state: PersistedState): boolean {
  try {
    const data: Persisted = { ...state, updatedAt: Date.now() }
    localStorage.setItem(KEY, JSON.stringify(data))
    return true
  } catch {
    return false
  }
}

export function clearProgress() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}
