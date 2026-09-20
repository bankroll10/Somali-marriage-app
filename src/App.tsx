import { lazy, Suspense, useEffect, useLayoutEffect, useRef } from 'react'
import { useFocusHeading } from './hooks/useFocusHeading'
import Welcome from './components/Welcome'
import { ArrowRight, Button, ScreenHeader } from './components/ui'
import type { Gender, Reach } from './types'
import { pathFor, type Entry } from './lib/entry'
import { READER_OF } from './data/tools'
import { buildRead, readSummary } from './lib/read'
import { beforeYesSummary, buildBeforeYes } from './lib/beforeYes'
import { useNiyyah } from './hooks/useNiyyah'
import { forgetEntry } from './lib/entry'

// Welcome is the first thing almost everyone sees, so it (and the ui.tsx
// primitives it already pulls in) stays in the eager bundle. Everything past
// it is one screen at a time by construction (AppScreen's switch), and most
// sessions never reach most of these — the Somali sheet, Trust, Philosophy,
// Plus, the endings — so shipping all of them upfront was pure waste on the
// one path every visit takes: it cost 611KB of initial JS to get her to a
// screen that needs about half of that.
//
// The obvious next move — warm the other screens on idle, right after load,
// so a later tap never waits on a chunk — was tried and measured out. Both a
// single burst of 22 dynamic imports and a version staggered one-per-idle-
// callback made first contentful paint ~12% slower under a throttled mobile
// profile (Chromium, 4x CPU, 1.5 Mbps down): the imports fire the moment the
// browser is idle, which under real throttling is also the moment it is
// still finishing the paint this measured. Nothing here is on a path anyone
// is actually waiting on — a lazy chunk is a few KB, fetched once, the first
// time its screen is reached — so the fix is not fetching it before then.
// See docs/PERFORMANCE.md.
const IdentityStep = lazy(() => import('./components/Identity'))
const Situation = lazy(() => import('./components/Situation'))
const Hook = lazy(() => import('./components/Hook'))
const Intake = lazy(() => import('./components/Intake'))
const ReflectionView = lazy(() => import('./components/Reflection'))
const Generating = lazy(() => import('./components/Reflection').then((m) => ({ default: m.Generating })))
const Home = lazy(() => import('./components/Home'))
const Coach = lazy(() => import('./components/Coach'))
const Trust = lazy(() => import('./components/Trust'))
const Philosophy = lazy(() => import('./components/Philosophy'))
const Profile = lazy(() => import('./components/Profile'))
const SampleIntroduction = lazy(() => import('./components/SampleIntroduction'))
const Read = lazy(() => import('./components/Read'))
const Door = lazy(() => import('./components/Door'))
const BeforeYes = lazy(() => import('./components/BeforeYes'))
const Families = lazy(() => import('./components/Families'))
const Couple = lazy(() => import('./components/Couple'))
const Vouch = lazy(() => import('./components/Vouch'))
const Plus = lazy(() => import('./components/Plus'))
const Ending = lazy(() => import('./components/Ending'))
const Ended = lazy(() => import('./components/Ended'))
const ShortMap = lazy(() => import('./components/ShortMap'))
const Cohort = lazy(() => import('./components/Cohort'))

export default function App({ entry = null }: { entry?: Entry | null }) {
  const n = useNiyyah(entry)

  // Start every screen at its top.
  //
  // Nothing here is a real page load, so the browser has no reason to move the
  // scroll position — it simply keeps whatever offset the previous screen was
  // left at. Read your whole map, tap into your space, and Home opens halfway
  // down; go back and you land in the middle of where you came from rather
  // than at the thing you tapped to reach. Only the intake handled this, one
  // question at a time.
  //
  // A layout effect rather than an effect: this runs before the browser paints,
  // so the new screen never appears at the old offset and then jump. Instant
  // rather than smooth for the same reason — the content has already changed,
  // so animating the scroll would look like a glitch, not a movement.
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [n.screen])

  // A sighted user sees the whole new screen at once; a keyboard or
  // screen-reader user is told nothing changed unless focus moves — it
  // otherwise stays wherever it was, on a now-unmounted element, defaulting
  // to <body> (docs/ACCESS.md). Every screen has exactly one h1 (or, failing
  // that, its topmost heading), so that is what receives focus.
  const screenRef = useRef<HTMLDivElement>(null)
  useFocusHeading(screenRef, n.screen)

  // The address bar follows the two tools that have an address of their own
  // (src/data/tools.ts), and nothing else. Always replaceState, never push: no
  // history is manufactured, so Back behaves as it always has, and an eleven-
  // question flow cannot be half-lost to a Back tap — the in-app Back is the
  // navigation inside a tool. What this buys is that a reload inside the read
  // lands on the read, and the bar holds the blank tool's link rather than the
  // homepage when someone copies it. `pathFor` returns nothing for every screen
  // change that is not into or out of a tool.
  useEffect(() => {
    // On a preset route (/tools/is-he-serious) the reader is only guessed until
    // the read begins, so the path is rebuilt from the guess too — otherwise a
    // trip to Trust and back from the intro would leave the address at '/'.
    const reader = n.identity.gender ?? (n.entryAbout ? READER_OF[n.entryAbout] : undefined)
    const path = pathFor(n.screen, reader, window.location.pathname)
    if (path && window.location.pathname !== path) window.history.replaceState({}, '', path)
  }, [n.screen, n.identity.gender, n.entryAbout])

  // Keyed by screen so every navigation gets one soft, uniform fade-in.
  //
  // The fallback only ever shows while a lazy screen's own chunk is still in
  // flight — a first navigation to it on a slow connection. It matches the
  // body background rather than showing a spinner: this is a hole in the
  // page for a moment, not a wait worth announcing.
  return (
    <div key={n.screen} ref={screenRef} className="animate-screen">
      <Suspense fallback={<div className="min-h-dvh bg-cream" />}>
        <AppScreen n={n} />
      </Suspense>
    </div>
  )
}

function AppScreen({ n }: { n: ReturnType<typeof useNiyyah> }) {
  const hookId = n.answers['hardest-part'] as string | undefined
  const setScene = (scene: string) => n.setIdentity((prev) => ({ ...prev, scene }))
  const setCountry = (country: string) => n.setIdentity((prev) => ({ ...prev, country }))
  const setReach = (reach: Reach) => n.setIdentity((prev) => ({ ...prev, reach }))
  const setAge = (age: number) => n.setIdentity((prev) => ({ ...prev, age }))
  // One line about her last read, recomputed from her answers rather than stored,
  // so a change to how we read never leaves an old verdict in the Guide's prompt.
  const readNote = (() => {
    if (!n.read) return undefined
    const gender = n.identity.gender ?? 'woman'
    const built = buildRead(n.read.answers, gender)
    return built ? readSummary(built, gender) : undefined
  })()
  const beforeYesNote = (() => {
    if (!n.beforeYes) return undefined
    const built = buildBeforeYes(n.beforeYes.answers, n.identity.gender ?? 'woman')
    return built ? beforeYesSummary(built) : undefined
  })()
  const backHome = () => {
    // Leaving a coded link is the moment it stops being the screen a reload
    // should land on (src/lib/entry.ts).
    forgetEntry()
    n.setScreen(n.hasHome ? 'home' : 'welcome')
  }

  const welcome = (
    <Welcome
      onBegin={n.startFresh}
      onRead={() => n.setScreen('read')}
      hasProgress={n.hasProgress}
      completed={n.completed}
      onResume={n.resume}
      onEnter={n.enterHome}
      onPhilosophy={() => n.openPhilosophy('welcome')}
    />
  )


  switch (n.screen) {
    case 'welcome':
      return welcome

    case 'identity':
      return (
        <IdentityStep
          identity={n.identity}
          onChange={n.setIdentity}
          onContinue={() => n.setScreen(n.identityNext)}
          onBack={() => n.setScreen('welcome')}
        />
      )

    case 'situation':
      return (
        <Situation
          identity={n.identity}
          onChoose={n.chooseSituation}
          onScene={setScene}
          onChangeIdentity={n.setIdentity}
          onBack={() => n.setScreen('identity')}
        />
      )

    case 'hook':
      return (
        <Hook
          identity={n.identity}
          value={n.answers['hardest-part'] as string | undefined}
          onSelect={(id) => n.answer('hardest-part', id)}
          onContinue={n.beginIntake}
          onBack={() => n.setScreen(n.identityNext === 'hook' ? 'identity' : 'situation')}
        />
      )

    case 'intake':
      return (
        <Intake
          saveOk={n.saveOk}
          answers={n.answers}
          onAnswer={n.answer}
          onComplete={n.completeIntake}
          onBegan={() => n.noteBegan('map')}
          onExit={() => n.setScreen('identity')}
          startIndex={n.resumeIndex}
          skipFirstIntro={n.skipFirstIntro}
        />
      )

    case 'generating':
      return <Generating />

    case 'reflection':
      if (!n.reflection) return welcome
      return (
        <ReflectionView
          reflection={n.reflection}
          identity={n.identity}
          history={n.mapHistory}
          steps={n.steps}
          onTakeStep={n.takeStep}
          onCompleteStep={n.completeStep}
          waitlist={n.waitlist}
          ledger={n.ledgerDone}
          onScene={setScene}
          onCountry={setCountry}
          onReach={setReach}
          onAge={setAge}
          onHesitate={n.saveHesitation}
          hookId={hookId}
          onJoinWaitlist={n.joinedCohort}
          vouch={n.vouch}
          onKept={n.setKeptCode}
          firstReveal={n.mapReveal}
          onContinue={n.enterHome}
          onRetake={n.retakeMap}
          onOpenGuide={n.openGuide}
        />
      )

    case 'home':
      if (!n.hasHome) return welcome
      return (
        <Home
          identity={n.identity}
          reflection={n.reflection}
          onOpenGuide={(mode) => n.openGuide(mode ?? null)}
          onAsk={(text, mode) => n.askGuide(text, n.identity.gender, mode)}
          onOpenMap={n.reflection ? () => n.setScreen('reflection') : n.beginMap}
          onOpenProfile={() => n.setScreen('profile')}
          onOpenRead={() => n.setScreen('read')}
          hasRead={!!n.read}
          onOpenBeforeYes={() => n.setScreen('beforeYes')}
          hasBeforeYes={!!n.beforeYes}
          coupleAnswered={!!n.couple?.answered}
          onOpenFamilies={() => n.setScreen('families')}
          onOpenEnding={() => n.setScreen('ending')}
          onPhilosophy={() => n.openPhilosophy('home')}
          onRestart={n.startFresh}
          followUpAsk={n.followUpAsk}
          onAnswerFollowUp={n.answerFollowUp}
          read={n.read}
          onReadStillStands={n.readStillStands}
          steps={n.steps}
          onTakeStep={n.takeStep}
          onCompleteStep={n.completeStep}
          saveOk={n.saveOk}
          stage={n.stage}
          onSetStage={n.setStage}
          hookId={hookId}
          ledger={n.ledgerDone}
          vouch={n.vouch}
          waitlist={n.waitlist}
          onJoinWaitlist={n.joinedCohort}
          onScene={setScene}
          onCountry={setCountry}
          onReach={setReach}
          onAge={setAge}
          onHesitate={n.saveHesitation}
        />
      )

    case 'coach':
      return (
        <Coach
          identity={n.identity}
          answers={n.answers}
          threads={n.coachThreads}
          onThreadsChange={n.setCoachThreads}
          initialMode={n.guideMode}
          initialAsk={n.guideAsk}
          onAskConsumed={n.clearGuideAsk}
          onDeviceOnly={n.trust.guideOnDevice}
          stage={n.stage}
          readNote={readNote}
          beforeYesNote={beforeYesNote}
          repliesLeft={n.repliesLeft}
          onSpendReply={n.spendReply}
          onCommit={n.commitFromGuide}
          onBack={() => n.setScreen('home')}
        />
      )

    case 'trust':
      return (
        <Trust
          identity={n.identity}
          coupleCode={n.couple?.code ?? null}
          ledger={n.ledgerEntries}
          guideOnDevice={n.trust.guideOnDevice}
          onGuideOnDevice={(on) => n.setTrust((prev) => ({ ...prev, guideOnDevice: on }))}
          countMe={n.trust.countMe}
          onCountMe={(on) => n.setTrust((prev) => ({ ...prev, countMe: on }))}
          onForget={n.forgetEverything}
          onBack={() => n.setScreen(n.trustReturn)}
        />
      )

    case 'profile':
      if (!n.hasHome) return welcome
      return (
        <Profile
          identity={n.identity}
          answers={n.answers}
          reflection={n.reflection}
          ledger={n.ledgerEntries}
          vouch={n.vouch}
          onKept={n.setKeptCode}
          onChangeIdentity={n.setIdentity}
          saveOk={n.saveOk}
          onOpenTrust={() => n.openTrust('profile')}
          onOpenPlus={() => n.setScreen('plus')}
          onOpenSample={() => n.setScreen('sample')}
          waitlist={n.waitlist}
          onJoinWaitlist={n.joinedCohort}
          onHesitate={n.saveHesitation}
          onAnswer={n.answer}
          onRetake={n.retakeMap}
          onBack={() => n.setScreen('home')}
        />
      )

    case 'door':
      return (
        <Door
          identity={n.identity}
          hasMap={n.completed}
          onScene={setScene}
          onCountry={setCountry}
          onGender={(gender) => n.setIdentity((prev) => ({ ...prev, gender }))}
          onCount={n.beginCount}
          onHesitate={n.saveHesitation}
          onBack={backHome}
        />
      )

    case 'shortMap':
      return (
        <ShortMap
          answers={n.answers}
          gender={n.identity.gender}
          onAnswer={n.answer}
          onDone={() => n.setScreen('count')}
          onBack={() => n.setScreen('door')}
        />
      )

    case 'count':
      return (
        <div className="min-h-dvh bg-cream pb-16">
          <ScreenHeader onBack={() => n.setScreen('shortMap')} sticky>
            <span className="font-display text-[1.05rem] font-medium text-ink">Being counted</span>
          </ScreenHeader>
          <main className="mx-auto max-w-xl px-6 py-8">
            <Cohort
              identity={n.identity}
              hookId={hookId}
              ledger={n.ledgerDone}
              joined={n.waitlist}
              onJoined={n.joinedCohort}
              onScene={setScene}
              onCountry={setCountry}
              onReach={setReach}
              onAge={setAge}
              onHesitate={n.saveHesitation}
            />
            {n.waitlist && (
              <Button onClick={n.enterHome} className="group mt-6">
                Home
                <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
              </Button>
            )}
          </main>
        </div>
      )

    case 'read':
      return (
        <Read
          saveOk={n.saveOk}
          identity={n.identity}
          saved={n.read}
          onSave={n.setRead}
          onBegan={() => n.noteBegan('read')}
          onSetGender={(g: Gender) => n.setIdentity((prev) => ({ ...prev, gender: g }))}
          presetGender={n.entryAbout ? READER_OF[n.entryAbout] : undefined}
          onAskGuide={(text) => n.askGuide(text, n.identity.gender)}
          onBuildMap={n.beginMap}
          hasMap={n.completed}
          onOpenFamilies={() => n.setScreen('families')}
          onOpenBeforeYes={() => n.setScreen('beforeYes')}
          onTrust={() => n.openTrust('read')}
          onBack={backHome}
        />
      )

    case 'beforeYes':
      return (
        <BeforeYes
          saveOk={n.saveOk}
          identity={n.identity}
          answers={n.answers}
          saved={n.beforeYes}
          onSave={n.setBeforeYes}
          onBegan={() => n.noteBegan('eleven')}
          onSetGender={(g: Gender) => n.setIdentity((prev) => ({ ...prev, gender: g }))}
          onAskGuide={(text) => n.askGuide(text, n.identity.gender)}
          onOpenFamilies={() => n.setScreen('families')}
          onBuildMap={n.beginMap}
          hasMap={n.completed}
          couple={n.couple}
          onCouple={n.setCouple}
          onTrust={() => n.openTrust('beforeYes')}
          onBack={backHome}
        />
      )

    case 'couple':
      // He arrived on her link. No identity yet; the screen learns his gender
      // from the record and his answers become his own Before you say yes.
      if (!n.entryCode) return welcome
      return (
        <Couple
          saveOk={n.saveOk}
          code={n.entryCode}
          // Her own link, opened on her own phone (docs/NIELSEN.md N1).
          yours={n.couple?.code === n.entryCode}
          onAnswered={(states, g) => {
            n.setBeforeYes({ at: new Date().toISOString(), answers: states })
            n.setIdentity((prev) => ({ ...prev, gender: g }))
          }}
          onBegan={() => n.noteBegan('couple')}
          onRead={() => n.setScreen('read')}
          onBuildMap={n.beginMap}
          onHome={backHome}
        />
      )

    case 'vouch':
      // A family member arrived on her link. No identity, no account: one screen.
      if (!n.entryCode) return welcome
      return <Vouch saveOk={n.saveOk} code={n.entryCode} onDone={backHome} />

    case 'families':
      return <Families gender={n.identity.gender} stage={n.stage} onTaken={n.noteFamilyScript} onBack={backHome} />

    case 'sample':
      return (
        <SampleIntroduction
          identity={n.identity}
          answers={n.answers}
          hookId={hookId}
          ledger={n.ledgerDone}
          waitlist={n.waitlist}
          onJoinWaitlist={n.joinedCohort}
          onScene={setScene}
          onCountry={setCountry}
          onReach={setReach}
          onAge={setAge}
          onHesitate={n.saveHesitation}
          onAnswer={n.answer}
          onBack={() => n.setScreen('profile')}
        />
      )

    case 'plus':
      return (
        <Plus onBack={() => n.setScreen('profile')} />
      )

    case 'ended':
      return (
        <Ended
          identity={n.identity}
          from={n.endedFrom ?? 'talking'}
          saved={n.endings[n.endings.length - 1] ?? null}
          onSave={n.saveEnded}
          onDone={backHome}
        />
      )

    case 'ending':
      return (
        <Ending
          identity={n.identity}
          ending={n.endingRecord}
          didEleven={!!n.beforeYes || !!n.couple}
          saved={n.ending}
          onSave={n.setEnding}
          onBack={backHome}
        />
      )

    case 'philosophy': {
      const fromWelcome = n.philosophyReturn === 'welcome'
      return (
        <Philosophy
          onBack={() => n.setScreen(n.philosophyReturn)}
          onPrimary={fromWelcome ? n.startFresh : () => n.setScreen('home')}
          primaryLabel={fromWelcome ? 'Begin your reflection' : 'Back home'}
        />
      )
    }

    default:
      return welcome
  }
}
