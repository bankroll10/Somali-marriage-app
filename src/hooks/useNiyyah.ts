import { useEffect, useMemo, useRef, useState } from 'react'
import { allQuestions, totalQuestions } from '../data/intake'
import { todayKey } from '../data/checkin'
import { getCandidate } from '../data/candidates'
import { track } from '../lib/analytics'
import { applyDemoParams } from '../lib/demo'
import { buildReflection, generateReflection } from '../lib/reflection'
import { routeToMode } from '../lib/route'
import { clearProgress, loadProgress, saveProgress } from '../lib/storage'
import { flushWaitlistQueue } from '../lib/waitlist'
import { getStage } from '../data/stages'
import { defaultPlus, defaultTrust } from '../types'
import { FREE_REPLIES, TRIAL_DAYS } from '../data/plus'
import type {
  Answers,
  AnswerValue,
  CheckIn,
  Dimension,
  CoachMessage,
  Gender,
  ConvMessage,
  Identity,
  MapSnapshot,
  ModeId,
  MoodId,
  PlusState,
  Reflection,
  Stage,
  StepRecord,
  TrustSettings,
  ReadRecord,
  WaitlistState,
} from '../types'

export type Screen =
  | 'welcome'
  | 'identity'
  | 'situation'
  | 'hook'
  | 'intake'
  | 'generating'
  | 'reflection'
  | 'home'
  | 'coach'
  | 'trust'
  | 'philosophy'
  | 'profile'
  | 'sample'
  | 'read'
  | 'beforeYes'
  | 'families'
  | 'connections'
  | 'conversation'
  | 'plus'

const SAVE_DEBOUNCE_MS = 250
/** Reciprocation lands after a human pause: base + up to JITTER extra. */
const RECIPROCATE_BASE_MS = 6000
const RECIPROCATE_JITTER_MS = 3000

/**
 * The app's single source of truth: journey state, persistence, and actions.
 * Screens stay dumb; App stays a router.
 */
export function useNiyyah() {
  // ?fresh / ?demo presentation switches run before saved state loads.
  const saved = useMemo(() => {
    applyDemoParams()
    return loadProgress()
  }, [])

  // ── Journey state ──────────────────────────────────────────────────────────
  // Returning members land in their space — no landing page in between.
  // Returning members land in their space. A member has a space once she has a
  // map OR has told us where she is — a woman mid-process has a Home without
  // ever answering the intake.
  const [screen, setScreen] = useState<Screen>(
    saved && (saved.completed || saved.stage !== 'preparing') ? 'home' : 'welcome',
  )
  // Where Identity hands off: the situation question on a fresh start; straight
  // to the hook when she is building the map from an instrument she already used.
  const [identityNext, setIdentityNext] = useState<'situation' | 'hook'>('situation')
  const [identity, setIdentity] = useState<Identity>(saved?.identity ?? {})
  const [answers, setAnswers] = useState<Answers>(saved?.answers ?? {})
  const [trust, setTrust] = useState<TrustSettings>(saved?.trust ?? defaultTrust)
  const [checkIns, setCheckIns] = useState<CheckIn[]>(saved?.checkIns ?? [])
  // First day on the path — set once, kept forever (until a full reset).
  const [firstSeen, setFirstSeen] = useState<string>(saved?.firstSeen || todayKey())
  // Every reading ever made — the map becomes a record of growth, not a verdict.
  const [mapHistory, setMapHistory] = useState<MapSnapshot[]>(saved?.mapHistory ?? [])
  // Where they are in the whole arc. The product keeps serving them past the
  // match — success should never mean churn.
  const [stage, setStageRaw] = useState<Stage>(saved?.stage ?? 'preparing')
  // The work taken on from the map. One open at a time; finished ones are kept
  // forever — they're the only honest record of change the app can show.
  const [steps, setSteps] = useState<StepRecord[]>(saved?.steps ?? [])
  // Niyyah+ — the trial takes no card, so it can only ever run out.
  const [plus, setPlus] = useState<PlusState>(saved?.plus ?? defaultPlus)
  // The saved place — the one piece of state that leaves this device.
  const [waitlist, setWaitlist] = useState<WaitlistState | null>(saved?.waitlist ?? null)
  // The last read she took on someone. Answers only; the reading is recomputed.
  const [read, setRead] = useState<ReadRecord | null>(saved?.read ?? null)
  // Before you say yes — which conversations she and he have actually had.
  const [beforeYes, setBeforeYes] = useState<ReadRecord | null>(saved?.beforeYes ?? null)
  const [reflection, setReflection] = useState<Reflection | null>(() =>
    saved?.completed ? buildReflection(saved.answers) : null,
  )
  const [resumeIndex, setResumeIndex] = useState(0)
  // True when the hook insight already previewed chapter 1 — intake starts at Q1.
  const [skipFirstIntro, setSkipFirstIntro] = useState(false)
  // True only for the one-time map reveal right after generating.
  const [mapReveal, setMapReveal] = useState(false)
  const [philosophyReturn, setPhilosophyReturn] = useState<'welcome' | 'home'>('welcome')
  // Set when a surface hands the guide a specific topic (e.g. the map's next step).
  const [guideMode, setGuideMode] = useState<ModeId | null>(null)
  // A question captured elsewhere, waiting to be asked on arrival.
  const [guideAsk, setGuideAsk] = useState<{ text: string; why: string } | null>(null)
  // Trust lives under Profile.
  const [trustReturn, setTrustReturn] = useState<'profile'>('profile')

  // ── Social state (persisted — the product remembers between visits) ────────
  // Interest that was pending when they left resolves while they were away:
  // returning users find reciprocators have answered. Coming back is a reward.
  const returned = useMemo(() => {
    const stillPending: string[] = []
    const nowMatched = [...(saved?.matched ?? [])]
    for (const id of saved?.pendingInterest ?? []) {
      if (getCandidate(id)?.reciprocates) {
        if (!nowMatched.includes(id)) nowMatched.push(id)
      } else {
        stillPending.push(id)
      }
    }
    return { matched: nowMatched, pending: stillPending }
  }, [saved])

  const [matched, setMatched] = useState<string[]>(returned.matched)
  // Interest sent, no answer yet — reciprocation takes a human pause, and not everyone says yes.
  const [pendingInterest, setPendingInterest] = useState<string[]>(returned.pending)
  // People the user passed on — out of today's introductions.
  const [passed, setPassed] = useState<string[]>(saved?.passed ?? [])
  const [conversations, setConversations] = useState<Record<string, ConvMessage[]>>(
    saved?.conversations ?? {},
  )
  const [activeMatch, setActiveMatch] = useState<string | null>(null)
  // Guide threads survive navigation AND reloads — the guide remembers.
  const [coachThreads, setCoachThreads] = useState<Partial<Record<ModeId, CoachMessage[]>>>(
    saved?.coachThreads ?? {},
  )
  // Optional "what stood out" per candidate — carried into the conversation.
  const [interestNotes, setInterestNotes] = useState<Record<string, string>>(
    saved?.interestNotes ?? {},
  )

  // Completion is live state, not the load-time snapshot — otherwise "Start
  // over" leaves a stale completed=true and Welcome offers a map built from
  // empty answers.
  const [everCompleted, setEverCompleted] = useState(!!saved?.completed)
  // Bumped on reset so in-flight reciprocation timers from the previous
  // session can't inject matches into a fresh one.
  const sessionEpoch = useRef(0)

  // ── Derived ────────────────────────────────────────────────────────────────
  const completed = !!reflection || everCompleted
  // A Home exists for anyone with a map, or anyone who has said where she is.
  // `completed` keeps meaning "the intake is done"; this is the wider door.
  const hasHome = completed || stage !== 'preparing'
  const answeredCount = Object.keys(answers).length
  const hasProgress = (answeredCount > 0 || !!identity.gender) && !hasHome
  const todayEntry = checkIns.find((c) => c.date === todayKey())
  const todayMood: MoodId | null = todayEntry?.mood ?? null

  // ── Niyyah+ ────────────────────────────────────────────────────────────────
  // The allowance resets on the calendar month; a stale month reads as zero used
  // rather than being rewritten on load, so nothing is persisted just by looking.
  const thisMonth = todayKey().slice(0, 7)
  const usedThisMonth = plus.usage.month === thisMonth ? plus.usage.used : 0
  const trialDaysLeft = plus.trialStarted
    ? Math.max(
        0,
        TRIAL_DAYS -
          Math.round(
            (new Date(`${todayKey()}T00:00:00`).getTime() -
              new Date(`${plus.trialStarted}T00:00:00`).getTime()) /
              86_400_000,
          ),
      )
    : 0
  const plusActive = trialDaysLeft > 0
  const trialUsed = plus.trialTaken
  const repliesLeft = plusActive ? Infinity : Math.max(0, FREE_REPLIES - usedThisMonth)

  // False when the browser refuses to persist (private mode, full quota). The
  // UI must say so — a silent failure costs the user their whole reflection.
  const [saveOk, setSaveOk] = useState(true)

  // A signup stranded by a bad connection is a real person lost — retry once
  // per load until the server takes it.
  useEffect(() => {
    void flushWaitlistQueue()
  }, [])

  // ── Persistence (debounced — the bio textarea saves per keystroke otherwise)
  useEffect(() => {
    const t = window.setTimeout(
      () =>
        setSaveOk(
          saveProgress({
            answers,
            identity,
            trust,
            checkIns,
            firstSeen,
            mapHistory,
            stage,
            steps,
            plus,
            waitlist,
            read,
            beforeYes,
            completed,
            matched,
            pendingInterest,
            passed,
            conversations,
            coachThreads,
            interestNotes,
          }),
        ),
      SAVE_DEBOUNCE_MS,
    )
    return () => window.clearTimeout(t)
  }, [
    answers,
    identity,
    trust,
    checkIns,
    firstSeen,
    mapHistory,
    stage,
    steps,
    plus,
    waitlist,
    read,
    beforeYes,
    completed,
    matched,
    pendingInterest,
    passed,
    conversations,
    coachThreads,
    interestNotes,
  ])

  // ── Actions ────────────────────────────────────────────────────────────────
  function answer(questionId: string, value: AnswerValue) {
    if (questionId === 'hardest-part' && value) track('hook_answered', { choice: value })
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  async function completeIntake() {
    setScreen('generating')
    let r: Reflection
    try {
      r = await generateReflection(answers)
    } catch {
      // The considered pause failed somehow — synthesize synchronously rather
      // than strand the user on the generating screen.
      r = buildReflection(answers)
    }
    setReflection(r)
    setMapReveal(true)
    setEverCompleted(true)
    // Record this reading — one per day, so reflecting twice in an afternoon
    // refines today's entry instead of cluttering the record. Last 12 kept.
    setMapHistory((prev) => {
      const today = todayKey()
      const rest = prev.filter((s) => s.date !== today)
      return [...rest, { date: today, overall: r.overall, headline: r.headline }].slice(-12)
    })
    track('map_completed', { overall: r.overall })
    setScreen('reflection')
  }

  function startFresh() {
    sessionEpoch.current += 1
    setEverCompleted(false)
    setAnswers({})
    setIdentity({})
    setTrust(defaultTrust)
    setReflection(null)
    setCheckIns([])
    setFirstSeen(todayKey())
    setMapHistory([])
    setStageRaw('preparing')
    setSteps([])
    setPlus(defaultPlus)
    setWaitlist(null)
    setRead(null)
    setBeforeYes(null)
    setResumeIndex(0)
    setMatched([])
    setPendingInterest([])
    setPassed([])
    setConversations({})
    setActiveMatch(null)
    setCoachThreads({})
    setInterestNotes({})
    clearProgress()
    track('onboarding_started')
    setIdentityNext('situation')
    setScreen('identity')
  }

  /**
   * What's happening right now — the first real question, and the one that
   * decides where we start. Preparing goes to the hook and the map, as before.
   * Everyone else goes straight to the thing built for their stage; the map is
   * offered afterward, once she has been given something.
   */
  function chooseSituation(next: Stage) {
    setStage(next)
    if (next === 'preparing') setScreen('hook')
    else if (next === 'talking') setScreen(read ? 'home' : 'read')
    else if (next === 'deciding') setScreen(beforeYes ? 'home' : 'beforeYes')
    else openGuide(getStage('married').mode)
  }

  function resume() {
    // Land on the first question they haven't answered, in the intake's current
    // order — not at "number answered", which drifts the moment the question
    // set changes and would skip real questions for anyone who paused before
    // a cut. The hook answer lives outside the intake, so it never counts.
    const firstUnanswered = allQuestions.findIndex((q) => answers[q.id] === undefined)
    setResumeIndex(firstUnanswered === -1 ? totalQuestions - 1 : firstUnanswered)
    setSkipFirstIntro(false)
    setScreen(identity.gender ? 'intake' : 'identity')
  }

  /**
   * Reflect again — revisit the whole map with previous answers pre-filled.
   * Unlike "start over" this keeps everything: check-ins, milestones, people,
   * and the map history the new reading will be measured against.
   */
  function retakeMap() {
    track('map_retake_started')
    setResumeIndex(0)
    setSkipFirstIntro(false)
    setScreen('intake')
  }

  /**
   * Begin the map from the read.
   *
   * Deliberately NOT startFresh: she has just answered eleven questions about
   * someone, and wiping that to reward her for going deeper would be an
   * unusually stupid way to lose a person.
   */
  function beginMap() {
    track('onboarding_started')
    setIdentityNext('hook')
    setScreen(identity.gender && identity.adult ? 'hook' : 'identity')
  }

  /** Enter the intake from the hook; the insight path skips chapter 1's intro. */
  function beginIntake(skipIntro: boolean) {
    setSkipFirstIntro(skipIntro)
    setScreen('intake')
  }

  /**
   * Enter the Home hub; rebuild the reflection synchronously if it was lost.
   *
   * Only for someone who has actually completed the intake. Building a map
   * from empty answers yields a plausible-looking number for a person who never
   * answered anything — which is a lie with a decimal point.
   */
  function enterHome() {
    setReflection((prev) => prev ?? (everCompleted ? buildReflection(answers) : null))
    setMapReveal(false)
    setScreen('home')
  }

  /**
   * Take on the one thing the map points at. Replaces any open step rather than
   * stacking — carrying two is how a practice turns into a to-do list.
   */
  function takeStep(dimension: Dimension) {
    track('step_taken', { dimension })
    setSteps((prev) => [...prev.filter((s) => s.done), { dimension, taken: todayKey() }])
  }

  /** Mark the open step done. Nothing is verified, and nothing is scored. */
  function completeStep() {
    const today = todayKey()
    setSteps((prev) => {
      const i = prev.findIndex((s) => !s.done)
      if (i === -1) return prev
      track('step_done', { dimension: prev[i].dimension })
      const next = [...prev]
      next[i] = { ...next[i], done: today }
      return next.slice(-40)
    })
  }

  /** Begin the no-card trial. Nothing to cancel; it simply ends. */
  function startTrial() {
    track('trial_started')
    setPlus((prev) => ({ ...prev, trialStarted: todayKey(), trialTaken: true }))
  }

  /**
   * End it early. Real products make this hard on purpose; here it's one tap and
   * it takes effect immediately, because a cancel button you can't find is the
   * thing people are actually afraid of when they subscribe.
   */
  function endTrial() {
    track('trial_ended')
    setPlus((prev) => ({ ...prev, trialStarted: null }))
  }

  /** Spend one reply from the free allowance. Members spend nothing. */
  function spendReply() {
    if (plusActive) return
    setPlus((prev) => {
      const month = todayKey().slice(0, 7)
      const used = prev.usage.month === month ? prev.usage.used : 0
      return { ...prev, usage: { month, used: used + 1 } }
    })
  }

  /** Moving stage is always the user's call — never inferred from activity. */
  function setStage(next: Stage) {
    track('stage_changed', { stage: next })
    setStageRaw(next)
  }

  /** Open the guide — optionally straight into the voice suited to a topic. */
  function openGuide(mode: ModeId | null = null) {
    setGuideMode(mode)
    // A stale question must never replay when the guide is opened on purpose.
    setGuideAsk(null)
    setScreen('coach')
  }

  /**
   * The fast path: say what happened, land in the right voice with it already
   * asked. No mode picker, no re-typing — the whole point is that the app takes
   * the thing off your hands at the moment it happens.
   */
  function askGuide(text: string, gender?: Gender, mode?: ModeId) {
    const trimmed = text.trim()
    if (!trimmed) return
    const routed = mode ? { mode, why: '' } : routeToMode(trimmed, gender)
    track('guide_asked', { mode: routed.mode, tapped: !!mode })
    setGuideMode(routed.mode)
    setGuideAsk({ text: trimmed, why: routed.why })
    setScreen('coach')
  }

  /** Cleared once the guide has actually sent it. */
  function clearGuideAsk() {
    setGuideAsk(null)
  }

  function openPhilosophy(from: 'welcome' | 'home') {
    setPhilosophyReturn(from)
    setScreen('philosophy')
  }

  function openTrust(from: 'profile') {
    setTrustReturn(from)
    setScreen('trust')
  }

  function recordCheckIn(mood: MoodId) {
    track('checkin_done', { mood })
    setCheckIns((prev) => {
      const today = todayKey()
      // Replace today's entry if re-checking; keep the last 60 days of history.
      const rest = prev.filter((c) => c.date !== today)
      return [...rest, { date: today, mood }].slice(-60)
    })
  }

  function expressInterest(id: string) {
    track('interest_expressed', { candidate: id })
    setPendingInterest((prev) => (prev.includes(id) ? prev : [...prev, id]))
    // Reciprocation arrives after a human pause — and some people simply don't answer.
    if (!getCandidate(id)?.reciprocates) return
    const epoch = sessionEpoch.current
    window.setTimeout(() => {
      // A reset since this was scheduled? Then it belongs to a dead session.
      if (epoch !== sessionEpoch.current) return
      track('mutual_connection', { candidate: id })
      setMatched((prev) => (prev.includes(id) ? prev : [...prev, id]))
      setPendingInterest((prev) => prev.filter((x) => x !== id))
    }, RECIPROCATE_BASE_MS + Math.random() * RECIPROCATE_JITTER_MS)
  }

  function passOn(id: string) {
    setPassed((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }

  function setInterestNote(id: string, note: string) {
    setInterestNotes((prev) => ({ ...prev, [id]: note }))
  }

  /** Report & block: they disappear completely and any connection is severed. */
  function reportCandidate(id: string) {
    track('reported', { candidate: id })
    setPassed((prev) => (prev.includes(id) ? prev : [...prev, id]))
    setMatched((prev) => prev.filter((x) => x !== id))
    setPendingInterest((prev) => prev.filter((x) => x !== id))
    setConversations((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    setActiveMatch((prev) => (prev === id ? null : prev))
  }

  function appendConversation(id: string, msgs: ConvMessage[]) {
    setConversations((prev) => ({ ...prev, [id]: [...(prev[id] ?? []), ...msgs] }))
  }

  function openConversation(id: string) {
    track('conversation_opened', { candidate: id })
    setActiveMatch(id)
    setScreen('conversation')
  }

  return {
    // state
    screen,
    identity,
    answers,
    trust,
    checkIns,
    firstSeen,
    mapHistory,
    stage,
    steps,
    plus,
    waitlist,
    read,
    beforeYes,
    reflection,
    resumeIndex,
    skipFirstIntro,
    mapReveal,
    philosophyReturn,
    trustReturn,
    guideMode,
    guideAsk,
    matched,
    pendingInterest,
    passed,
    conversations,
    activeMatch,
    coachThreads,
    interestNotes,
    // derived
    completed,
    hasHome,
    identityNext,
    hasProgress,
    todayMood,
    saveOk,
    plusActive,
    trialDaysLeft,
    trialUsed,
    repliesLeft,
    // setters exposed where screens legitimately own the shape
    setScreen,
    setIdentity,
    setTrust,
    setCoachThreads,
    setStage,
    setWaitlist,
    setRead,
    setBeforeYes,
    // actions
    answer,
    completeIntake,
    beginIntake,
    beginMap,
    chooseSituation,
    startFresh,
    resume,
    retakeMap,
    takeStep,
    completeStep,
    startTrial,
    endTrial,
    spendReply,
    enterHome,
    openGuide,
    askGuide,
    clearGuideAsk,
    openPhilosophy,
    openTrust,
    recordCheckIn,
    expressInterest,
    passOn,
    setInterestNote,
    reportCandidate,
    appendConversation,
    openConversation,
  }
}
