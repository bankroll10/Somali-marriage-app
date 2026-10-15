import { useState, type Dispatch } from 'react'
import { Button, TextButton } from '../../../components/ui'
import { labelOf, nameOf } from '../criteria'
import { ControlsPanel } from '../ControlsPanel'
import { FixtureBlock } from '../Fixture'
import { fill } from '../fixtures'
import { completeSelf, locked, openLinks, person as personOf, visibleSuggestions, type Action, type Session } from '../flow'
import { H1, H2, Note, P, Screen } from '../parts'
import { compare, evaluate, pairFixture, pointNames, requirementsThatLeftPeopleOut } from '../suggest'
import type { Person } from '../types'
import { peopleFor } from '../fixtures'
import { SafetyRow } from './Safety'

type D = Dispatch<Action>

const cityOf = (p: Person) => labelOf('city', p.answers.city)

export function Suggestions({ s, dispatch }: { s: Session; dispatch: D }) {
  const [kept, setKept] = useState(false)
  const self = completeSelf(s.me)
  const people = s.me.side ? peopleFor(s.me.side) : []
  const left = self ? evaluate(self, people).leftOut : []
  const yours = requirementsThatLeftPeopleOut(left)
  const visible = visibleSuggestions(s).map((id) => personOf(s, id)!)
  const decided = s.shown.length - visible.length
  const anyActed = locked(s)

  return (
    <Screen onBack={() => dispatch({ type: 'go', stage: 'review' })}>
      <H1>Your suggestions.</H1>
      {s.shown.length === 0 ? (
        <>
          <P>No one fits what you have asked for right now.</P>
          <P muted>Nothing has been relaxed to fill this screen, and nothing here suggests you should change what you ask for. It is your choice.</P>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button onClick={() => dispatch({ type: 'go', stage: 'ask' })}>Review what you ask for</Button>
            <Button variant="outline" onClick={() => setKept(true)}>
              Keep it as it is
            </Button>
            <Button variant="outline" onClick={() => dispatch({ type: 'reset' })}>
              Leave
            </Button>
          </div>
          <div role="status" className="min-h-[1.5rem]">
            {kept && <Note>Kept as it is. Nothing changes unless you change it.</Note>}
          </div>
        </>
      ) : (
        <>
          <P>
            Up to three people who meet your requirements and whose own requirements you meet. Shown in no particular order. There is no score and no ranking.
          </P>
          {visible.length === 0 ? (
            <Note>That is all for now. Nothing refreshes by itself.</Note>
          ) : (
            <ul className="mt-6 grid gap-4">
              {visible.map((p) => {
                const c = compare(self!, p)
                return (
                  <li key={p.id} className="rounded-card border border-line bg-white/60 px-5 py-5 shadow-sm">
                    <h2 className="font-display text-[1.3rem] font-medium text-ink">{p.firstName}</h2>
                    <p className="text-[0.9rem] text-muted">
                      {p.age} · {cityOf(p)}
                    </p>
                    <p className="mt-3 text-[0.95rem] text-ink-soft">Meets your requirements.</p>
                    <p className="mt-1 text-[0.95rem] text-ink-soft">
                      {c.differ.length ? `Differs from your preferences on: ${pointNames(c.differ.map((d) => d.id))}.` : 'No differences from your preferences.'}
                    </p>
                    <Button variant="soft" className="mt-4" onClick={() => dispatch({ type: 'go', stage: 'suggestion', focus: p.id })}>
                      {`Read more about ${p.firstName}`}
                    </Button>
                  </li>
                )
              })}
            </ul>
          )}
          {decided > 0 && (
            <p className="mt-5">
              <TextButton className="text-forest underline" onClick={() => dispatch({ type: 'go', stage: 'people' })}>
                Your people
              </TextButton>
            </p>
          )}
          <p className="mt-6 text-[0.88rem] leading-snug text-muted text-pretty">
            {yours.length > 0 ? `Your requirements on ${pointNames(yours)} left some people out. ` : ''}
            Eligibility works both ways, and covers only the six points in this prototype.
          </p>
          {!anyActed && (
            <p className="mt-2">
              <TextButton className="text-forest underline" onClick={() => dispatch({ type: 'go', stage: 'ask' })}>
                Review what you ask for
              </TextButton>
            </p>
          )}
        </>
      )}
      <ControlsPanel s={s} dispatch={dispatch} where="suggestions" />
    </Screen>
  )
}

export function Suggestion({ s, dispatch }: { s: Session; dispatch: D }) {
  const p = s.focus ? personOf(s, s.focus) : undefined
  const self = completeSelf(s.me)
  if (!p || !self) return null
  const t = (x: string) => fill(x, p.side, p.firstName)
  const c = compare(self, p)
  const fixture = pairFixture(self, s.me.scenario, p)
  const decision = s.decision[p.id]
  const link = s.links[p.id]
  return (
    <Screen onBack={() => dispatch({ type: 'go', stage: 'suggestions' })}>
      <H1>{p.firstName}</H1>
      <p className="mt-2 text-[0.95rem] text-muted">
        {p.age} · {cityOf(p)} · Made up
      </p>
      <P muted>No photo is part of a suggestion.</P>

      <H2 id="line-up">Where you line up</H2>
      {c.lineUp.length ? (
        <ul className="mt-3 list-disc pl-5 text-[0.98rem] leading-relaxed text-ink-soft">
          {c.lineUp.map((x) => (
            <li key={x.id}>
              <span className="font-medium text-ink">{nameOf(x.id)}.</span> {x.text}
            </li>
          ))}
        </ul>
      ) : (
        <P muted>Nothing you marked as firm or preferred.</P>
      )}

      <H2 id="differ">Where you differ</H2>
      {c.differ.length ? (
        <ul className="mt-3 list-disc pl-5 text-[0.98rem] leading-relaxed text-ink-soft">
          {c.differ.map((x) => (
            <li key={x.id}>
              <span className="font-medium text-ink">{nameOf(x.id)}.</span> {x.text}
            </li>
          ))}
        </ul>
      ) : (
        <P muted>Nothing you marked as a preference.</P>
      )}
      {c.unused.length > 0 && <P muted>{`You said these do not matter, so they are not compared: ${pointNames(c.unused)}.`}</P>}

      <H2>{`In ${p.firstName}’s words`}</H2>
      <ul className="mt-3 grid gap-3">
        {p.words.map((w) => (
          <li key={w} className="rounded-2xl border border-line bg-white/50 px-4 py-3 text-[0.97rem] leading-relaxed text-ink-soft text-pretty">
            {w}
          </li>
        ))}
      </ul>

      <div className="mt-8 grid gap-4">
        <FixtureBlock id="fx-summary" title="A plain-language summary" result={fixture}>
          {(f) => <p className="text-[0.98rem] leading-relaxed text-ink-soft text-pretty">{f.text.summary}</p>}
        </FixtureBlock>
        <FixtureBlock id="fx-questions" title="Questions worth asking" result={fixture}>
          {(f) => (
            <ul className="list-disc pl-5 text-[0.98rem] leading-relaxed text-ink-soft">
              {f.text.questions.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
          )}
        </FixtureBlock>
      </div>

      <section aria-label="Your choice" className="mt-8">
        {decision === 'undecided' ? (
          <>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => dispatch({ type: 'decide', person: p.id, choice: 'interested' })}>I’m interested</Button>
              <Button variant="outline" onClick={() => dispatch({ type: 'decide', person: p.id, choice: 'passed' })}>
                Not for me
              </Button>
            </div>
            <p className="mt-3 text-[0.88rem] leading-snug text-muted text-pretty">
              {t('Interest is private. {name} is told only if {he} also chooses you. “Not for me” removes {name} from your suggestions, and {he} is not told.')}
            </p>
          </>
        ) : (
          <Note>{decision === 'interested' ? (link ? 'You chose each other.' : 'Interest recorded in this prototype.') : 'You chose not to go further.'}</Note>
        )}
      </section>

      <SafetyRow s={s} dispatch={dispatch} person={p} canDisconnect={link?.status === 'open'} />
      <ControlsPanel s={s} dispatch={dispatch} where="suggestion" person={p} />
    </Screen>
  )
}

export function People({ s, dispatch }: { s: Session; dispatch: D }) {
  const focus = s.focus ? personOf(s, s.focus) : undefined
  const open = openLinks(s)
  const waiting = s.shown.filter((id) => s.decision[id] === 'interested' && !s.links[id])
  const undecided = visibleSuggestions(s)
  const ended = s.shown.filter((id) => s.links[id] && s.links[id].status !== 'open')
  const blockedBefore = s.shown.filter((id) => s.decision[id] === 'blocked' && !s.links[id])
  const passed = s.shown.filter((id) => s.decision[id] === 'passed')
  const name = (id: string) => personOf(s, id)!.firstName
  const t = focus ? (x: string) => fill(x, focus.side, focus.firstName) : (x: string) => x
  const focusLink = focus ? s.links[focus.id] : undefined
  return (
    <Screen onBack={() => dispatch({ type: 'go', stage: 'suggestions' })}>
      <H1>Your people.</H1>
      <div role="status">
        {focus && s.decision[focus.id] === 'interested' && !focusLink && (
          <Note>{t('Interest recorded in this prototype. {name} is not told. If {he} also chooses you, a conversation opens.')}</Note>
        )}
        {focus && focusLink?.status === 'open' && (
          <Note>{t('You chose each other. A conversation with {name} is open, and either of you can write first. No photos have been shared: each of you decides that separately.')}</Note>
        )}
        {focus && s.decision[focus.id] === 'passed' && <Note>{t('{name} is removed from your suggestions. {He} is not told.')}</Note>}
        {focus && s.decision[focus.id] === 'blocked' && <Note>{t('{name} is blocked in this tab and will not be suggested again.')}</Note>}
        {focus && focusLink?.status === 'ended' && <Note>{t('The conversation with {name} has ended. In a product {name} would be told; here that is simulated.')}</Note>}
      </div>

      <H2>Open conversations</H2>
      {open.length ? (
        <ul className="mt-3 grid gap-3">
          {open.map((id) => (
            <li key={id}>
              <Button variant="soft" onClick={() => dispatch({ type: 'go', stage: 'conversation', focus: id })}>
                {`Open conversation with ${name(id)}`}
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <P muted>None yet.</P>
      )}

      <H2>Chosen by you, privately</H2>
      {waiting.length ? (
        <ul className="mt-3 list-disc pl-5 text-[0.98rem] text-ink-soft">
          {waiting.map((id) => (
            <li key={id}>{name(id)}</li>
          ))}
        </ul>
      ) : (
        <P muted>No one.</P>
      )}

      <H2>Still to decide</H2>
      {undecided.length ? (
        <ul className="mt-3 grid gap-3">
          {undecided.map((id) => (
            <li key={id}>
              <Button variant="outline" onClick={() => dispatch({ type: 'go', stage: 'suggestion', focus: id })}>
                {`Read more about ${name(id)}`}
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <P muted>No one. That is all for now; nothing refreshes by itself.</P>
      )}

      {(ended.length > 0 || blockedBefore.length > 0 || passed.length > 0) && (
        <>
          <H2>Not shown again</H2>
          <ul className="mt-3 list-disc pl-5 text-[0.98rem] text-ink-soft">
            {ended.map((id) => (
              <li key={id}>{`${name(id)}: ${s.links[id].status === 'blocked' ? 'blocked' : 'conversation ended'}`}</li>
            ))}
            {blockedBefore.map((id) => (
              <li key={id}>{`${name(id)}: blocked`}</li>
            ))}
            {passed.map((id) => (
              <li key={id}>{`${name(id)}: not for me`}</li>
            ))}
          </ul>
        </>
      )}
      <ControlsPanel s={s} dispatch={dispatch} where="people" />
    </Screen>
  )
}
