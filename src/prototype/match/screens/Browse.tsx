import { useEffect, useRef, type Dispatch } from 'react'
import { Button, TextButton } from '../../../components/ui'
import { PROMPTS, labelOf, pointName } from '../criteria'
import { ControlsPanel } from '../ControlsPanel'
import { FixtureBlock } from '../Fixture'
import { fill } from '../fixtures'
import { completeSelf, openLinks, person as personOf, visibleSuggestions, type Action, type Notice, type Session } from '../flow'
import { H1, H2, Note, P, Screen } from '../parts'
import { basisLine, compare, differenceLines, pairFixture, pointNames, resolveBasis, summaryPoints } from '../suggest'
import { CRITERION_IDS, type PointId, type Person } from '../types'
import { SafetyRow } from './Safety'

type D = Dispatch<Action>

/** What each last transition says, with the person's name and pronouns filled in. */
const NOTICE: Record<Notice['kind'], string> = {
  interest: 'Interest recorded in this demo. {name} is not told. If {he} also chooses you, a conversation opens.',
  withdrawn: 'You withdrew your interest in {name}. {He} was not told, and is not told now. {name} is back in your suggestions.',
  undone: '{name} is back in your suggestions.',
  mutual: 'You chose each other. A conversation with {name} is open, and either of you can write first. No photos have been shared: each of you decides that separately.',
  ended: 'The conversation with {name} has ended. In a product {name} would be told; here that is simulated.',
  blocked: '{name} is blocked in this tab and will not be suggested again.',
}

/**
 * Where focus goes when the control that was pressed is replaced by what it did: onto the
 * status line, so a keyboard or screen-reader user is neither dropped on the page nor left
 * on a control that has gone. `ask()` is called by the press; the effect runs once the
 * new status is on screen.
 */
function useStatusFocus(trigger: unknown) {
  const ref = useRef<HTMLDivElement>(null)
  const want = useRef(false)
  useEffect(() => {
    if (want.current) ref.current?.focus()
    want.current = false
  }, [trigger])
  return { ref, ask: () => void (want.current = true) }
}

const cityOf = (p: Person) => labelOf('city', p.answers.city)

export function Suggestions({ s, dispatch }: { s: Session; dispatch: D }) {
  const self = completeSelf(s.me)
  const visible = visibleSuggestions(s).map((id) => personOf(s, id)!)
  const decided = s.shown.length - visible.length

  return (
    <Screen onBack={() => dispatch({ type: 'go', stage: 'review' })}>
      <H1>Your suggestions.</H1>
      {s.shown.length === 0 ? (
        <>
          <P>No one is suggested to you right now.</P>
          <P muted>
            Suggestions appear only when you and the other person each meet the other’s requirements. Nothing is added to this list for any other reason, and
            nothing refreshes by itself.
          </P>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={() => dispatch({ type: 'go', stage: 'review' })}>
              See what I asked for
            </Button>
            <Button variant="outline" onClick={() => dispatch({ type: 'reset' })}>
              Stop here
            </Button>
          </div>
        </>
      ) : (
        <>
          <P>People who meet your requirements, and whose requirements you meet. Up to three, in no particular order. There is no score and no ranking.</P>
          {visible.length === 0 ? (
            <Note>That is all for now. Nothing refreshes by itself.</Note>
          ) : (
            <ul className="mt-6 grid gap-4">
              {visible.map((p) => {
                const differences = differenceLines(compare(self!, p), p.firstName)
                return (
                  <li key={p.id} className="rounded-card border border-line bg-white/60 px-5 py-5 shadow-sm">
                    <h2 className="font-display text-[1.3rem] font-medium text-ink">{p.firstName}</h2>
                    <p className="text-[0.9rem] text-muted">
                      {p.age} · {cityOf(p)}
                    </p>
                    <p className="mt-3 line-clamp-3 text-[0.95rem] leading-snug text-ink-soft text-pretty">“{p.words[0]}”</p>
                    {differences.length ? (
                      <div className="mt-3 text-[0.92rem] leading-snug text-ink-soft">
                        <p className="font-medium text-ink">Differs from what you preferred:</p>
                        <ul className="mt-1 grid gap-0.5">
                          {differences.slice(0, 2).map((d) => (
                            <li key={d.id}>{d.short}</li>
                          ))}
                        </ul>
                        {differences.length > 2 && <p className="mt-0.5 text-muted">{`and ${differences.length - 2} more ${differences.length - 2 === 1 ? 'point' : 'points'}`}</p>}
                      </div>
                    ) : (
                      <p className="mt-3 text-[0.92rem] text-ink-soft">No differences on your preferences.</p>
                    )}
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
            People appear here only when you and they each meet the other’s requirements. This demo checks age and six points only.
          </p>
        </>
      )}
      <ControlsPanel s={s} dispatch={dispatch} where="suggestions" />
    </Screen>
  )
}

export function Suggestion({ s, dispatch }: { s: Session; dispatch: D }) {
  const p = s.focus ? personOf(s, s.focus) : undefined
  const self = completeSelf(s.me)
  const status = useStatusFocus(s.notice)
  if (!p || !self) return null
  const t = (x: string) => fill(x, p.side, p.firstName)
  const c = compare(self, p)
  const fixture = pairFixture(self, s.me.scenario, p)
  const decision = s.decision[p.id]
  const link = s.links[p.id]
  const notice = s.notice && s.notice.person === p.id && (s.notice.kind === 'withdrawn' || s.notice.kind === 'mutual') ? s.notice : null
  const differences = differenceLines(c, p.firstName)
  const answered: { id: PointId; text: string }[] = [
    ...(c.age.state === 'unused'
      ? []
      : [
          {
            id: 'age' as const,
            text:
              c.age.state === 'fits'
                ? `${p.firstName} is ${c.age.theirs}, within the ${c.age.min} to ${c.age.max} you asked for.`
                : `${differences[0].theirs}. You preferred: ${differences[0].preferred}.`,
          },
        ]),
    ...CRITERION_IDS.flatMap((id) => {
      const l = c.lineUp.find((x) => x.id === id)
      if (l) return [{ id, text: l.text }]
      const d = differences.find((x) => x.id === id)
      return d ? [{ id, text: `${d.theirs}. You preferred: ${d.preferred}.` }] : []
    }),
  ]
  const fits: PointId[] = [...(c.age.state === 'fits' ? (['age'] as const) : []), ...c.lineUp.map((x) => x.id)]
  const unused: PointId[] = [...(c.age.state === 'unused' ? (['age'] as const) : []), ...c.unused]
  // Back returns to the screen that opened the profile: the conversation, Your people, or the list.
  const backTo = s.origin === 'conversation' && link?.status === 'open' ? 'conversation' : s.origin === 'people' || s.origin === 'conversation' ? 'people' : 'suggestions'
  return (
    <Screen
      onBack={() => dispatch({ type: 'go', stage: backTo })}
      backLabel={backTo === 'conversation' ? 'Back to conversation' : backTo === 'people' ? 'Back to your people' : undefined}
    >
      <H1>{p.firstName}</H1>
      <p className="mt-2 text-[0.95rem] text-muted">
        {p.age} · {cityOf(p)} · Made up
      </p>
      <P muted>No photo is part of a suggestion.</P>

      <H2>{`In ${p.firstName}’s words`}</H2>
      <ul className="mt-3 grid gap-3">
        {p.words.map((w, i) => (
          <li key={w} className="rounded-2xl border border-line bg-white/50 px-4 py-3 text-[0.97rem] leading-relaxed text-ink-soft text-pretty">
            <span className="block text-[0.74rem] uppercase tracking-wide text-muted">{PROMPTS[i]?.short}</span>
            {w}
          </li>
        ))}
      </ul>

      <H2 id="differ">Where you differ</H2>
      <p className="mt-1 text-[0.9rem] text-muted">On points you marked as a preference.</p>
      {differences.length ? (
        <ul className="mt-3 divide-y divide-line rounded-2xl border border-line bg-white/50 px-4 text-[0.97rem] leading-snug text-ink-soft">
          {differences.map((x) => (
            <li key={x.id} className="py-2.5">
              <span className="font-medium text-ink">{`${pointName(x.id)}.`}</span>
              <span className="mt-0.5 block">{x.theirs}</span>
              <span className="block">{`You preferred: ${x.preferred}`}</span>
            </li>
          ))}
        </ul>
      ) : (
        <P muted>No differences on your preferences.</P>
      )}

      <p className="mt-5 text-[0.95rem] leading-snug text-ink-soft">
        {fits.length ? `Fits what you asked for on: ${pointNames(fits)}.` : 'None of the points you compared fit what you asked for.'}
      </p>
      <details className="mt-2 rounded-2xl border border-line bg-white/40 px-4">
        <summary className="min-h-11 cursor-pointer py-3 text-[0.92rem] font-medium text-ink">{`${p.firstName}’s answers on each point`}</summary>
        <ul className="mt-2 grid gap-1.5 pb-2 text-[0.93rem] leading-snug text-ink-soft">
          {answered.map((x) => (
            <li key={x.id}>
              <span className="font-medium text-ink">{pointName(x.id)}.</span> {x.text}
            </li>
          ))}
        </ul>
        {unused.length > 0 && <p className="pb-2 text-[0.88rem] text-muted">{`You said these do not matter, so they are not compared: ${pointNames(unused)}.`}</p>}
      </details>

      <div className="mt-8">
        <FixtureBlock id="fx-notes" title="Summary and questions" result={fixture}>
          {(f) => {
            const points = summaryPoints(f.text.facts)
            return (
              <>
                <p className="text-[0.98rem] leading-relaxed text-ink-soft text-pretty">{f.text.summary}</p>
                <h4 className="mt-4 font-medium text-ink">Questions worth asking</h4>
                <ol className="mt-1.5 list-decimal pl-5 text-[0.98rem] leading-relaxed text-ink-soft">
                  {f.text.questions.map((q) => (
                    <li key={q.text}>
                      {q.text}
                      {q.basis === 'general' && <span className="block text-[0.84rem] leading-snug text-muted">General question.</span>}
                    </li>
                  ))}
                </ol>
                <details className="mt-4 rounded-2xl border border-line bg-white/50 px-4">
                  <summary className="min-h-11 cursor-pointer py-3 text-[0.92rem] font-medium text-ink">What this is based on</summary>
                  <div className="pb-3 text-[0.9rem] leading-snug text-ink-soft">
                    <p className="text-pretty">
                      <span className="font-medium text-ink">Summary.</span>{' '}
                      {f.text.summaryWords.length === 0
                        ? `This summary uses structured answers only: your answers and ${p.firstName}’s on ${pointNames(points)}. It does not use anything either of you wrote.`
                        : `This summary uses your answers and ${p.firstName}’s on ${pointNames(points)}, and ${p.firstName}’s written answers: ${f.text.summaryWords.map((i) => PROMPTS[i].short).join(', ')}.`}
                    </p>
                    <ol className="mt-3 grid gap-2">
                      {f.text.questions.map((q, i) => (
                        <li key={q.text} className="text-pretty">
                          <span className="font-medium text-ink">{`Question ${i + 1}.`}</span>{' '}
                          {q.basis === 'general' ? (
                            'General question. It is not drawn from either person’s answers.'
                          ) : (
                            <span className="block">
                              {resolveBasis(q.basis, self, p).map((r, j) => (
                                <span key={j} className="block">
                                  {basisLine(r, p.firstName)}
                                </span>
                              ))}
                            </span>
                          )}
                        </li>
                      ))}
                    </ol>
                    <p className="mt-3 text-[0.84rem] text-muted text-pretty">These show what each line was written from. They do not show that a line follows from them.</p>
                  </div>
                </details>
              </>
            )
          }}
        </FixtureBlock>
      </div>

      <div ref={status.ref} tabIndex={-1} role="status" className="mt-8 outline-none">
        {notice && <Note>{t(NOTICE[notice.kind])}</Note>}
      </div>
      <section aria-label="Your choice" className="mt-4">
        {decision === 'undecided' ? (
          <>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => dispatch({ type: 'decide', person: p.id, choice: 'interested' })}>I’m interested</Button>
              <Button variant="outline" onClick={() => dispatch({ type: 'decide', person: p.id, choice: 'passed' })}>
                Not for me
              </Button>
            </div>
            <p className="mt-3 text-[0.88rem] leading-snug text-muted text-pretty">
              {t(
                'Interest is private: {name} is told only if {he} also chooses you, and you can withdraw it until then. “Not for me” removes {name} from your suggestions, and {he} is not told. You can undo it on the next screen.',
              )}
            </p>
          </>
        ) : decision === 'interested' && !link ? (
          <>
            <Note>{t('Interest recorded in this demo. {name} is not told.')}</Note>
            <Button
              variant="outline"
              className="mt-3"
              onClick={() => {
                status.ask()
                dispatch({ type: 'withdraw', person: p.id })
              }}
            >
              {`Withdraw interest in ${p.firstName}`}
            </Button>
            <p className="mt-2 text-[0.88rem] leading-snug text-muted text-pretty">{t('Withdrawing is private too: {name} is not told. You can do this until a conversation opens.')}</p>
          </>
        ) : decision === 'interested' && link?.status === 'open' ? (
          <>
            <Note>You chose each other.</Note>
            <Button variant="soft" className="mt-3" onClick={() => dispatch({ type: 'go', stage: 'conversation', focus: p.id })}>
              {`Open conversation with ${p.firstName}`}
            </Button>
          </>
        ) : (
          <Note>{decision === 'interested' ? 'You chose each other.' : 'You chose not to go further.'}</Note>
        )}
      </section>

      <SafetyRow s={s} dispatch={dispatch} person={p} canDisconnect={link?.status === 'open'} />
      <ControlsPanel s={s} dispatch={dispatch} where="suggestion" person={p} />
    </Screen>
  )
}

export function People({ s, dispatch }: { s: Session; dispatch: D }) {
  const open = openLinks(s)
  const waiting = s.shown.filter((id) => s.decision[id] === 'interested' && !s.links[id])
  const undecided = visibleSuggestions(s)
  const ended = s.shown.filter((id) => s.links[id] && s.links[id].status !== 'open')
  const blockedBefore = s.shown.filter((id) => s.decision[id] === 'blocked' && !s.links[id])
  const passed = s.shown.filter((id) => s.decision[id] === 'passed')
  const name = (id: string) => personOf(s, id)!.firstName
  const status = useStatusFocus(s.notice)
  const undoP = s.undo && s.decision[s.undo] === 'passed' ? personOf(s, s.undo) : undefined
  const noticeP = s.notice ? personOf(s, s.notice.person) : undefined
  const tf = (p: Person, x: string) => fill(x, p.side, p.firstName)
  return (
    <Screen onBack={() => dispatch({ type: 'go', stage: 'suggestions' })}>
      <H1>Your people.</H1>
      <div ref={status.ref} tabIndex={-1} role="status" className="outline-none">
        {undoP && <Note>{tf(undoP, '{name} is removed from your suggestions. {He} is not told.')}</Note>}
        {s.notice && noticeP && <Note>{tf(noticeP, NOTICE[s.notice.kind])}</Note>}
      </div>
      {undoP && (
        <div className="mt-3">
          <Button
            variant="outline"
            onClick={() => {
              status.ask()
              dispatch({ type: 'undoPass', person: undoP.id })
            }}
          >
            {`Undo: bring ${undoP.firstName} back`}
          </Button>
        </div>
      )}

      <H2>Open conversations</H2>
      {open.length ? (
        <ul className="mt-3 grid gap-3">
          {open.map((id) => (
            <li key={id} className="flex flex-wrap items-center gap-2">
              <Button variant="soft" onClick={() => dispatch({ type: 'go', stage: 'conversation', focus: id })}>
                {`Open conversation with ${name(id)}`}
              </Button>
              <Button variant="outline" className="!px-5 !py-2.5" onClick={() => dispatch({ type: 'go', stage: 'suggestion', focus: id })}>
                {`View profile of ${name(id)}`}
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <P muted>None yet.</P>
      )}

      <H2>Chosen by you, privately</H2>
      {waiting.length ? (
        <ul className="mt-3 grid gap-4">
          {waiting.map((id) => (
            <li key={id}>
              <p className="font-medium text-ink">{name(id)}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button variant="outline" className="!px-5 !py-2.5" onClick={() => dispatch({ type: 'go', stage: 'suggestion', focus: id })}>
                  {`Read more about ${name(id)}`}
                </Button>
                <Button
                  variant="outline"
                  className="!px-5 !py-2.5"
                  onClick={() => {
                    status.ask()
                    dispatch({ type: 'withdraw', person: id })
                  }}
                >
                  {`Withdraw interest in ${name(id)}`}
                </Button>
              </div>
            </li>
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

      {/* Named for what happened, so it stays true while Undo is on offer. Blocked people and ended conversations are final, and are listed apart. */}
      {passed.length > 0 && (
        <>
          <H2>Passed on</H2>
          <ul className="mt-3 list-disc pl-5 text-[0.98rem] text-ink-soft">
            {passed.map((id) => (
              <li key={id}>{name(id)}</li>
            ))}
          </ul>
        </>
      )}

      {(ended.length > 0 || blockedBefore.length > 0) && (
        <>
          <H2>Not shown again</H2>
          <ul className="mt-3 list-disc pl-5 text-[0.98rem] text-ink-soft">
            {ended.map((id) => (
              <li key={id}>{`${name(id)}: ${s.links[id].status === 'blocked' ? 'blocked' : 'conversation ended'}`}</li>
            ))}
            {blockedBefore.map((id) => (
              <li key={id}>{`${name(id)}: blocked`}</li>
            ))}
          </ul>
        </>
      )}
      <ControlsPanel s={s} dispatch={dispatch} where="people" />
    </Screen>
  )
}
