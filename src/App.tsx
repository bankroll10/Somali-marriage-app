import { lazy, Suspense, useEffect, useLayoutEffect, useRef } from 'react'
import { useFocusHeading } from './hooks/useFocusHeading'
import Welcome from './components/Welcome'
import type { Gender } from './types'
import { pathFor, type Entry } from './lib/entry'
import { READER_OF } from './data/tools'
import { buildRead, readSummary } from './lib/read'
import { beforeYesSummary, buildBeforeYes } from './lib/beforeYes'
import { useNiyyah } from './hooks/useNiyyah'
import { forgetEntry } from './lib/entry'

// Welcome is the first thing almost everyone sees, so it (and the ui.tsx
// primitives it already pulls in) stays in the eager bundle. Everything past
// it is one screen at a time by construction (AppScreen's switch), and most
// sessions never reach most of these — Trust, the guide, the endings — so shipping all of them upfront was pure waste on the
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
// See docs/DESIGN.md.
const IdentityStep = lazy(() => import('./components/Identity'))
const Situation = lazy(() => import('./components/Situation'))
const Hook = lazy(() => import('./components/Hook'))
const Intake = lazy(() => import('./components/Intake'))
const ReflectionView = lazy(() => import('./components/Reflection'))
const Generating = lazy(() => import('./components/Reflection').then((m) => ({ default: m.Generating })))
const Home = lazy(() => import('./components/Home'))
const Coach = lazy(() => import('./components/Coach'))
const Trust = lazy(() => import('./components/Trust'))
const Read = lazy(() => import('./components/Read'))
const BeforeYes = lazy(() => import('./components/BeforeYes'))
const Families = lazy(() => import('./components/Families'))
const Couple = lazy(() => import('./components/Couple'))
const Ending = lazy(() => import('./components/Ending'))
const Ended = lazy(() => import('./components/Ended'))

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
  // to <body> (docs/DESIGN.md). Every screen has exactly one h1 (or, failing
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
  const setScene = (scene: string) => n.setIdentity((prev) => ({ ...prev, scene }))
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
    const built = buildBeforeYes(n.beforeYes.answers, n.identity.gender ?? 'woman', n.beforeYes.lines)
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
      // A Home is progress too. Someone who took a read or the eleven from a
      // link has one and no map; Back from "Now the other half of it" landed
      // here with only "Start where you are", which wiped the read, the pair
      // code and the follow-up without asking (docs/DECISIONS.md, the
      // completion review, B3).
      completed={n.completed || n.hasHome}
      onResume={n.resume}
      onEnter={n.enterHome}
      // Only when there is no Home to ask it on — a Home asks it itself.
      followUpAsk={n.hasHome ? null : n.followUpAsk}
      onAnswerFollowUp={n.answerFollowUp}
      onAskGuide={(text) => n.askGuide(text, n.identity.gender)}
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
          onKept={n.setKeptCode}
          firstReveal={n.mapReveal}
          onContinue={n.enterHome}
          onRetake={n.retakeMap}
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
          onOpenTrust={() => n.openTrust('home')}
          onOpenRead={() => n.setScreen('read')}
          hasRead={!!n.read}
          onOpenBeforeYes={() => n.openBeforeYes(n.beforeYes ? 'result' : 'front')}
          onOpenJoint={() => n.openBeforeYes('joint')}
          hasBeforeYes={!!n.beforeYes}
          coupleAnswered={!!n.couple?.answered}
          coupleWaiting={!!n.couple && !n.couple.answered && !n.couple.side}
          coupleSecond={n.couple?.side === 'second'}
          onOpenFamilies={() => n.setScreen('families')}
          onOpenEnding={() => n.setScreen('ending')}
          onRestart={n.startFresh}
          followUpAsk={n.followUpAsk}
          onAnswerFollowUp={n.answerFollowUp}
          read={n.read}
          onReadStillStands={n.readStillStands}
          saveOk={n.saveOk}
          stage={n.stage}
          onSetStage={n.setStage}
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
          guideOnDevice={n.trust.guideOnDevice}
          onGuideOnDevice={(on) => n.setTrust((prev) => ({ ...prev, guideOnDevice: on }))}
          countMe={n.trust.countMe}
          onCountMe={(on) => n.setTrust((prev) => ({ ...prev, countMe: on }))}
          onForget={n.forgetEverything}
          onBack={() => n.setScreen(n.trustReturn)}
        />
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
          onOpenBeforeYes={() => n.openBeforeYes()}
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
          opensAt={n.elevenAt}
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
          // Her own link, opened on her own phone (docs/DESIGN.md N1).
          yours={n.couple?.code === n.entryCode && !n.couple?.side}
          onAnswered={(states, g, joint, lines) => n.answeredCouple(n.entryCode!, states, g, joint, lines)}
          onBegan={() => n.noteBegan('couple')}
          onRead={() => n.setScreen('read')}
          onBuildMap={n.beginMap}
          onHome={backHome}
        />
      )

    case 'families':
      return (
        <Families
          gender={n.identity.gender}
          stage={n.stage}
          onTaken={n.noteFamilyScript}
          onSetGender={(g: Gender) => n.setIdentity((prev) => ({ ...prev, gender: g }))}
          onBack={backHome}
        />
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
          onForget={n.forgetEverything}
          onBack={backHome}
        />
      )

    default:
      return welcome
  }
}
