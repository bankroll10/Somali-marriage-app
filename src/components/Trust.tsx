import { useState, type ReactNode } from 'react'
import type { Identity } from '../types'
import type { LedgerEntry } from '../lib/ledger'
import { BackButton, CheckIcon, Disclose, LockGlyph, Logo, TextButton } from './ui'
import ReportConcern from './ReportConcern'
import { CONTACT_EMAIL } from '../lib/site'
import { speak } from '../data/read'

interface Props {
  identity: Identity
  /**
   * The two-sided eleven she started, if any — the only place this product
   * knows who somebody has been in touch with, and so the only thing a report
   * can be filed against.
   */
  coupleCode?: string | null
  /** What she has actually done here — see src/lib/ledger.ts. */
  ledger: LedgerEntry[]
  guideOnDevice: boolean
  onGuideOnDevice: (on: boolean) => void
  countMe: boolean
  onCountMe: (on: boolean) => void
  /** Delete everything kept under her codes, then start this phone over. */
  onForget: () => Promise<{ map: boolean; progress: boolean; couple: boolean; reports: boolean }>
  onBack: () => void
}

/**
 * Trust, made honest.
 *
 * This screen used to carry a trust score and five switches — an identity
 * "verification" that recorded a pledge, a serious-intention badge,
 * wali-friendly, blur photos, a privacy shield. Nothing enforced any of them.
 * A screen full of protections that do not exist is the opposite of trust.
 *
 * What is here now is true by construction: the ledger of what she has done
 * (which cannot be tapped), the one control that does what it says, and the
 * exact account of where her answers live.
 */
/** A list inside a disclosure — the same size and colour as the paragraph it follows. */
const LIST = 'mt-2 list-disc space-y-1 pl-5 text-[0.88rem] leading-snug text-muted'

export default function Trust({ identity, coupleCode, ledger, guideOnDevice, onGuideOnDevice, countMe, onCountMe, onForget, onBack }: Props) {
  const fix = speak(identity.gender)
  const [forgetting, setForgetting] = useState<'idle' | 'sure' | 'working'>('idle')
  // What a failed server delete left behind, named rather than hidden.
  const [stillHeld, setStillHeld] = useState<string[]>([])

  return (
    <div className="min-h-dvh bg-cream pb-20 pt-safe">
      <header className="border-b border-line/70 bg-cream/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <BackButton onClick={onBack} />
          <Logo className="text-ink" />
          <span className="text-xs uppercase tracking-[0.2em] text-muted">Trust</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6">
        <section className="py-10">
          <h1 className="animate-rise font-display text-[2rem] font-medium leading-tight tracking-tight text-ink text-balance sm:text-[2.4rem]">
            What you have done here.
          </h1>
          <p className="animate-rise mt-4 max-w-lg text-[1.04rem] leading-relaxed text-ink-soft text-pretty">
            Not a badge you tap. Each of these costs a little time and a little honesty, and none can
            be faked. If a pool ever opens here, this is what would decide who you meet, and nothing
            is deciding it yet. Every one is yours to do or not.
          </p>

          {/* The ledger. Facts, in order; no number anywhere. */}
          <ul className="animate-rise mt-8 divide-y divide-line overflow-hidden rounded-card border border-line bg-white/60">
            {ledger.map((e) => (
              <li key={e.id} className="flex items-start gap-3.5 px-5 py-4">
                <span
                  className={`mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full border ${
                    e.done ? 'border-forest bg-forest text-cream' : 'border-line bg-cream'
                  }`}
                  aria-hidden
                >
                  {e.done && <CheckIcon size={12} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-[0.98rem] font-medium ${e.done ? 'text-ink' : 'text-ink-soft'}`}>
                    {e.label}
                  </span>
                  <span className="mt-0.5 block text-[0.85rem] leading-snug text-muted text-pretty">{e.line}</span>
                </span>
                <span className="sr-only">{e.done ? 'done' : 'not yet'}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* The two controls that do what they say. Each gates the call itself. */}
        <div className="space-y-4">
          <Control
            title="Keep the Guide on this device"
            desc="Your guide answers from your phone alone. Answers are shorter and less tailored, and nothing you write to it leaves — not your question, not your map."
            icon={<LockGlyph />}
            on={guideOnDevice}
            onToggle={() => onGuideOnDevice(!guideOnDevice)}
          />

          <Control
            title="Tell us which steps you reach"
            desc="On unless you turn it off. Opening Niyyah is counted once; after that, each step above, the first time you reach it."
            icon={<LockGlyph />}
            on={countMe}
            onToggle={() => onCountMe(!countMe)}
            more={
              <>
                <p className="text-[0.88rem] leading-snug text-muted text-pretty">
                  The step, the date, and for a few steps how it came out, in a word from a list we
                  wrote — under a random code that is not your map code. No answer in your words, and
                  no name. It is how we find out whether any of this helps. Turn it off and nothing
                  is sent.
                </p>
              </>
            }
          />
        </div>

        {/* Where the data lives — the skeptic's first question, answered plainly.
            Every sentence here must match the code that sends something.

            Until 2026-09-18 every sentence was also *open*, in seven stacked
            paragraphs (docs/LOAD.md); that pass folded them into six rows and
            kept every word. The voice pass (docs/VOICE.md) then cut what was
            said twice — the second copy, "turn it off", "never" seven times in
            two sentences — and turned the four longest sentences into lists.
            Each clause still matches a line of code that sends something;
            tests/load.test.ts pins the six that were hardest to say. */}
        <section className="mt-6">
          <div className="flex items-start gap-4 rounded-card border border-line bg-white/50 p-5">
            <span className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-sand text-ink-soft">
              <LockGlyph />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-[1.08rem] font-medium text-ink">Where your answers live</h2>
              <p className="mt-1 text-[0.88rem] leading-snug text-muted text-pretty">
                Everything you answer stays on this phone. It leaves only if you tap one of the six
                things below, and each says exactly what goes. We never ask anyone else’s name.
              </p>
            </div>
          </div>

          <div className="mt-3 space-y-2.5">
            <Disclose summary="Keeping your map" hint="Your answers — not your email">
              <p className="text-[0.88rem] leading-snug text-muted text-pretty">
                If you ask us to keep it, what the app needs to bring you back is copied to our server
                under your code:
              </p>
              <ul className={LIST}>
                <li>the first name you gave, and your age</li>
                <li>your answers, and every reading of your map</li>
                <li>where you said you are, and how far you’d go</li>
                <li>the work you took on</li>
                <li>any read or Before you say yes you’ve done</li>
                <li>your couple code, and your family’s vouch</li>
                <li>that you asked to be counted</li>
                <li>if you’ve married, what you told us on the way out</li>
              </ul>
              <p className="mt-2.5 text-[0.88rem] leading-snug text-muted text-pretty">
                Left out: your email or phone, your conversations with the guide, and anything the
                guide handed you to say. Those stay on this phone.
              </p>
              <p className="mt-2.5 text-[0.88rem] leading-snug text-muted text-pretty">
                The code is registered to nobody, and without it nobody can reach the map.
              </p>
            </Disclose>

            <Disclose summary="Asking to be counted" hint="Your city and how to reach you, kept apart">
              <p className="text-[0.88rem] leading-snug text-muted text-pretty">
                If you ask to be counted, your map is kept as above — kept again that day, as it is
                then. If you have not given your age we ask it first, because an introduction cannot
                be made without one; it goes into your map and not onto the door. Under that same
                code, with no name on it, we also record:
              </p>
              <ul className={LIST}>
                <li>your city and country</li>
                <li>how far you said you’d go for the right person</li>
                <li>who you’re seeking</li>
                <li>the hardest part you named</li>
                <li>which of the things above you’ve done</li>
              </ul>
              <p className="mt-2.5 text-[0.88rem] leading-snug text-muted text-pretty">
                Nothing about how your map read, and nothing about how you use the app, goes
                anywhere.
              </p>
              <p className="mt-2.5 text-[0.88rem] leading-snug text-muted text-pretty">
                Your email or phone is kept apart from all of that, in a store of its own, with only
                your city and country beside it, so you can be reached if your pool opens or if the
                people you’d travel for are counted. Nothing writes to anyone yet. It lives exactly as
                long as your kept map does: when the map lapses, so does the way to reach you.
              </p>
              <p className="mt-2.5 text-[0.88rem] leading-snug text-muted text-pretty">
                Your kept map lives in one place, with the company we rent storage from, and the founder’s
                backup does not include it. If that storage were lost, the map would be too, which is
                why it also stays on your phone.
              </p>
              <p className="mt-2.5 text-[0.88rem] leading-snug text-muted text-pretty">
                Once you are counted, the founder can read your kept map along with everyone else’s
                in your pool, to count the pool’s shape: how many women and men of each age, how many
                are still looking, how many pairs clear each other’s non-negotiables both ways, and
                how many have nobody here who does.
              </p>
              <p className="mt-2.5 text-[0.88rem] leading-snug text-muted text-pretty">
                What comes back has no code on it and is not a map or a person: how many are here in
                total, and beyond that only groups of five or more —
                a breakdown that would come back as one or two comes back blank instead.
              </p>
              <p className="mt-2.5 text-[0.88rem] leading-snug text-muted text-pretty">
                A map nobody has kept for a year lapses, and the same reading takes it off the door.
              </p>
            </Disclose>

            <Disclose summary={fix('Asking {him} to do the eleven too')} hint="Only where you match comes back">
              <p className="text-[0.88rem] leading-snug text-muted text-pretty">
                {fix(`If you send {him} the link, your eleven answers go to our server under a
                code with no name on it, and {his} go there when {he} answers. The server
                sends back only where you match — not your sheet to {him}, and not {his}
                to you. From your own answer you can still tell whether {he} thinks a
                conversation happened; that is the point, and {he} can tell the same
                about you.`)}
              </p>
              <p className="mt-2.5 text-[0.88rem] leading-snug text-muted text-pretty">
                {fix(`Your answers are frozen the moment {he} answers, {his} after
                once, and the whole thing expires after ninety days. Once {he} has
                answered, your pair is also added to a count of how pairs come out on
                each of the eleven — both agree, neither has raised it, one thinks it
                was talked about — with no code and no side attached, so we can learn
                which conversations couples here most often miss.`)}
              </p>
            </Disclose>

            <Disclose summary="Asking your family to vouch" hint="The link carries a token, not your code">
              <p className="text-[0.88rem] leading-snug text-muted text-pretty">
                If you send a family member the link, your map is kept as above. The link carries a
                token made for them, not your code, so nobody holding it can open your map.
              </p>
              <p className="mt-2.5 text-[0.88rem] leading-snug text-muted text-pretty">
                What they write — who they are to you, their first name, one sentence, and a phone
                number if they leave one — is stored under your code, and goes when your map goes.
                Only their first name and who they are to you come back to any screen. Their sentence
                and their number are read by the founder alone, who may call to confirm, and are not
                shown to anyone you meet.
              </p>
            </Disclose>

            <Disclose summary="The steps you reach" hint="One word per step, once">
              <p className="text-[0.88rem] leading-snug text-muted text-pretty">
                While <span className="font-medium text-ink">Tell us which steps you reach</span> is
                on, the first time you reach one of the steps above — you said what was happening,
                you built a map, you kept it, you took a read, you went through the eleven,{' '}
                {fix('you asked {him}, {he} answered')}, you had the conversation, your family
                vouched, you were counted, you’re deciding, you’re married — that step and the date
                reach us, with your city if you gave one, and whether you said you are a woman or a
                man, so we can tell whether men are reaching the door at all.
              </p>
              <p className="mt-2.5 text-[0.88rem] leading-snug text-muted text-pretty">
                A few of those steps also say, in a word, how they came out:
              </p>
              <ul className={LIST}>
                <li>which of your map’s seven grounds read thin, steady or strong</li>
                <li>how the read came out, and which ground it found thinnest</li>
                <li>
                  how many of the eleven you had agreed on, differed on, not had, or did not yet know
                  your own answer to, and which one it told you to open
                </li>
                <li>which conversation you later confirmed you had</li>
                <li>
                  at the end, the three things you tap on the way out — who you married, what decided
                  it, and what here you used
                </li>
              </ul>
              <p className="mt-2.5 text-[0.88rem] leading-snug text-muted text-pretty">
                {fix(`If something you were in ends and you say so, it also says that it ended,
                whether you were getting to know {him} or deciding, and — only if you tap one —
                what decided it: a non-negotiable and which, one of the eleven and which, what
                {his} read had found thin, your family, {his}, timing, distance, {he} stopped, you
                did, or something you’d rather not say.`)}
              </p>
              <p className="mt-2.5 text-[0.88rem] leading-snug text-muted text-pretty">
                If you reach the door and tap “not now”, and say why, that one word too — you’d
                rather not leave an email or phone, someone might see you here, your family doesn’t
                know, you want to see who’s here first, you’re not sure you’re ready, or something
                else. Every one of those is a choice from a list we wrote.
              </p>
              <p className="mt-2.5 text-[0.88rem] leading-snug text-muted text-pretty">
                It also says which of the four — the map, a read, the eleven, or the eleven someone
                sent you — you <span className="font-medium text-ink">began</span>, so we can tell
                whether they are too long to finish.
              </p>
              <p className="mt-2.5 text-[0.88rem] leading-snug text-muted text-pretty">
                That is one word each, once: never how far you got, never how long you spent, and
                not how many times you came back, an answer in your words, the line you write for the
                next person, a word the guide said or you said to it, or a name —{' '}
                {fix('{his}')}, yours or your family’s.
              </p>
              <p className="mt-2.5 text-[0.88rem] leading-snug text-muted text-pretty">
                If you opened Niyyah from a link someone sent you, it also says what kind of link
                that was — words, the eleven, a couple’s link, the door, a family link, a link shared
                into a community’s group, or a link from someone this worked for — and not who sent
                it, or which group.
              </p>
              <p className="mt-2.5 text-[0.88rem] leading-snug text-muted text-pretty">
                One more word, once: that you have asked the guide at all — not what you asked, not
                how often, not a word of what either of you said.
              </p>
              <p className="mt-2.5 text-[0.88rem] leading-snug text-muted text-pretty">
                It goes under a code this phone made up for itself, which is not your map code, and
                every date is a day, not a time.
              </p>
            </Disclose>

            <Disclose summary="The Guide" hint="Your message and a summary of your map">
              <p className="text-[0.88rem] leading-snug text-muted text-pretty">
                Here is exactly what the Guide sends when you ask it something: your message and
                the earlier messages in that conversation, and a summary of your map —
              </p>
              <ul className={LIST}>
                <li>your age range, whether you are a woman or a man, and your city</li>
                <li>your timeline, where you are in your practice, and how central faith is</li>
                <li>your family’s role, and children</li>
                <li>how you lean in closeness, and what you said you feel safe with</li>
                <li>your non-negotiables, and the hardest part you named</li>
                <li>which stage you said you’re at</li>
                <li>if you’ve taken a read, or been through Before you say yes, one line saying how each came out</li>
              </ul>
              <p className="mt-2.5 text-[0.88rem] leading-snug text-muted text-pretty">
                Not their name; we don’t have it. It goes to Claude, made by Anthropic, which writes
                the reply. We don’t store it. If you would rather none of that left your phone, turn
                on <span className="font-medium text-ink">Keep the Guide on this device</span> above,
                and the guide answers offline instead.
              </p>
            </Disclose>
          </div>
        </section>

        {/* Forget me — the control that makes every sentence above enforceable. */}
        <section className="mt-6 rounded-card border border-line bg-white/50 p-5">
          <h2 className="font-display text-[1.08rem] font-medium text-ink">Forget me</h2>
          <p className="mt-1 text-[0.88rem] leading-snug text-muted text-pretty">
            Deletes your kept map, your family’s vouch and the link they used, your place on the
            door, {fix('the eleven you sent {him}')}, any concern you reported from this phone, the
            count of your steps, and your email or phone — then clears this phone. If you come back after this, you start as a stranger.
          </p>
          {/* The two honest limits used to sit in the middle of the paragraph
              above, which is the least likely place a person reads them. They
              are the same words, under a name that says what they are. */}
          <Disclose
            summary="The one thing it cannot reach"
            hint="A count with no code"
            className="mt-3"
          >
            <p className="text-[0.88rem] leading-snug text-muted text-pretty">
              {fix('If {he} answered your eleven,')} your pair was already added to a count of how
              pairs come out, and that count carries no code, so it cannot be found again — by us
              or by you.
            </p>
          </Disclose>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {forgetting === 'idle' && (
              <button
                onClick={() => setForgetting('sure')}
                className="rounded-full border border-clay/50 px-5 py-2.5 text-[0.88rem] font-medium text-clay transition hover:bg-clay/10"
              >
                Forget me
              </button>
            )}
            {forgetting === 'sure' && (
              <>
                <button
                  onClick={async () => {
                    setForgetting('working')
                    const result = await onForget()
                    // A full success replaces the page and never gets here.
                    setStillHeld(
                      [
                        !result.map && 'your kept map',
                        !result.progress && 'the count of your steps',
                        !result.couple && 'the eleven you sent',
                        !result.reports && 'the concern you reported',
                      ].filter((s): s is string => !!s),
                    )
                    setForgetting('idle')
                  }}
                  className="rounded-full bg-clay px-5 py-2.5 text-[0.88rem] font-medium text-cream transition hover:opacity-90"
                >
                  Yes, delete everything
                </button>
                <TextButton onClick={() => setForgetting('idle')} className="text-[0.85rem] font-medium text-muted hover:underline">
                  Keep it
                </TextButton>
                <span className="text-[0.82rem] text-muted">This cannot be undone.</span>
              </>
            )}
            {stillHeld.length > 0 && (
              <p role="status" className="w-full text-[0.85rem] leading-snug text-clay text-pretty">
                This phone is cleared. We could not reach {stillHeld.join(' and ')} just now, so
                {stillHeld.length > 1 ? ' they are' : ' it is'} still held — that is us, not you.
                Tap Forget me again in a moment, or write to{' '}
                <span className="font-medium">{CONTACT_EMAIL}</span> and it goes by hand.
              </p>
            )}
            {forgetting === 'working' && <span className="text-[0.88rem] text-muted">Forgetting…</span>}
          </div>
        </section>

        {/* Community promise */}
        <section className="mt-6 rounded-card bg-forest p-6 text-cream">
          <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-gold-soft">Our promise</h2>
          <p className="mt-3 text-[1rem] leading-relaxed text-cream/90 text-pretty">
            Every member is held to the same standard. Wherever we know who
            you’ve been in touch with — right now, that means after the eleven —
            you can report a concern about them, in your own words if you need
            to.
          </p>
          {/* The mechanism, and its honest limit — 182 words that a person
              reading a promise does not have to read to trust it, and must be
              able to find the moment she wants to hold us to it
              (docs/LOAD.md). Same words, on a row that says what they are. */}
          {/* The route, on the screen that promises it.
              This paragraph has said "you can report a concern about them"
              since the safety function shipped, and this screen offered no way
              to do it: the only one in the product was at the foot of the joint
              sheet, four taps deep, reachable only after he had answered. A
              person is most motivated to report weeks later, when something has
              happened — and at that moment the prompt did not exist anywhere
              she would look (docs/FOGG.md). */}
          {coupleCode && (identity.gender === 'woman' || identity.gender === 'man') && (
            <div className="mt-4 rounded-card border border-cream/20 bg-cream/10 p-4">
              <ReportConcern code={coupleCode} side={identity.gender} />
            </div>
          )}

          <Disclose
            summary="Exactly what a report does"
            hint="And its limit"
            className="mt-4 border-cream/20 bg-cream/10"
          >
            <p className="text-[0.95rem] leading-relaxed text-cream/90 text-pretty">
              It reaches the founder, who reads these every week. She can speak
              to them, tell the family who vouched for them, and decide that
              nobody here will ever introduce them. What she did is written
              down, though until introductions exist that decision is a note in
              her queue, not a mark on a person, because nobody here has an
              account to mark.
            </p>
            <p className="mt-2.5 text-[0.95rem] leading-relaxed text-cream/90 text-pretty">
              There are no accounts here, so nobody can be thrown off a list
              that doesn’t exist; whoever answered your eleven left no account
              behind either. That is why the vouch and the introduction are
              where the weight sits.
            </p>
          </Disclose>
        </section>
      </main>
    </div>
  )
}

/**
 * A control, its one-line reason, and — behind a tap — the whole truth.
 *
 * `desc` is the sentence that answers the question most people have; `more` is
 * the part that only matters if they want it. Count me's reason used to be a
 * hundred words of storage mechanics sitting open above the switch
 * (docs/LOAD.md), which is a fine way to make a person stop reading before the
 * sentence that says they can turn it off.
 */
function Control({
  title,
  desc,
  icon,
  on,
  onToggle,
  more,
}: {
  title: string
  desc: string
  icon: ReactNode
  on: boolean
  onToggle: () => void
  more?: ReactNode
}) {
  return (
    <div className="rounded-card border border-line bg-white/50">
      {/* The switch used to be the only clickable 28px in this row — its
          own title and description, right beside it, did nothing. The
          whole row is the control now; the visual switch (Toggle) is
          decorative. */}
      <button
        onClick={onToggle}
        role="switch"
        aria-checked={on}
        className="flex w-full items-start gap-4 p-5 text-left"
      >
        <span className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-sand text-ink-soft">{icon}</span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-[1.08rem] font-medium text-ink">{title}</h2>
          <p className="mt-1 text-[0.88rem] leading-snug text-muted text-pretty">{desc}</p>
        </div>
        <div className="flex-none pt-0.5">
          <Toggle on={on} />
        </div>
      </button>
      {more && (
        <div className="px-5 pb-4">
          <Disclose summary="What exactly is counted" className="bg-transparent" divided={false}>
            {more}
          </Disclose>
        </div>
      )}
    </div>
  )
}

/** Purely decorative — the click handler and a11y role live on the row (Control) that wraps this. */
function Toggle({ on }: { on: boolean }) {
  return (
    <span aria-hidden className={`relative block h-7 w-12 flex-none rounded-full transition-colors duration-200 ${on ? 'bg-forest' : 'bg-sand'}`}>
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-cream shadow transition-all duration-200 ${on ? 'left-6' : 'left-1'}`} />
    </span>
  )
}
