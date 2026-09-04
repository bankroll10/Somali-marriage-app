import type {
  Answers,
  MapSnapshot,
  CoachMessage,
  Identity,
  ModeId,
  PlusState,
  ReadRecord,
  CoupleState,
  FollowUp,
  VouchState,
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
  /** Every reading ever made, oldest first — the record of what changed. */
  mapHistory: MapSnapshot[]
  /** Where they are in the arc — the product follows them past the match. */
  stage: Stage
  /** She chose a situation rather than landing on the default. */
  situated: boolean
  /** Work taken on from the map, open and completed — oldest first. */
  steps: StepRecord[]
  /** Trial state + this month's guide allowance. */
  plus: PlusState
  /** Their saved place, once they've asked for one. */
  waitlist: WaitlistState | null
  /** The most recent read they took on someone. */
  read: ReadRecord | null
  /** Before you say yes — which of the eleven conversations they've had. */
  beforeYes: ReadRecord | null
  /** The two-sided Before you say yes she started, if any. */
  couple: CoupleState | null
  /** A family member's vouch, once given. */
  vouch: VouchState | null
  /** What the product told her to do, and how it went. */
  followups: FollowUp[]
  completed: boolean
  /** Guide threads — the guide remembers between visits. */
  coachThreads: Partial<Record<ModeId, CoachMessage[]>>
}

interface Persisted extends PersistedState {
  updatedAt: number
}

export function loadProgress(): Persisted | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    // Older saves also carried check-ins and a first-seen date. Neither is read
    // any more; they fall away on the next save.
    const p = JSON.parse(raw) as Partial<Persisted> & {
      waitlist?: (Partial<WaitlistState> & { email?: string }) | null
    }
    return {
      answers: p.answers ?? {},
      identity: p.identity ?? {},
      // Only the control that is real survives; five dead toggles fall away on
      // the next save rather than being carried forever.
      trust: {
        guideOnDevice: (p.trust as Partial<TrustSettings> | undefined)?.guideOnDevice ?? defaultTrust.guideOnDevice,
        countMe: (p.trust as Partial<TrustSettings> | undefined)?.countMe ?? defaultTrust.countMe,
      },
      // Older readings stored a number and no answers. They keep their date and
      // headline; the number is dropped, and with no answers they simply
      // produce no "what changed" lines.
      mapHistory: (p.mapHistory ?? []).map((m) => ({
        date: m.date,
        headline: m.headline,
        grounds: m.grounds ?? {},
        answers: m.answers ?? {},
      })),
      stage: p.stage ?? 'preparing',
      // Anyone who already moved off the default, or finished a map, told us
      // where she was — even if she did it before we recorded the choice.
      situated: p.situated ?? ((p.stage !== undefined && p.stage !== 'preparing') || !!p.completed),
      steps: p.steps ?? [],
      plus: { ...defaultPlus, ...(p.plus ?? {}) },
      // Earlier saves stored an email; the field now holds email or phone.
      waitlist: p.waitlist
        ? { ...p.waitlist, contact: p.waitlist.contact ?? p.waitlist.email ?? '', joinedAt: p.waitlist.joinedAt ?? '' }
        : null,
      read: p.read ?? null,
      beforeYes: p.beforeYes ?? null,
      couple: p.couple ?? null,
      vouch: p.vouch ?? null,
      followups: p.followups ?? [],
      completed: p.completed ?? false,
      coachThreads: p.coachThreads ?? {},
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
