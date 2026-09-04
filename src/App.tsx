import { useLayoutEffect } from 'react'
import Welcome from './components/Welcome'
import IdentityStep from './components/Identity'
import Situation from './components/Situation'
import Hook from './components/Hook'
import Intake from './components/Intake'
import ReflectionView, { Generating } from './components/Reflection'
import Home from './components/Home'
import Coach from './components/Coach'
import Trust from './components/Trust'
import Philosophy from './components/Philosophy'
import Profile from './components/Profile'
import SampleIntroduction from './components/SampleIntroduction'
import Read from './components/Read'
import BeforeYes from './components/BeforeYes'
import Families from './components/Families'
import Couple from './components/Couple'
import Vouch from './components/Vouch'
import Plus from './components/Plus'
import Ending from './components/Ending'
import type { Gender } from './types'
import type { Entry } from './lib/entry'
import { buildRead, readSummary } from './lib/read'
import { beforeYesSummary, buildBeforeYes } from './lib/beforeYes'
import { useNiyyah } from './hooks/useNiyyah'

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

  // Keyed by screen so every navigation gets one soft, uniform fade-in.
  return (
    <div key={n.screen} className="animate-screen">
      <AppScreen n={n} />
    </div>
  )
}

function AppScreen({ n }: { n: ReturnType<typeof useNiyyah> }) {
  const hookId = n.answers['hardest-part'] as string | undefined
  const setScene = (scene: string) => n.setIdentity((prev) => ({ ...prev, scene }))
  // One line about her last read, recomputed from her answers rather than stored,
  // so a change to how we read never leaves an old verdict in the Guide's prompt.
  const readNote = (() => {
    if (!n.read) return undefined
    const built = buildRead(n.read.answers, n.identity.gender ?? 'woman')
    return built ? readSummary(built) : undefined
  })()
  const beforeYesNote = (() => {
    if (!n.beforeYes) return undefined
    const built = buildBeforeYes(n.beforeYes.answers, n.identity.gender ?? 'woman')
    return built ? beforeYesSummary(built) : undefined
  })()
  const backHome = () => n.setScreen(n.hasHome ? 'home' : 'welcome')

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
          answers={n.answers}
          onAnswer={n.answer}
          onComplete={n.completeIntake}
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
          onOpenSample={() => n.setScreen('sample')}
          onOpenRead={() => n.setScreen('read')}
          hasRead={!!n.read}
          onOpenBeforeYes={() => n.setScreen('beforeYes')}
          hasBeforeYes={!!n.beforeYes}
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
          ledger={n.ledgerEntries}
          guideOnDevice={n.trust.guideOnDevice}
          onGuideOnDevice={(on) => n.setTrust((prev) => ({ ...prev, guideOnDevice: on }))}
          countMe={n.trust.countMe}
          onCountMe={(on) => n.setTrust((prev) => ({ ...prev, countMe: on }))}
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
          waitlist={n.waitlist}
          onJoinWaitlist={n.joinedCohort}
          onAnswer={n.answer}
          onRetake={n.retakeMap}
          onBack={() => n.setScreen('home')}
        />
      )

    case 'read':
      return (
        <Read
          identity={n.identity}
          saved={n.read}
          onSave={n.setRead}
          onSetGender={(g: Gender) => n.setIdentity((prev) => ({ ...prev, gender: g }))}
          onAskGuide={(text) => n.askGuide(text, n.identity.gender)}
          onBuildMap={n.beginMap}
          hasMap={n.completed}
          onOpenFamilies={() => n.setScreen('families')}
          onOpenBeforeYes={() => n.setScreen('beforeYes')}
          onBack={backHome}
        />
      )

    case 'beforeYes':
      return (
        <BeforeYes
          identity={n.identity}
          answers={n.answers}
          saved={n.beforeYes}
          onSave={n.setBeforeYes}
          onSetGender={(g: Gender) => n.setIdentity((prev) => ({ ...prev, gender: g }))}
          onAskGuide={(text) => n.askGuide(text, n.identity.gender)}
          onOpenFamilies={() => n.setScreen('families')}
          onBuildMap={n.beginMap}
          hasMap={n.completed}
          couple={n.couple}
          onCouple={n.setCouple}
          onBack={backHome}
        />
      )

    case 'couple':
      // He arrived on her link. No identity yet; the screen learns his gender
      // from the record and his answers become his own Before you say yes.
      if (!n.entryCode) return welcome
      return (
        <Couple
          code={n.entryCode}
          onAnswered={(states, g) => {
            n.setBeforeYes({ at: new Date().toISOString(), answers: states })
            n.setIdentity((prev) => ({ ...prev, gender: g }))
          }}
          onRead={() => n.setScreen('read')}
          onBuildMap={n.beginMap}
          onHome={() => n.setScreen('welcome')}
        />
      )

    case 'vouch':
      // A family member arrived on her link. No identity, no account: one screen.
      if (!n.entryCode) return welcome
      return <Vouch code={n.entryCode} onDone={() => n.setScreen('welcome')} />

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
          onAnswer={n.answer}
          onBack={() => n.setScreen('home')}
        />
      )

    case 'plus':
      return (
        <Plus onBack={() => n.setScreen('profile')} />
      )

    case 'ending':
      return (
        <Ending
          identity={n.identity}
          ending={n.endingRecord}
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
          primaryLabel={fromWelcome ? 'Begin your reflection' : 'Back to your space'}
        />
      )
    }

    default:
      return welcome
  }
}
