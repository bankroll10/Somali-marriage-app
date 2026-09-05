import { useEffect, useMemo, useState } from 'react'
import { allQuestions, totalQuestions } from '../data/intake'
import { todayKey } from '../lib/dates'
import { track } from '../lib/analytics'
import { applyDemoParams } from '../lib/demo'
import { buildReflection, generateReflection, snapshotOf } from '../lib/reflection'
import { routeToMode } from '../lib/route'
import { clearProgress, loadProgress, saveProgress } from '../lib/storage'
import { flushWaitlistQueue } from '../lib/waitlist'
import { getStage } from '../data/stages'
import { ledger } from '../lib/ledger'
import { rungsFrom } from '../lib/rungs'
import { followedThrough, noteFollowUp, openFollowUp, resolveFollowUp, writeBackState } from '../lib/followup'
import { buildRead } from '../lib/read'
import { buildEnding } from '../lib/ending'
import { buildBeforeYes } from '../lib/beforeYes'
import { reportRungs } from '../lib/progress'
import { factsFrom } from '../lib/facts'
import { forgetMe } from '../lib/forget'
import { coupleReading, readCouple } from '../lib/couple'
import type { Entry, EntryKind } from '../lib/entry'
import { rememberedCode } from '../lib/keep'
import { readVouch } from '../lib/vouch'
import { defaultGuideUse, defaultTrust } from '../types'
import { repliesLeft as budgetLeft } from '../lib/budget'
import type {
  Answers,
  AnswerValue,
  Dimension,
  CoachMessage,
  Gender,
  Identity,
  GuideUse,
  MapSnapshot,
  ModeId,
  Reflection,
  Stage,
  StepRecord,
  TrustSettings,
  ReadRecord,
  CoupleState,
  EndingRecord,
  EndedRecord,
  FollowUp,
  VouchState,
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
  | 'couple'
  | 'vouch'
  | 'plus'
  | 'ending'
  | 'ended'

const SAVE_DEBOUNCE_MS = 250

/** The word in the link, and the screen it opens. A restored map opens nothing of its own. */
const ENTRY_SCREEN: Partial<Record<EntryKind, Screen>> = {
  couple: 'couple',
  vouch: 'vouch',
  read: 'read',
  eleven: 'beforeYes',
  families: 'families',
}

/**
 * The app's single source of truth: journey state, persistence, and actions.
 * Screens stay dumb; App stays a router.
 */
export function useNiyyah(entry: Entry | null = null) {
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
  const [screen, setScreen] = useState<Screen>(() => {
    // Someone arriving on a link lands on the screen the link is for, whatever
    // this device has saved — he may well be opening it on a phone with a map,
    // and a member with a Home who is sent the read should land on the read.
    const fromLink = entry ? ENTRY_SCREEN[entry.kind] : undefined
    if (fromLink) return fromLink
    return saved && (saved.completed || saved.stage !== 'preparing') ? 'home' : 'welcome'
  })
  /** The code in the link that opened the app, for the screen it opened. */
  const [entryCode] = useState<string | null>(entry?.code ?? null)
  // Where Identity hands off: the situation question on a fresh start; straight
  // to the hook when she is building the map from an instrument she already used.
  const [identityNext, setIdentityNext] = useState<'situation' | 'hook'>('situation')
  const [identity, setIdentity] = useState<Identity>(saved?.identity ?? {})
  const [answers, setAnswers] = useState<Answers>(saved?.answers ?? {})
  const [trust, setTrust] = useState<TrustSettings>(saved?.trust ?? defaultTrust)
  // Every reading ever made — the map becomes a record of growth, not a verdict.
  const [mapHistory, setMapHistory] = useState<MapSnapshot[]>(saved?.mapHistory ?? [])
  // Where they are in the whole arc. The product keeps serving them past the
  // match — success should never mean churn.
  const [stage, setStageRaw] = useState<Stage>(saved?.stage ?? 'preparing')
  // She has said what is actually happening right now. Distinct from `stage`,
  // which defaults to 'preparing' and so cannot tell a choice from a default.
  const [situated, setSituated] = useState<boolean>(saved?.situated ?? false)
  // The work taken on from the map. One open at a time; finished ones are kept
  // forever — they're the only honest record of change the app can show.
  const [steps, setSteps] = useState<StepRecord[]>(saved?.steps ?? [])
  // Replies spent, ever. The budget they count against comes from her rungs.
  const [guideUse, setGuideUse] = useState<GuideUse>(saved?.guide ?? defaultGuideUse)
  // The saved place — the one piece of state that leaves this device.
  const [waitlist, setWaitlist] = useState<WaitlistState | null>(saved?.waitlist ?? null)
  // The last read she took on someone. Answers only; the reading is recomputed.
  const [read, setRead] = useState<ReadRecord | null>(saved?.read ?? null)
  // Before you say yes — which conversations she and he have actually had.
  const [beforeYes, setBeforeYes] = useState<ReadRecord | null>(saved?.beforeYes ?? null)
  // The two-sided Before you say yes she started, and a family member's vouch.
  const [couple, setCouple] = useState<CoupleState | null>(saved?.couple ?? null)
  const [vouch, setVouch] = useState<VouchState | null>(saved?.vouch ?? null)
  // What she told us on the way out. The success state of this whole product.
  const [ending, setEnding] = useState<EndingRecord | null>(saved?.ending ?? null)
  // Courtships that ended. The last one may still be waiting for its reason.
  const [endings, setEndings] = useState<EndedRecord[]>(saved?.endings ?? [])
  // Which stage she just left, while the ended screen is up.
  const [endedFrom, setEndedFrom] = useState<'talking' | 'deciding' | null>(null)
  // What the product told her to do, and whether she did it. See lib/followup.ts.
  const [followups, setFollowups] = useState<FollowUp[]>(saved?.followups ?? [])
  // The code her map is kept under. Read once at mount and refreshed by the
  // actions that keep it, so the ledger stays a pure function of state.
  const [keptCode, setKeptCode] = useState<string | null>(() => rememberedCode())
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

  // Guide threads survive navigation AND reloads — the guide remembers.
  const [coachThreads, setCoachThreads] = useState<Partial<Record<ModeId, CoachMessage[]>>>(
    saved?.coachThreads ?? {},
  )

  // Completion is live state, not the load-time snapshot — otherwise "Start
  // over" leaves a stale completed=true and Welcome offers a map built from
  // empty answers.
  const [everCompleted, setEverCompleted] = useState(!!saved?.completed)

  // ── Derived ────────────────────────────────────────────────────────────────
  const completed = !!reflection || everCompleted
  // A Home exists for anyone with a map, or anyone who has said where she is.
  // `completed` keeps meaning "the intake is done"; this is the wider door.
  const hasHome = completed || stage !== 'preparing'
  // What she has actually done here. Replaces a trust score that scored taps.
  const ledgerEntries = useMemo(
    () => ledger({ completed, read, beforeYes, answers, keptCode, waitlist, vouch }),
    [completed, read, beforeYes, answers, keptCode, waitlist, vouch],
  )
  const ledgerDone = useMemo(() => ledgerEntries.filter((e) => e.done).map((e) => e.id), [ledgerEntries])
  // The ladder — the only thing this product measures. See src/lib/rungs.ts.
  const rungs = useMemo(
    () =>
      rungsFrom({
        situated,
        completed,
        stage,
        read,
        beforeYes,
        couple,
        vouch,
        waitlist,
        followedThrough: followedThrough(followups),
      }),
    [situated, completed, stage, read, beforeYes, couple, vouch, waitlist, followups],
  )
  // The one open thing to ask her about, or — usually — nothing.
  const followUpAsk = useMemo(
    () => openFollowUp(followups, identity.gender ?? 'woman'),
    [followups, identity.gender],
  )
  const answeredCount = Object.keys(answers).length
  const hasProgress = (answeredCount > 0 || !!identity.gender) && !hasHome

  // ── The guide's budget ─────────────────────────────────────────────────────
  // Refilled by progress, never by the calendar: every rung on the ladder and
  // every follow-up she has answered grants replies. See src/lib/budget.ts.
  const followUpsAnswered = followups.filter((f) => !!f.outcome).length
  const repliesLeft = budgetLeft(rungs.length, followUpsAnswered, guideUse.replies)

  // False when the browser refuses to persist (private mode, full quota). The
  // UI must say so — a silent failure costs the user their whole reflection.
  const [saveOk, setSaveOk] = useState(true)

  // A signup stranded by a bad connection is a real person lost — retry once
  // per load until the server takes it.
  useEffect(() => {
    void flushWaitlistQueue()
  }, [])

  // What the rungs were made of, in words from closed lists — which grounds
  // read thin, how the read came out, which conversation was had, who she
  // married. See src/lib/facts.ts. Never an answer in her words.
  const facts = useMemo(
    () => factsFrom({ reflection, read, beforeYes, followups, ending, endings, gender: identity.gender ?? 'woman' }),
    [reflection, read, beforeYes, followups, ending, endings, identity.gender],
  )

  // Rungs reached, reported on transitions only — never on a tap, never on a
  // screen, never on a minute spent. Gated on the control that says so: with
  // countMe off this call site does not run, so the toggle is the mechanism
  // rather than a promise about one.
  useEffect(() => {
    if (!trust.countMe) return
    void reportRungs(rungs, identity.scene, facts)
  }, [rungs, trust.countMe, identity.scene, facts])

  // Has he answered the eleven she sent? Asked once per code, only until we
  // know — he answers on his own phone, and it has to reach hers without her
  // having to go looking.
  useEffect(() => {
    if (!couple || couple.answered) return
    let live = true
    readCouple(couple.code).then((v) => {
      if (!live || v?.status !== 'joint') return
      setCouple((prev) => (prev ? { ...prev, answered: new Date().toISOString() } : prev))
      // The one the two of them should open together is the one to ask about
      // in a few days — this is where the pair's follow-through comes from.
      const open = coupleReading(v.joint, identity.gender ?? 'woman').open
      if (open) setFollowups((prev) => noteFollowUp(prev, 'couple', open.id))
    })
    return () => {
      live = false
    }
  }, [couple, identity.gender])

  // ── Persistence (debounced — the age field saves per keystroke otherwise)
  useEffect(() => {
    const t = window.setTimeout(
      () =>
        setSaveOk(
          saveProgress({
            answers,
            identity,
            trust,
            mapHistory,
            stage,
            situated,
            steps,
            guide: guideUse,
            waitlist,
            read,
            beforeYes,
            couple,
            vouch,
            ending,
            endings,
            followups,
            completed,
            coachThreads,
          }),
        ),
      SAVE_DEBOUNCE_MS,
    )
    return () => window.clearTimeout(t)
  }, [
    answers,
    identity,
    trust,
    mapHistory,
    stage,
    situated,
    steps,
    guideUse,
    waitlist,
    read,
    beforeYes,
    couple,
    vouch,
    ending,
    endings,
    followups,
    completed,
    coachThreads,
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
    // The snapshot carries her answers, so the next reading can say what
    // changed in her words rather than as a number that moved.
    setMapHistory((prev) => {
      const today = todayKey()
      const rest = prev.filter((s) => s.date !== today)
      return [...rest, snapshotOf(answers, today)].slice(-12)
    })
    track('map_completed')
    setScreen('reflection')
  }

  function startFresh() {
    setEverCompleted(false)
    setAnswers({})
    setIdentity({})
    setTrust(defaultTrust)
    setReflection(null)
    setMapHistory([])
    setStageRaw('preparing')
    setSituated(false)
    setSteps([])
    setGuideUse(defaultGuideUse)
    setWaitlist(null)
    setEndings([])
    setRead(null)
    setBeforeYes(null)
    setCouple(null)
    setVouch(null)
    setEnding(null)
    setFollowups([])
    setKeptCode(null)
    setResumeIndex(0)
    setCoachThreads({})
    clearProgress()
    track('onboarding_started')
    setIdentityNext('situation')
    setScreen('identity')
  }

  /**
   * Forget me. The servers first, then the phone, then a hard reload so no
   * effect in this hook can write anything back. Whoever opens the app next
   * on this phone is a stranger with a new code.
   */
  async function forgetEverything() {
    track('forgotten')
    await forgetMe()
    window.location.replace('/')
  }

  /**
   * What's happening right now — the first real question, and the one that
   * decides where we start. Preparing goes to the hook and the map, as before.
   * Everyone else goes straight to the thing built for their stage; the map is
   * offered afterward, once she has been given something.
   */
  function chooseSituation(next: Stage) {
    setSituated(true)
    const wasIn = stage
    setStage(next)
    // "I'm not talking to anyone" from talking or deciding is a courtship
    // ending; setStage has opened that screen, and it wins over the hook.
    if (next === 'preparing' && (wasIn === 'talking' || wasIn === 'deciding')) return
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

  /** Spend one reply. Charged only once an answer exists — the caller decides when. */
  function spendReply() {
    setGuideUse((prev) => ({ replies: prev.replies + 1 }))
  }

  /**
   * Save a read, and write down the question it just handed her — so that in a
   * few days the product can ask whether she asked it, instead of forgetting.
   */
  function saveRead(record: ReadRecord | null) {
    setRead(record)
    if (!record) return
    const r = buildRead(record.answers, identity.gender ?? 'woman')
    if (r) setFollowups((prev) => noteFollowUp(prev, 'read', r.band === 'early' ? 'early' : r.thin))
  }

  /** The same for the eleven: the one it told her to open is the one we ask about. */
  function saveBeforeYes(record: ReadRecord | null) {
    setBeforeYes(record)
    if (!record) return
    const r = buildBeforeYes(record.answers, identity.gender ?? 'woman')
    if (r) setFollowups((prev) => noteFollowUp(prev, 'beforeYes', r.open.id))
  }

  /**
   * How it went.
   *
   * 'asked' is the only outcome that is a claim about the world, and when the
   * question came from the eleven it is written back into her sheet — so the
   * unasked list actually shrinks as the courtship goes on, instead of staying
   * frozen at the day she filled it in.
   */
  function answerFollowUp(id: string, outcome: NonNullable<FollowUp['outcome']>, agreed?: boolean) {
    const target = followups.find((f) => f.id === id)
    setFollowups((prev) => resolveFollowUp(prev, id, outcome))
    if (outcome !== 'asked' || agreed === undefined || !target) return
    if (target.source !== 'beforeYes' && target.source !== 'couple') return
    setBeforeYes((prev) =>
      prev ? { at: new Date().toISOString(), answers: { ...prev.answers, [target.topic]: writeBackState(agreed) } } : prev,
    )
  }

  /**
   * How she chose — her whole record, rebuilt from state rather than stored, so
   * it can never go stale against what she actually did.
   */
  const endingRecord = useMemo(
    () =>
      buildEnding(
        {
          gender: identity.gender ?? 'woman',
          answers,
          mapHistory,
          steps,
          read,
          beforeYes,
          couple,
          vouch,
          followups,
          completed,
        },
        todayKey(),
      ),
    [identity.gender, answers, mapHistory, steps, read, beforeYes, couple, vouch, followups, completed],
  )

  /**
   * Moving stage is always the user's call — never inferred from activity.
   *
   * Arriving at married is the one transition that is also an ending, so it
   * opens the ending rather than quietly reshaping Home. Only when she is
   * moving there from somewhere else, and only once: someone who told us at
   * the door that she is already married did not marry through any of this.
   */
  function setStage(next: Stage) {
    track('stage_changed', { stage: next })
    const from = stage
    setStageRaw(next)
    if (next === 'married' && from !== 'married' && !ending) setScreen('ending')
    // Back to preparing from talking or deciding: a courtship ended. Write the
    // fact of it now, and ask — once, skippably — why. Only the reason is a
    // question; that it ended is already true.
    if (next === 'preparing' && (from === 'talking' || from === 'deciding')) {
      setEndings((prev) => [...prev, { at: new Date().toISOString(), from }].slice(-8))
      setEndedFrom(from)
      setScreen('ended')
    }
  }

  /** She said why it ended, or changed her mind. Lands on the most recent ending. */
  function saveEnded(reason?: string, which?: string) {
    setEndings((prev) => {
      if (prev.length === 0) return prev
      const last = { ...prev[prev.length - 1] }
      if (reason) last.reason = reason
      else delete last.reason
      if (reason && which) last.which = which
      else delete last.which
      return [...prev.slice(0, -1), last]
    })
  }

  /** She told us how it ended. Every field optional; saving is never required. */
  function saveEnding(record: EndingRecord) {
    if (!ending) track('ending_recorded')
    setEnding(record)
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

  /**
   * She took the words for one of the family conversations — copied or sent
   * them. Written down so that in a few days Home asks whether she had it.
   * Opening a script is not taking it; browsing five must not queue five asks.
   */
  function noteFamilyScript(id: string) {
    setFollowups((prev) => noteFollowUp(prev, 'family', id))
  }

  /**
   * She took the guide's words as something she will say. Written down like a
   * read's question or one of the eleven, so that in a few days Home asks
   * whether she said them — the guide stops being a thread and becomes a thing
   * that happened. Filed under what she asked, so re-tapping the same words
   * does not stack asks.
   */
  function commitFromGuide(words: string, topic: string) {
    const key = topic.trim().slice(0, 80) || words.slice(0, 80)
    track('guide_committed')
    setFollowups((prev) => noteFollowUp(prev, 'guide', key, new Date().toISOString(), words))
  }

  function openPhilosophy(from: 'welcome' | 'home') {
    setPhilosophyReturn(from)
    setScreen('philosophy')
  }

  function openTrust(from: 'profile') {
    setTrustReturn(from)
    setScreen('trust')
  }

  // Has a family member vouched since she last opened the app? Asked once per
  // kept code, only until we know — a vouch given on someone else's phone has
  // to reach hers without her having to go looking for it.
  useEffect(() => {
    if (!keptCode || vouch) return
    let live = true
    readVouch(keptCode).then((v) => {
      if (live && v) setVouch(v)
    })
    return () => {
      live = false
    }
  }, [keptCode, vouch])

  /** Counted — and the map was kept on the way, so the ledger learns the code. */
  function joinedCohort(state: WaitlistState) {
    setWaitlist(state)
    setKeptCode(rememberedCode())
  }

  /**
   * A month on, she says the read still stands. Recorded so Home does not ask
   * again for another month; nothing else changes — the read is still hers.
   */
  function readStillStands() {
    setRead((prev) => (prev ? { ...prev, checkedAt: new Date().toISOString() } : prev))
  }

  return {
    // state
    screen,
    identity,
    answers,
    trust,
    mapHistory,
    stage,
    steps,
    waitlist,
    read,
    beforeYes,
    couple,
    vouch,
    ending,
    endingRecord,
    endings,
    endedFrom,
    saveEnded,
    keptCode,
    entryCode,
    reflection,
    resumeIndex,
    skipFirstIntro,
    mapReveal,
    philosophyReturn,
    trustReturn,
    guideMode,
    guideAsk,
    coachThreads,
    // derived
    completed,
    ledgerEntries,
    ledgerDone,
    hasHome,
    identityNext,
    hasProgress,
    saveOk,
    repliesLeft,
    // setters exposed where screens legitimately own the shape
    setScreen,
    setIdentity,
    setTrust,
    setCoachThreads,
    setStage,
    setWaitlist,
    setRead: saveRead,
    setBeforeYes: saveBeforeYes,
    followups,
    followUpAsk,
    answerFollowUp,
    setCouple,
    setVouch,
    setKeptCode,
    setEnding: saveEnding,
    joinedCohort,
    // actions
    answer,
    completeIntake,
    beginIntake,
    beginMap,
    chooseSituation,
    forgetEverything,
    startFresh,
    resume,
    retakeMap,
    takeStep,
    completeStep,
    spendReply,
    enterHome,
    openGuide,
    askGuide,
    clearGuideAsk,
    commitFromGuide,
    noteFamilyScript,
    openPhilosophy,
    openTrust,
    readStillStands,
  }
}
