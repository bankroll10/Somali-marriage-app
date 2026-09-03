import { useState } from 'react'
import type { CheckIn, Dimension, Identity, ModeId, Reflection, Stage, StepRecord, WaitlistState } from '../types'
import { getScene } from '../data/scenes'
import { chosenReason, getDailyReflection } from '../data/daily'
import { checkInReflection, comebackLine, getMood, journeyLine, moods, weekStrip, yesterdayLine, type MoodId } from '../data/checkin'
import { momentsFor } from '../data/moments'
import { dailyPrefsFor } from '../lib/personalize'
import StageBand from './home/StageBand'
import TodaysReflection from './home/TodaysReflection'
import WorkCard from './home/WorkCard'
import Cohort from './Cohort'
import {
  CompassGlyph,
  GlyphTile,
  LockGlyph,
  Logo,
  ArrowRight,
  fieldClass,
  PersonGlyph,
  SeedGlyph,
  SparkGlyph,
} from './ui'

interface Props {
  identity: Identity
  /** Null for a member who has a Home but no map yet — she said where she is, and skipped the intake. */
  reflection: Reflection | null
  onOpenGuide: (mode?: ModeId) => void
  /** The fast path: say what happened, land in the right voice with it asked. */
  onAsk: (text: string, mode?: ModeId) => void
  onOpenMap: () => void
  onOpenProfile: () => void
  onOpenSample: () => void
  /** The read on someone — the fastest route from a live problem to an answer. */
  onOpenRead: () => void
  /** True once she has taken one, so the card offers the result rather than the pitch. */
  hasRead: boolean
  /** Before you say yes and the families' words — the deciding stage's instruments. */
  onOpenBeforeYes: () => void
  hasBeforeYes: boolean
  onOpenFamilies: () => void
  onPhilosophy: () => void
  onRestart: () => void
  /** Today's mood, if already checked in. */
  checkInMood: MoodId | null
  /** Full check-in history — continuity, pattern rewards, the week strip. */
  checkIns: CheckIn[]
  onCheckIn: (mood: MoodId) => void
  /** The work taken on from the map — the app's centre of gravity. */
  steps: StepRecord[]
  onTakeStep: (d: Dimension) => void
  onCompleteStep: () => void
  /** Date of the most recent reading, so we know when a new one is worth it. */
  lastReading?: string
  /** False when this browser refuses to save — the user deserves to know. */
  saveOk: boolean
  /** First day on the path. */
  firstSeen: string
  /** Where they are in the arc, and moving through it — always their call. */
  stage: Stage
  onSetStage: (s: Stage) => void
  hookId?: string
  /** The founding cohort — the number on the door, and her place in it. */
  voices: string[]
  /** What she has done here — travels with her place. */
  ledger: string[]
  waitlist: WaitlistState | null
  onJoinWaitlist: (s: WaitlistState) => void
  onScene: (scene: string) => void
}

export default function Home({
  identity,
  reflection,
  onOpenGuide,
  onAsk,
  onOpenMap,
  onOpenProfile,
  onOpenSample,
  onOpenRead,
  hasRead,
  onOpenBeforeYes,
  hasBeforeYes,
  onOpenFamilies,
  onPhilosophy,
  onRestart,
  checkInMood,
  checkIns,
  onCheckIn,
  steps,
  onTakeStep,
  onCompleteStep,
  lastReading,
  saveOk,
  firstSeen,
  stage,
  onSetStage,
  hookId,
  voices,
  ledger,
  waitlist,
  onJoinWaitlist,
  onScene,
}: Props) {
  const name = identity.firstName?.trim()
  const scene = getScene(identity.scene)
  // Once someone is deciding on a person — or married — the app has no business
  // showing them introductions. Following you past the match means acting like it.
  const seeking = stage === 'preparing' || stage === 'talking'
  // The daily reflection is weighted to this person — what they named as their
  // hardest part, how their week has gone, and the thinnest ground on their map.
  const prefs = dailyPrefsFor(hookId, reflection, checkIns, stage)
  const daily = getDailyReflection(new Date(), prefs)
  const whyThisOne = chosenReason(new Date(), prefs)

  const [ask, setAsk] = useState('')

  return (
    <div className="min-h-dvh bg-cream pb-16">
      <header className="border-b border-line/70 bg-cream/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <Logo className="text-ink" />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6">
        {/* This browser won't persist anything (private mode / full storage).
            Say it plainly — the alternative is a user losing their reflection
            and finding out tomorrow. */}
        {!saveOk && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-clay/40 bg-clay/[0.07] px-4 py-3.5">
            <LockGlyph className="mt-0.5 h-4 w-4 flex-none text-clay" />
            <p className="text-[0.86rem] leading-snug text-ink-soft text-pretty">
              <span className="font-medium text-ink">This browser isn’t saving your progress.</span>{' '}
              Private browsing or full storage will do that. Your reflection lives
              only on this device, so it won’t be here next time — switch off
              private browsing to keep it.
            </p>
          </div>
        )}

        {/* Greeting */}
        <section className="animate-rise pt-10">
          <h1 className="font-display text-[2.2rem] font-medium leading-tight tracking-tight text-ink text-balance sm:text-[2.6rem]">
            {name ? `Salaam, ${name}.` : 'Salaam.'}
          </h1>
          <p className="mt-2 text-[1rem] text-muted">
            {scene ? (
              <>
                <span className="font-medium text-ink-soft">{scene.label}</span> · {scene.note}
              </>
            ) : (
              'Welcome back to your space.'
            )}
          </p>
          {journeyLine(firstSeen, checkIns.length) && (
            <p className="mt-2 text-[0.9rem] font-medium text-gold">
              {journeyLine(firstSeen, checkIns.length)}
            </p>
          )}
        </section>

        {/* Say what happened.
            This is the answer to why the icon earns a place on a home screen.
            The rest of Niyyah is the slow work of becoming ready; this is the
            1am text, the auntie at the wedding, the reply you've re-read nine
            times. One line, no guide to choose first — we route it. */}
        <section className="animate-rise mt-8">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-muted">
            Something happened?
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!ask.trim()) return
              onAsk(ask)
              setAsk('')
            }}
            className="rounded-card border border-line bg-white/70 p-3.5"
          >
            <div className="flex items-end gap-2.5">
              <textarea
                value={ask}
                onChange={(e) => setAsk(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    if (!ask.trim()) return
                    onAsk(ask)
                    setAsk('')
                  }
                }}
                rows={1}
                placeholder="Say it in one line…"
                aria-label="Tell your guide what happened"
                className={`max-h-28 min-h-[2.75rem] flex-1 resize-none bg-cream/60 px-3.5 py-2.5 text-[0.98rem] leading-relaxed ${fieldClass}`}
              />
              <button
                type="submit"
                disabled={!ask.trim()}
                aria-label="Ask your guide"
                className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-forest text-cream transition-all hover:bg-forest-deep disabled:opacity-25"
              >
                <ArrowRight />
              </button>
            </div>
            {/* One tap, no typing — and a new member learns what this is for. */}
            <div className="mt-3 flex flex-wrap gap-2">
              {momentsFor(identity.gender).map((m) => (
                <button
                  key={m.label}
                  type="button"
                  onClick={() => (m.target === 'read' ? onOpenRead() : onAsk(m.prompt, m.mode))}
                  className="rounded-full border border-line bg-cream/70 px-3.5 py-2 text-[0.85rem] font-medium text-ink-soft transition-all hover:border-forest/40 hover:bg-white hover:text-ink"
                >
                  {m.label}
                </button>
              ))}
            </div>
          </form>
          <p className="mt-2.5 text-[0.8rem] text-muted text-pretty">
            You don’t pick a guide — we read what you said and open the right one.
          </p>
        </section>

        {/* The read.
            Of everything in this app, this is the one thing aimed squarely at
            the highest-pain problem we can actually solve today: she already has
            the man, and cannot tell what he means. It sits directly under the
            fast path because that is what it is. */}
        {seeking && (
          <button
            onClick={onOpenRead}
            className="animate-rise group mt-4 flex w-full items-center gap-4 rounded-card border border-forest/25 bg-forest/[0.05] p-5 text-left transition-all hover:-translate-y-0.5 hover:bg-forest/[0.09]"
          >
            <GlyphTile className="bg-forest/10 text-forest">
              <CompassGlyph />
            </GlyphTile>
            <span className="flex-1">
              <span className="font-display text-[1.2rem] font-medium text-ink">
                {hasRead ? 'Your read on someone' : 'Talking to someone? Get a read.'}
              </span>
              <span className="mt-0.5 block text-[0.88rem] text-muted text-pretty">
                {hasRead
                  ? 'Open it again, or take it fresh — things change, and so does what they’ve shown you.'
                  : 'Ninety seconds on what they’ve actually done, and the one question to ask them next.'}
              </span>
            </span>
            <ArrowRight className="flex-none text-forest transition-transform group-hover:translate-x-0.5" />
          </button>
        )}

        {/* Deciding together: the conversations most of us have too late,
            asked in month two, and the words for the families. */}
        {stage === 'deciding' && (
          <button
            onClick={onOpenBeforeYes}
            className="animate-rise group mt-4 flex w-full items-center gap-4 rounded-card border border-forest/25 bg-forest/[0.05] p-5 text-left transition-all hover:-translate-y-0.5 hover:bg-forest/[0.09]"
          >
            <GlyphTile className="bg-forest/10 text-forest">
              <CompassGlyph />
            </GlyphTile>
            <span className="flex-1">
              <span className="font-display text-[1.2rem] font-medium text-ink">
                {hasBeforeYes ? 'Before you say yes — where you left it' : 'Before you say yes'}
              </span>
              <span className="mt-0.5 block text-[0.88rem] text-muted text-pretty">
                {hasBeforeYes
                  ? 'The conversations you’ve had, the ones you haven’t, and the one to open next.'
                  : 'Eleven conversations that decide a Somali marriage — where you’d live, money home, a second wife — and which one to open this week.'}
              </span>
            </span>
            <ArrowRight className="flex-none text-forest transition-transform group-hover:translate-x-0.5" />
          </button>
        )}

        {reflection && (
          <WorkCard
            reflection={reflection}
            steps={steps}
            onTakeStep={onTakeStep}
            onCompleteStep={onCompleteStep}
            onOpenMap={onOpenMap}
            onOpenGuide={onOpenGuide}
            lastReading={lastReading}
          />
        )}

        <StageBand
          stage={stage}
          onSetStage={onSetStage}
          onOpenRead={onOpenRead}
          onOpenBeforeYes={onOpenBeforeYes}
          onOpenFamilies={onOpenFamilies}
          onOpenGuide={() => onOpenGuide()}
        />

        {/* Daily check-in — the act of returning */}
        <section className="animate-rise mt-10">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-muted">
            Daily check-in
          </p>
          {checkInMood ? (
            <CheckedIn
              mood={checkInMood}
              history={checkIns}
              onOpenGuide={onOpenGuide}
              onOpenSample={onOpenSample}
            />
          ) : (
            <div className="rounded-card border border-line bg-white/60 p-5">
              {(() => {
                // A return after time away is acknowledged first; otherwise the
                // quiet yesterday-continuity line.
                const reentry = comebackLine(checkIns) ?? yesterdayLine(checkIns)
                return reentry ? (
                  <p className="mb-1 text-[0.82rem] text-muted text-pretty">{reentry}</p>
                ) : null
              })()}
              <p className="font-display text-[1.25rem] font-medium tracking-tight text-ink">
                How’s your heart today?
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {moods.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => onCheckIn(m.id)}
                    className="flex flex-col items-center gap-1.5 rounded-2xl border border-line bg-cream px-3 py-3.5 transition-all hover:-translate-y-0.5 hover:border-forest/40 hover:bg-white"
                  >
                    <span className="text-xl">{m.emoji}</span>
                    <span className="text-[0.85rem] font-medium text-ink-soft">{m.label}</span>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-[0.78rem] text-muted">
                One tap. Your guide listens.
              </p>
            </div>
          )}
        </section>

        <TodaysReflection daily={daily} prefs={prefs} whyThisOne={whyThisOne} />

        {/* Your space */}
        <section className="mt-10">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-muted">
            Your space
          </p>
          <div className="grid gap-3.5">
            {/* Guide — free-form entry; the work card hands over specific topics. */}
            <button
              onClick={() => onOpenGuide()}
              className="group flex items-center gap-4 rounded-card border border-line bg-white/60 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-forest/40"
            >
              <GlyphTile className="bg-forest/10 text-forest">
                <SeedGlyph />
              </GlyphTile>
              <span className="flex-1">
                <span className="font-display text-[1.2rem] font-medium text-ink">
                  Talk to your guide
                </span>
                <span className="mt-0.5 block text-[0.88rem] text-muted">
                  Six voices for the real moments — Auntie, Big Brother, Therapist & more.
                </span>
              </span>
              <ArrowRight className="flex-none text-forest transition-transform group-hover:translate-x-0.5" />
            </button>

            {/* The number on the door. The old card here promised "serious,
                verified people around Minneapolis" and dangled an invented name
                as today's introduction. This is the honest version: the real
                count toward her city opening, and her place in it. Hidden once
                she's deciding on someone or married. */}
            {seeking && reflection && (
              <Cohort
                identity={identity}
                overall={reflection.overall}
                hookId={hookId}
                voices={voices}
                ledger={ledger}
                joined={waitlist}
                onJoined={onJoinWaitlist}
                onScene={onScene}
                compact
              />
            )}

            {/* One sample introduction, labelled as such — the matching is real
                and runs on her map; the person is not. */}
            {seeking && reflection && (
              <button
                onClick={onOpenSample}
                className="group flex items-center gap-4 rounded-card border border-line bg-white/60 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-forest/40"
              >
                <GlyphTile className="bg-gold/15 text-gold">
                  <SparkGlyph />
                </GlyphTile>
                <span className="flex-1">
                  <span className="font-display text-[1.2rem] font-medium text-ink">
                    How an introduction will look
                  </span>
                  <span className="mt-0.5 block text-[0.88rem] text-muted text-pretty">
                    A sample, read against your real map — so you can see how we
                    choose, before anyone is chosen.
                  </span>
                </span>
                <ArrowRight className="flex-none text-gold transition-transform group-hover:translate-x-0.5" />
              </button>
            )}

            {/* Your profile */}
            <button
              onClick={onOpenProfile}
              className="group flex items-center gap-4 rounded-card border border-line bg-white/60 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-forest/40"
            >
              <GlyphTile className="bg-sand text-ink-soft">
                <PersonGlyph />
              </GlyphTile>
              <span className="flex-1">
                <span className="font-display text-[1.2rem] font-medium text-ink">Your profile</span>
                <span className="mt-0.5 block text-[0.88rem] text-muted">
                  How members see you — plus your protections and privacy.
                </span>
              </span>
              <ArrowRight className="flex-none text-forest transition-transform group-hover:translate-x-0.5" />
            </button>

            {/* Readiness map — hers when she has one; otherwise the offer. A member
                who said she is married is not offered a readiness-for-marriage map. */}
            {reflection ? (
              <button
                onClick={onOpenMap}
                className="group rounded-card border border-line bg-white/60 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-forest/40"
              >
                <div className="flex items-center justify-between">
                  <GlyphTile small className="bg-forest/10 text-forest">
                    <CompassGlyph />
                  </GlyphTile>
                  <span className="font-display text-[1.5rem] font-medium text-forest tabular-nums">
                    {reflection.overall}
                  </span>
                </div>
                <p className="mt-3 font-display text-[1.1rem] font-medium text-ink">Readiness map</p>
                <p className="mt-1 text-[0.85rem] leading-snug text-muted text-pretty">{reflection.headline}</p>
              </button>
            ) : stage !== 'married' ? (
              <button
                onClick={onOpenMap}
                className="group flex items-center gap-4 rounded-card border border-gold/30 bg-gold/[0.07] p-5 text-left transition-all hover:-translate-y-0.5"
              >
                <GlyphTile className="bg-gold/15 text-gold">
                  <CompassGlyph />
                </GlyphTile>
                <span className="flex-1">
                  <span className="font-display text-[1.2rem] font-medium text-ink">Build your map</span>
                  <span className="mt-0.5 block text-[0.88rem] text-muted text-pretty">
                    Two minutes on what you actually need, and what you won’t compromise on. Your side of
                    every conversation gets clearer.
                  </span>
                </span>
                <ArrowRight className="flex-none text-gold transition-transform group-hover:translate-x-0.5" />
              </button>
            ) : null}
          </div>
        </section>

        <div className="mt-12 flex flex-col items-center gap-3 text-center">
          <button
            onClick={onPhilosophy}
            className="group inline-flex items-center gap-1.5 text-[0.85rem] text-muted transition-colors hover:text-ink"
          >
            <span>
              <span className="font-medium text-ink-soft">Your space, your pace.</span> Why Niyyah
            </span>
            <ArrowRight className="h-3.5 w-3.5 text-gold transition-transform group-hover:translate-x-0.5" />
          </button>
          <button
            onClick={onRestart}
            className="text-xs text-muted/70 underline-offset-4 transition hover:text-ink hover:underline"
          >
            Start over from the beginning
          </button>
        </div>
      </main>
    </div>
  )
}

function CheckedIn({
  mood,
  history,
  onOpenGuide,
  onOpenSample,
}: {
  mood: MoodId
  history: CheckIn[]
  onOpenGuide: (mode?: ModeId) => void
  onOpenSample: () => void
}) {
  const m = getMood(mood)
  const pattern = checkInReflection(history)
  const strip = weekStrip(history)
  return (
    <div className="animate-rise rounded-card border border-gold/25 bg-gold/[0.07] p-5">
      <div className="flex items-start gap-3.5">
        <span className="text-2xl">{m.emoji}</span>
        <div className="flex-1">
          <p className="text-[0.8rem] font-semibold uppercase tracking-[0.14em] text-gold">
            {m.label} · checked in
          </p>
          <p className="mt-1.5 text-[0.98rem] leading-relaxed text-ink-soft text-pretty">{m.ack}</p>
          {pattern && (
            <p className="mt-2 text-[0.92rem] font-medium leading-relaxed text-forest text-pretty">
              {pattern}
            </p>
          )}
          {m.nudge && (
            <button
              onClick={() => (m.nudge!.target === 'guide' ? onOpenGuide() : onOpenSample())}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-forest px-4 py-2 text-[0.85rem] font-medium text-cream transition hover:bg-forest-deep"
            >
              {m.nudge.label}
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Your week — history that accumulates. Dots for missed days; no streaks, no guilt. */}
      <div className="mt-4 border-t border-gold/20 pt-3.5">
        <div className="flex items-center justify-between">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted">
            Your week
          </p>
          <div className="flex items-center gap-2.5">
            {strip.map((d) =>
              d.mood ? (
                <span key={d.key} className="text-[0.95rem] leading-none" title={d.key}>
                  {getMood(d.mood).emoji}
                </span>
              ) : (
                <span key={d.key} className="h-1.5 w-1.5 rounded-full bg-line" title={d.key} />
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

