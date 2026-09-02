import Welcome from './components/Welcome'
import IdentityStep from './components/Identity'
import Hook from './components/Hook'
import Intake from './components/Intake'
import ReflectionView, { Generating } from './components/Reflection'
import Home from './components/Home'
import Coach from './components/Coach'
import Trust from './components/Trust'
import Philosophy from './components/Philosophy'
import Profile from './components/Profile'
import Discovery from './components/Discovery'
import Connections from './components/Connections'
import Conversation from './components/Conversation'
import Plus from './components/Plus'
import { candidatesFor, getCandidate } from './data/candidates'
import { guideOpeningLine } from './data/checkin'
import { alignment } from './lib/matching'
import { useNiyyah } from './hooks/useNiyyah'

export default function App() {
  const n = useNiyyah()

  // Keyed by screen so every navigation gets one soft, uniform fade-in.
  return (
    <div key={n.screen} className="animate-screen">
      <AppScreen n={n} />
    </div>
  )
}

function AppScreen({ n }: { n: ReturnType<typeof useNiyyah> }) {
  // Today's introduction — the single best not-yet-acted-on person, surfaced on
  // Home as an honest curiosity hook (one considered intro, not a feed). Gated
  // on verification, so we never dangle a name behind the trust wall.
  const todayIntro = (() => {
    if (!n.trust.identityVerified || !n.identity.gender) return null
    const acted = new Set([...n.matched, ...n.pendingInterest, ...n.passed])
    const top = candidatesFor(n.identity.gender)
      .filter((c) => !acted.has(c.id))
      .map((c) => ({ c, a: alignment(n.answers, c) }))
      .sort((x, y) => {
        const xs = x.c.scene === n.identity.scene ? 1 : 0
        const ys = y.c.scene === n.identity.scene ? 1 : 0
        if (xs !== ys) return ys - xs
        return y.a.score - x.a.score
      })[0]
    if (!top) return null
    return {
      name: top.c.name,
      age: top.c.age,
      reason: top.a.reasons[0] ?? null,
      headline: top.a.headline,
    }
  })()

  const welcome = (
    <Welcome
      onBegin={n.startFresh}
      hasProgress={n.hasProgress}
      completed={n.completed}
      onResume={n.resume}
      onEnter={n.enterHome}
      onPhilosophy={() => n.openPhilosophy('welcome')}
    />
  )

  const connections = (
    <Connections
      matched={n.matched}
      conversations={n.conversations}
      onOpen={n.openConversation}
      onDiscover={() => n.setScreen('discovery')}
      onBack={() => n.setScreen('home')}
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
          onContinue={() => n.setScreen('hook')}
          onBack={() => n.setScreen('welcome')}
        />
      )

    case 'hook':
      return (
        <Hook
          identity={n.identity}
          value={n.answers['hardest-part'] as string | undefined}
          onSelect={(id) => n.answer('hardest-part', id)}
          onContinue={n.beginIntake}
          onBack={() => n.setScreen('identity')}
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
          hookId={n.answers['hardest-part'] as string | undefined}
          onJoinWaitlist={n.setWaitlist}
          firstReveal={n.mapReveal}
          onContinue={n.enterHome}
          onRetake={n.retakeMap}
          onOpenGuide={n.openGuide}
        />
      )

    case 'home':
      if (!n.reflection) return welcome
      return (
        <Home
          identity={n.identity}
          reflection={n.reflection}
          trust={n.trust}
          onOpenGuide={(mode) => n.openGuide(mode ?? null)}
          onAsk={(text, mode) => n.askGuide(text, n.identity.gender, mode)}
          onOpenMap={() => n.setScreen('reflection')}
          onOpenProfile={() => n.setScreen('profile')}
          onOpenDiscovery={() => n.setScreen('discovery')}
          onOpenConnections={() => n.setScreen('connections')}
          connectionsCount={n.matched.length}
          onPhilosophy={() => n.openPhilosophy('home')}
          onRestart={n.startFresh}
          checkInMood={n.todayMood}
          checkIns={n.checkIns}
          onCheckIn={n.recordCheckIn}
          steps={n.steps}
          onTakeStep={n.takeStep}
          onCompleteStep={n.completeStep}
          lastReading={n.mapHistory[n.mapHistory.length - 1]?.date}
          saveOk={n.saveOk}
          firstSeen={n.firstSeen}
          pendingNames={n.pendingInterest
            .map((id) => getCandidate(id)?.name)
            .filter((x): x is string => !!x)}
          todayIntro={todayIntro}
          stage={n.stage}
          onSetStage={n.setStage}
          hookId={n.answers['hardest-part'] as string | undefined}
        />
      )

    case 'coach':
      return (
        <Coach
          identity={n.identity}
          answers={n.answers}
          matchedNames={n.matched
            .map((id) => getCandidate(id)?.name)
            .filter((x): x is string => !!x)}
          pendingNames={n.pendingInterest
            .map((id) => getCandidate(id)?.name)
            .filter((x): x is string => !!x)}
          passedIds={n.passed}
          threads={n.coachThreads}
          onThreadsChange={n.setCoachThreads}
          moodLine={guideOpeningLine(n.checkIns)}
          initialMode={n.guideMode}
          initialAsk={n.guideAsk}
          onAskConsumed={n.clearGuideAsk}
          onDeviceOnly={n.trust.guideOnDevice}
          plusActive={n.plusActive}
          repliesLeft={n.repliesLeft}
          onSpendReply={n.spendReply}
          onOpenPlus={() => n.setScreen('plus')}
          onBack={() => n.setScreen('home')}
        />
      )

    case 'trust':
      return (
        <Trust
          identity={n.identity}
          trust={n.trust}
          onChange={n.setTrust}
          onBack={() => n.setScreen(n.trustReturn)}
        />
      )

    case 'profile':
      if (!n.reflection) return welcome
      return (
        <Profile
          identity={n.identity}
          answers={n.answers}
          reflection={n.reflection}
          trust={n.trust}
          onChangeBio={(bio) => n.setIdentity((prev) => ({ ...prev, bio }))}
          onChangeIdentity={n.setIdentity}
          saveOk={n.saveOk}
          onOpenTrust={() => n.openTrust('profile')}
          onOpenPlus={() => n.setScreen('plus')}
          plusActive={n.plusActive}
          trialDaysLeft={n.trialDaysLeft}
          waitlist={n.waitlist}
          onJoinWaitlist={n.setWaitlist}
          onRetake={n.retakeMap}
          onBack={() => n.setScreen('home')}
        />
      )

    case 'discovery':
      return (
        <Discovery
          identity={n.identity}
          answers={n.answers}
          trust={n.trust}
          matched={n.matched}
          pendingInterest={n.pendingInterest}
          passed={n.passed}
          interestNotes={n.interestNotes}
          onExpressInterest={n.expressInterest}
          onPass={n.passOn}
          onSetNote={n.setInterestNote}
          onReport={n.reportCandidate}
          onOpenConversation={n.openConversation}
          onVerify={() => n.openTrust('discovery')}
          onBack={() => n.setScreen('home')}
        />
      )

    case 'connections':
      return connections

    case 'conversation': {
      const candidate = n.activeMatch ? getCandidate(n.activeMatch) : undefined
      // Stale or missing match — render the list they came from rather than a
      // blank screen. Setting state here instead would be a state update during
      // render, which React rejects and which costs a blank frame either way.
      if (!candidate || !n.activeMatch) return connections
      const matchId = n.activeMatch
      return (
        <Conversation
          candidate={candidate}
          userName={n.identity.firstName}
          waliEligible={candidate.trust.waliFriendly}
          messages={n.conversations[matchId] ?? []}
          note={n.interestNotes[matchId] || undefined}
          onAppend={(msgs) => n.appendConversation(matchId, msgs)}
          onReport={() => {
            n.reportCandidate(matchId)
            n.setScreen('connections')
          }}
          onBack={() => n.setScreen('connections')}
        />
      )
    }

    case 'plus':
      return (
        <Plus
          plusActive={n.plusActive}
          trialDaysLeft={n.trialDaysLeft}
          trialUsed={n.trialUsed}
          repliesLeft={n.repliesLeft}
          onStartTrial={n.startTrial}
          onEndTrial={n.endTrial}
          onBack={() => n.setScreen('profile')}
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
