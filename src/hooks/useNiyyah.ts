import { useEffect, useMemo, useState, useRef } from 'react'
import { allQuestions, totalQuestions } from '../data/intake'
import { todayKey } from '../lib/dates'
import { applyDemoParams } from '../lib/demo'
import { buildReflection, generateReflection, snapshotOf } from '../lib/reflection'
import { routeToMode } from '../lib/route'
import { clearProgress, loadProgress, saveProgress } from '../lib/storage'
import { getStage } from '../data/stages'
import { rungsFrom } from '../lib/rungs'
import { followedThrough, noteFollowUp, openFollowUp, resolveFollowUp, writeBackState, type Landed } from '../lib/followup'
import { asksBack, buildRead } from '../lib/read'
import { hasHomeFor, marriedOpensEnding, stageAfterInstrument } from '../lib/inferStage'
import { buildEnding } from '../lib/ending'
import { buildBeforeYes } from '../lib/beforeYes'
import { reportRungs } from '../lib/progress'
import { factsFrom } from '../lib/facts'
import { forgetMe, retryPendingForget, type Forgotten } from '../lib/forget'
import { clearAllDrafts } from '../lib/draft'
import { coupleReading, readCouple, updateCouple, type Joint } from '../lib/couple'
import { forgetEntry, type Entry, type EntryKind } from '../lib/entry'
import type { ToolSide } from '../data/tools'
import { forgetCode, rememberedCode } from '../lib/keep'
import { defaultGuideUse, defaultTrust } from '../types'
import { budgetRungs, repliesLeft as budgetLeft } from '../lib/budget'
import type {
  Answers,
  AnswerValue,
  CoachMessage,
  Gender,
  Identity,
  GuideUse,
  MapSnapshot,
  ModeId,
  Reflection,
  Stage,
  TrustSettings,
  ReadRecord,
  BeforeYesRecord,
  CoupleState,
  EndingRecord,
  EndedRecord,
  FollowUp,
} from '../types'
import type { Instrument } from '../data/instruments'

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
  | 'read'
  | 'beforeYes'
  | 'families'
  | 'couple'
  | 'ending'
  | 'ended'

const SAVE_DEBOUNCE_MS = 250

/**
 * A check that could not be made is retried — once, after a pause, and then
 * left alone.
 *
 * This answers a question about someone else: has he answered the eleven. A
 * failed check used to end the matter for the session, because the effect's
 * deps did not change when the read failed. A
 * retry is not a poll: two attempts, twenty seconds apart, and then silence
 * until she opens the app again (docs/DESIGN.md, and docs/DESIGN.md's line on
 * re-engagement).
 */
const RECHECK_TRIES = 1
const RECHECK_MS = 20_000

/** The screens Trust can be opened from, and returns to. */
type TrustReturn = 'read' | 'beforeYes' | 'home'
export type ElevenAt = 'front' | 'result' | 'joint'

/** The word in the link, and the screen it opens. A restored map opens nothing of its own. */
const ENTRY_SCREEN: Partial<Record<EntryKind, Screen>> = {
  couple: 'couple',
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
    return saved && hasHomeFor({ completed: saved.completed, stage: saved.stage }) ? 'home' : 'welcome'
  })
  /** The code in the link that opened the app, for the screen it opened. */
  const [entryCode] = useState<string | null>(entry?.code ?? null)
  /**
   * Who the tool path said the read is about (`/tools/is-he-serious` → a man).
   * Read.tsx presets the reader from it — the other side — and commits it to
   * identity only when she starts, exactly as the chooser would have.
   */
  const [entryAbout] = useState<ToolSide | null>(entry?.about ?? null)
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
  // Replies spent, ever. The budget they count against comes from her rungs.
  const [guideUse, setGuideUse] = useState<GuideUse>(saved?.guide ?? defaultGuideUse)
  // The last read she took on someone. Answers only; the reading is recomputed.
  const [read, setRead] = useState<ReadRecord | null>(saved?.read ?? null)
  // Before you say yes — which conversations she and he have actually had.
  const [beforeYes, setBeforeYes] = useState<BeforeYesRecord | null>(saved?.beforeYes ?? null)
  // The two-sided Before you say yes she started, or answered.
  const [couple, setCouple] = useState<CoupleState | null>(saved?.couple ?? null)
  // What she told us on the way out. The success state of this whole product.
  const [ending, setEnding] = useState<EndingRecord | null>(saved?.ending ?? null)
  // Courtships that ended. The last one may still be waiting for its reason.
  const [endings, setEndings] = useState<EndedRecord[]>(saved?.endings ?? [])
  // Which stage she just left, while the ended screen is up.
  const [endedFrom, setEndedFrom] = useState<'talking' | 'deciding' | null>(null)
  // Which questionnaires she has begun. The denominator a completion rate needs,
  // since finishing one is already a rung. A set, never a count — see
  // src/data/instruments.ts and docs/RESEARCH.md.
  const [began, setBegan] = useState<string[]>(saved?.began ?? [])
  // What the product told her to do, and whether she did it. See lib/followup.ts.
  const [followups, setFollowups] = useState<FollowUp[]>(saved?.followups ?? [])
  // The code her map is kept under. Read once at mount and refreshed by the
  // actions that keep it, so the `kept` rung stays a pure function of state.
  const [keptCode, setKeptCode] = useState<string | null>(() => rememberedCode())
  const [reflection, setReflection] = useState<Reflection | null>(() =>
    saved?.completed ? buildReflection(saved.answers) : null,
  )
  const [resumeIndex, setResumeIndex] = useState(0)
  // True when the hook insight already previewed chapter 1 — intake starts at Q1.
  const [skipFirstIntro, setSkipFirstIntro] = useState(false)
  // True only for the one-time map reveal right after generating.
  const [mapReveal, setMapReveal] = useState(false)
  // Set when a surface hands the guide a specific topic (e.g. the map's next step).
  const [guideMode, setGuideMode] = useState<ModeId | null>(null)
  // A question captured elsewhere, waiting to be asked on arrival.
  const [guideAsk, setGuideAsk] = useState<{ text: string; why: string } | null>(null)
  // Trust is one tap from Home and from either public tool, so a stranger on
  // /tools/is-he-serious can read what leaves her phone before she answers
  // anything (docs/PRODUCT.md R4). Back returns to wherever she came from.
  const [trustReturn, setTrustReturn] = useState<TrustReturn>('home')
  // Where the eleven opens. Its front page, unless she came from a Home card
  // that promised more: "where you left it" opens her result, and "He
  // answered" opens where the two of them stand. Both used to land on the
  // front page, one tap short of what they said (docs/TESTING.md).
  const [elevenAt, setElevenAt] = useState<ElevenAt>('front')

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
  const hasHome = hasHomeFor({ completed, stage })
  // The ladder — the only thing this product measures. See src/lib/rungs.ts.
  const rungs = useMemo(
    () =>
      rungsFrom({
        situated,
        completed,
        kept: !!keptCode,
        stage,
        read,
        beforeYes,
        couple,
        followedThrough: followedThrough(followups),
      }),
    [situated, completed, keptCode, stage, read, beforeYes, couple, followups],
  )
  // The one open thing to ask her about, or — usually — nothing.
  const followUpAsk = useMemo(
    () => openFollowUp(followups, identity.gender ?? 'woman', Date.now(), { eleven: beforeYes?.answers, read: read?.answers }),
    [followups, identity.gender, beforeYes, read],
  )
  const answeredCount = Object.keys(answers).length
  const hasProgress = (answeredCount > 0 || !!identity.gender) && !hasHome

  // ── The guide's budget ─────────────────────────────────────────────────────
  // Refilled by progress, never by the calendar: every rung on the ladder and
  // every follow-up she has answered grants replies. See src/lib/budget.ts.
  const followUpsAnswered = followups.filter((f) => !!f.outcome).length
  // Only what she did: a stage she says never buys or costs replies.
  const repliesLeft = budgetLeft(budgetRungs(rungs), followUpsAnswered, guideUse.replies)

  // False when the browser refuses to persist (private mode, full quota). The
  // UI must say so — a silent failure costs the user their whole reflection.
  const [saveOk, setSaveOk] = useState(true)
  /** True once forget me has run: this phone is not written to again. */
  const forgotten = useRef(false)

  // A Forget me the server did not receive: its codes are sent again every
  // time the app opens, until every delete has landed (src/lib/forget.ts,
  // docs/PRIVACY.md).
  useEffect(() => {
    void retryPendingForget()
  }, [])

  // What the rungs were made of, in words from closed lists — which grounds
  // read thin, how the read came out, which conversation was had, who she
  // married. See src/lib/facts.ts. Never an answer in her words.
  const facts = useMemo(
    () =>
      factsFrom({
        reflection,
        read,
        beforeYes,
        followups,
        ending,
        endings,
        began,
        gender: identity.gender ?? 'woman',
        askedGuide: guideUse.replies > 0,
      }),
    [reflection, read, beforeYes, followups, ending, endings, began, identity.gender, guideUse.replies],
  )

  // Rungs reached, reported on transitions only — never on a tap, never on a
  // screen, never on a minute spent. Gated on the control that says so: with
  // countMe off this call site does not run, so the toggle is the mechanism
  // rather than a promise about one.
  useEffect(() => {
    if (!trust.countMe) return
    void reportRungs(rungs, identity.scene, facts, identity.gender)
  }, [rungs, trust.countMe, identity.scene, facts, identity.gender])

  // Has he answered the eleven she sent? Asked once per code, only until we
  // know — he answers on his own phone, and it has to reach hers without her
  // having to go looking.
  const [coupleTries, setCoupleTries] = useState(0)
  useEffect(() => {
    if (!couple || couple.answered) return
    let live = true
    let timer = 0
    readCouple(couple.code).then((v) => {
      if (!live) return
      // No answer at all — offline, a blip, a cap. Not "he hasn't answered":
      // the deps were `[couple, identity.gender]` and neither changes on a
      // failure, so one bad read meant her device stopped looking for the
      // rest of the session, and the follow-up the whole pair loop hangs on
      // was never written (docs/DESIGN.md). One more attempt, later — a check,
      // not a poll.
      if (!v) {
        if (coupleTries < RECHECK_TRIES) timer = window.setTimeout(() => setCoupleTries((n) => n + 1), RECHECK_MS)
        return
      }
      if (v.status !== 'joint') return
      // The joint is kept: it cannot change now, and after ninety days the
      // server forgets it while her Home still says he answered.
      setCouple((prev) => (prev ? { ...prev, answered: new Date().toISOString(), joint: v.joint } : prev))
      // The one the two of them should open together is the one to ask about
      // in a few days — this is where the pair's follow-through comes from.
      const open = coupleReading(v.joint, identity.gender ?? 'woman').open
      if (open) setFollowups((prev) => noteFollowUp(prev, 'couple', open.id))
    })
    return () => {
      live = false
      if (timer) window.clearTimeout(timer)
    }
  }, [couple, identity.gender, coupleTries])

  // ── Persistence (debounced — a typed name saves per keystroke otherwise)
  useEffect(() => {
    // Nothing is written back after forget me.
    //
    // On the partial-failure path the page is deliberately not replaced, so
    // this hook stays mounted holding every value that was just erased — and
    // the next change to any of these twenty dependencies wrote all of it
    // back to niyyah.intake.v1. The local half of "forget me" was undone by
    // the app's own autosave, on exactly the path where the server half had
    // already failed (docs/DESIGN.md).
    if (forgotten.current) return
    const t = window.setTimeout(() => {
      // And not by a save scheduled a moment before she tapped it: the check
      // above runs when a save is scheduled, and a change inside the debounce
      // window — an answer on the Ending, then Forget me — used to fire after
      // the phone was cleared and write every value straight back. Found by
      // tests/invariants/the-loop-closes.test.tsx, forgetting from the Ending.
      if (forgotten.current) return
      setSaveOk(
        saveProgress({
          answers,
          identity,
          trust,
          mapHistory,
          stage,
          situated,
          guide: guideUse,
          read,
          beforeYes,
          couple,
          ending,
          endings,
          began,
          followups,
          completed,
          coachThreads,
        }),
      )
    }, SAVE_DEBOUNCE_MS)
    return () => window.clearTimeout(t)
  }, [
    answers,
    identity,
    trust,
    mapHistory,
    stage,
    situated,
    guideUse,
    read,
    beforeYes,
    couple,
    ending,
    endings,
    began,
    followups,
    completed,
    coachThreads,
  ])

  // ── Actions ────────────────────────────────────────────────────────────────
  function answer(questionId: string, value: AnswerValue) {
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
    setGuideUse(defaultGuideUse)
    setEndings([])
    setRead(null)
    setBeforeYes(null)
    setCouple(null)
    setEnding(null)
    setBegan([])
    setFollowups([])
    setKeptCode(null)
    setResumeIndex(0)
    setCoachThreads({})
    clearProgress()
    // The code this phone remembers goes too. `clearProgress` only clears the
    // saved state, so it used to survive — and KeepMap reads it straight from
    // storage on mount, so a person who started over was shown "Your map is
    // kept" under a code whose map she no longer had, and the next tap on
    // "Keep this map" re-keyed that code, overwriting the real map with the
    // empty one. Irreversibly, from one mis-tap (docs/DESIGN.md).
    forgetCode()
    // A half-finished read from before the reset is not hers any more, and nor
    // is the couple screen a link left her part-way through.
    clearAllDrafts()
    forgetEntry()
    setIdentityNext('situation')
    setScreen('identity')
  }

  /**
   * Forget me. The servers first, then the phone, then a hard reload so no
   * effect in this hook can write anything back. Whoever opens the app next
   * on this phone is a stranger with a new code.
   */
  async function forgetEverything(): Promise<Forgotten> {
    // Set before the awaits, so nothing persisted in between survives either.
    forgotten.current = true
    const result = await forgetMe()
    // The phone is wiped either way. The page is only replaced when every
    // server delete actually landed: this used to discard the result and
    // replace regardless, so a timed-out DELETE left her kept map on the
    // server and showed her a stranger's app as proof it was gone — against
    // the one promise this product is built on (docs/DESIGN.md).
    if (result.map && result.progress && result.couple) window.location.replace('/')
    return result
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
    // The same rule for the other end of the story. setStage has already opened
    // the ending for someone arriving married with no record of it, and it wins
    // over the guide — otherwise `openGuide` below overwrote it, the stage's own
    // screen was unreachable from here, and the first thing a married person met
    // was an empty compose box they had to write into before the product would
    // say anything (docs/DECISIONS.md (AUDIT) §6, measured in docs/DESIGN.md).
    if (next === 'married' && marriedOpensEnding(wasIn, !!ending)) return
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

  /** Spend one reply. Charged only once an answer exists — the caller decides when. */
  function spendReply() {
    setGuideUse((prev) => ({ replies: prev.replies + 1 }))
  }

  /**
   * Save a read, and write down the question it just handed her — so that in a
   * few days the product can ask whether she asked it, instead of forgetting.
   */
  function saveRead(record: ReadRecord | null) {
    // A retake keeps the one before it, one deep, so the result can say what
    // moved. Re-saving the same answers (a restored or re-shown read) does not.
    const prior = read && record && read.at !== record.at ? { at: read.at, answers: read.answers } : undefined
    setRead(record && prior ? { ...record, previous: prior } : record)
    if (!record) return
    const r = buildRead(record.answers, identity.gender ?? 'woman')
    // Not after a caution: its instruction is "tell one person", and there is
    // no question for {him} to ask about (docs/DECISIONS.md Part 16).
    if (r && asksBack(r)) setFollowups((prev) => noteFollowUp(prev, 'read', r.band === 'early' ? 'early' : r.thin))
    // A read is about someone she is talking to. Said nothing else, that is
    // where she is — and it is what gives the read-first user a Home, so the
    // follow-up just written is ever asked (src/lib/inferStage.ts). Raw: an
    // inference is not a stage change she made, so nothing else fires.
    const inferred = stageAfterInstrument('read', stage, situated)
    if (inferred) setStageRaw(inferred)
  }

  /** The same for the eleven: the one it told her to open is the one we ask about. */
  function saveBeforeYes(record: BeforeYesRecord | null) {
    setBeforeYes(record)
    if (!record) return
    // She went through it again after sending it, and he has not answered:
    // the pair is compared against the sheet she has now, not the old one.
    // Her own phone's key, and only until he answers — then her side is
    // frozen by the server, and a 409 here is the expected answer.
    if (couple && !couple.answered && !couple.side && couple.key) {
      void updateCouple(couple.code, couple.key, record.answers, identity.gender ?? 'woman')
    }
    const r = buildBeforeYes(record.answers, identity.gender ?? 'woman', record.lines)
    if (r) setFollowups((prev) => noteFollowUp(prev, 'beforeYes', r.open.id))
    const inferred = stageAfterInstrument('eleven', stage, situated)
    if (inferred) setStageRaw(inferred)
  }

  /**
   * He answered her link, on his own phone. His eleven becomes his own Before
   * you say yes, and — new — the pair becomes his too: the code, the joint he
   * was just shown (the only thing the server would ever send either of them),
   * and one follow-up for the conversation the two of them should open
   * together. It used to be his individual "one to open", so the pair could
   * be asked, days later, about two different conversations.
   */
  function answeredCouple(code: string, states: Record<string, string>, gender: Gender, joint?: Record<string, Joint>, lines: string[] = []) {
    const now = new Date().toISOString()
    setIdentity((prev) => ({ ...prev, gender }))
    // His lines are his, on his phone, as hers are on hers; the server had
    // only `differ` for each (src/data/beforeYes.ts, sheetOf).
    setBeforeYes({ at: now, answers: states, ...(lines.length ? { lines } : {}) })
    const inferred = stageAfterInstrument('eleven', stage, situated)
    if (inferred) setStageRaw(inferred)
    if (!joint) {
      const r = buildBeforeYes(states, gender, lines)
      if (r) setFollowups((prev) => noteFollowUp(prev, 'beforeYes', r.open.id))
      return
    }
    setCouple((prev) => (prev && prev.code !== code && !prev.answered ? prev : { code, at: now, answered: now, side: 'second', joint }))
    const open = coupleReading(joint, gender).open
    if (open) setFollowups((prev) => noteFollowUp(prev, 'couple', open.id))
  }

  /**
   * How it went.
   *
   * 'asked' is the only outcome that is a claim about the world, and when the
   * question came from the eleven it is written back into her sheet — so the
   * unasked list actually shrinks as the courtship goes on, instead of staying
   * frozen at the day she filled it in.
   */
  function answerFollowUp(id: string, outcome: NonNullable<FollowUp['outcome']>, landed?: Landed, putAway?: boolean) {
    const target = followups.find((f) => f.id === id)
    setFollowups((prev) => resolveFollowUp(prev, id, outcome, undefined, putAway))
    if (outcome !== 'asked' || landed === undefined || !target) return
    if (target.source !== 'beforeYes' && target.source !== 'couple') return
    const { state, line } = writeBackState(landed)
    setBeforeYes((prev) => {
      if (!prev) return prev
      // Her other lines stay; this topic is a line only if she just said so.
      const others = (prev.lines ?? []).filter((t) => t !== target.topic)
      const lines = line ? [...others, target.topic] : others
      const { lines: _lines, ...rest } = prev
      return { ...rest, at: new Date().toISOString(), answers: { ...prev.answers, [target.topic]: state }, ...(lines.length ? { lines } : {}) }
    })
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
          read,
          beforeYes,
          couple,
          followups,
          completed,
        },
        todayKey(),
      ),
    [identity.gender, answers, mapHistory, read, beforeYes, couple, followups, completed],
  )

  /**
   * Moving stage is always the user's call — never inferred from activity.
   *
   * Arriving at married is the one transition that is also an ending, so it
   * opens the ending rather than quietly reshaping Home. Only when she is
   * moving there from somewhere else, and only once: someone who told us on
   * arrival that she is already married did not marry through any of this.
   */
  function setStage(next: Stage) {
    const from = stage
    setStageRaw(next)
    if (next === 'married' && from !== 'married' && !ending) setScreen('ending')
    // Back to preparing from talking or deciding: a courtship ended. Write the
    // fact of it now, and ask — once, skippably — why. Only the reason is a
    // question; that it ended is already true.
    if (next === 'preparing' && (from === 'talking' || from === 'deciding')) {
      setEndings((prev) => [...prev, { at: new Date().toISOString(), from, talked: followedThrough(followups) }].slice(-8))
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
    setEnding(record)
  }

  /**
   * She began one of the four questionnaires. Recorded once, ever: the set is
   * the denominator for "do people finish what they open", and because it is a
   * set rather than a counter it can never answer "how often did she open it".
   * Adding an id already present changes nothing, so no report is triggered.
   */
  function noteBegan(instrument: Instrument) {
    setBegan((prev) => (prev.includes(instrument) ? prev : [...prev, instrument]))
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
    setFollowups((prev) => noteFollowUp(prev, 'guide', key, new Date().toISOString(), words))
  }

  function openBeforeYes(at: ElevenAt = 'front') {
    setElevenAt(at)
    setScreen('beforeYes')
  }

  function openTrust(from: TrustReturn) {
    setTrustReturn(from)
    setScreen('trust')
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
    read,
    beforeYes,
    couple,
    ending,
    endingRecord,
    endings,
    endedFrom,
    saveEnded,
    entryCode,
    entryAbout,
    reflection,
    resumeIndex,
    skipFirstIntro,
    mapReveal,
    trustReturn,
    elevenAt,
    openBeforeYes,
    guideMode,
    guideAsk,
    coachThreads,
    // derived
    completed,
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
    setRead: saveRead,
    setBeforeYes: saveBeforeYes,
    answeredCouple,
    followups,
    followUpAsk,
    answerFollowUp,
    setCouple,
    setKeptCode,
    setEnding: saveEnding,
    began,
    noteBegan,
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
    spendReply,
    enterHome,
    openGuide,
    askGuide,
    clearGuideAsk,
    commitFromGuide,
    noteFamilyScript,
    openTrust,
    readStillStands,
  }
}
