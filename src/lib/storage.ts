import type {
  Answers,
  BegunInstruments,
  EndedRecord,
  EndingRecord,
  MapSnapshot,
  CoachMessage,
  GuideUse,
  Identity,
  ModeId,
  ReadRecord,
  CoupleState,
  FollowUp,
  Stage,
  TrustSettings,
} from '../types'
import { defaultGuideUse, defaultTrust } from '../types'

const KEY = 'niyyah.intake.v1'
const KNOWN_MODES = new Set<string>(['auntie', 'brother', 'therapist', 'islamic', 'matchmaker'])

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
  /** Replies spent, ever — measured against a budget her progress grants. */
  guide: GuideUse
  /** The most recent read they took on someone. */
  read: ReadRecord | null
  /** Before you say yes — which of the eleven conversations they've had. */
  beforeYes: ReadRecord | null
  /** The two-sided Before you say yes she started, if any. */
  couple: CoupleState | null
  /** What she told us on the way out, once she has married. The success state. */
  ending: EndingRecord | null
  /** Courtships that ended, oldest first, the last eight. See src/data/ended.ts. */
  endings: EndedRecord[]
  /** Which questionnaires she began. See src/data/instruments.ts. */
  began: BegunInstruments
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
    // Older saves also carried check-ins, a first-seen date, work steps, a
    // place at the door, a vouch and a hesitation. None is read any more; they
    // fall away on the next save.
    const p = JSON.parse(raw) as Partial<Persisted> & {
      /** The old monthly allowance and trial. Only what was spent carries over. */
      plus?: { usage?: { used?: number } } | null
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
      guide: p.guide ?? { replies: p.plus?.usage?.used ?? defaultGuideUse.replies },
      read: p.read ?? null,
      beforeYes: p.beforeYes ?? null,
      couple: p.couple ?? null,
      ending: p.ending ?? null,
      endings: p.endings ?? [],
      began: Array.isArray(p.began) ? p.began.filter((id): id is string => typeof id === 'string') : [],
      followups: p.followups ?? [],
      completed: p.completed ?? false,
      // A thread with a voice that no longer exists (the Profile Coach) is dropped.
      coachThreads: Object.fromEntries(
        Object.entries(p.coachThreads ?? {}).filter(([mode]) => KNOWN_MODES.has(mode)),
      ) as PersistedState['coachThreads'],
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
/**
 * Messages kept per guide voice. The guide only ever reads the last ten turns
 * (netlify/functions/guide.ts), and every thread was kept whole, for ever, on
 * the phone — the most sensitive words in the product, in her own hand, for
 * anyone holding it to scroll (docs/PRIVACY.md, R6). Forty is a long evening's
 * conversation, and four times what the guide can see.
 */
export const THREAD_LIMIT = 40

/**
 * Set once this page has put a different map in storage and is about to
 * reload onto it (RestoreMap). Until the reload lands, the page still holds the
 * map it started with — on a new phone, an empty one — and the autosave in
 * useNiyyah would write that back over the map she just brought back: her
 * code remembered, her map gone (found by tests/journeys/keep-and-restore).
 * A reload is a new page, and a new page starts unheld.
 */
let replaced = false
export function holdUntilReload(): void {
  replaced = true
}
/** Tests reload by mounting again in the same page. */
export function reloaded(): void {
  replaced = false
}

export function saveProgress(state: PersistedState): boolean {
  // Nothing to save: what is in storage is newer than anything this page holds.
  if (replaced) return true
  try {
    const coachThreads = Object.fromEntries(
      Object.entries(state.coachThreads ?? {}).map(([mode, thread]) => [mode, (thread ?? []).slice(-THREAD_LIMIT)]),
    )
    const data: Persisted = { ...state, coachThreads, updatedAt: Date.now() }
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
