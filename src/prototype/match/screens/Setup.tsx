import { useState, type Dispatch, type FormEvent } from 'react'
import { Button, fieldClass, TextButton } from '../../../components/ui'
import { CRITERIA, PROMPTS, labelOf, nameOf, criterionOf } from '../criteria'
import { SCENARIOS } from '../fixtures'
import { POINT_STEPS, SETUP_STEPS, completeSelf, locked, missingAbout, missingPoint, missingPoints, missingWords, type Action, type Me, type PointGap, type Session } from '../flow'
import { Choice, H1, H2, Note, P, Screen } from '../parts'
import { looksLikeContact } from '../suggest'
import type { Firmness, Side } from '../types'

type D = Dispatch<Action>

/** Where the tester says what they are looking for: eight short steps and a review, before any suggestion. */

export function Front({ dispatch }: { dispatch: D }) {
  const [side, setSide] = useState<Side | null>(null)
  const [error, setError] = useState('')
  const go = (scenario?: (typeof SCENARIOS)[number]['id']) => {
    if (!side) {
      setError('Choose “I am a woman” or “I am a man” first.')
      return
    }
    setError('')
    dispatch({ type: 'start', side, scenario })
  }
  return (
    <Screen>
      <H1>A first look at how meeting someone could work.</H1>
      <P>
        Everyone you will see is made up. Use made-up answers too: no real names, and no personal or contact information. What you type stays in memory in
        this tab and is cleared when you reload it. Nothing is sent anywhere, and no AI model is called.
      </P>
      <P>
        Your private tools (the map, the read, the eleven, the Guide) are not used here, and nothing here is added to them. This is not part of the live
        Niyyah app, where introductions are closed.
      </P>

      <fieldset className="mt-8">
        <legend className="font-display text-[1.2rem] font-medium text-ink">Try it as</legend>
        <div className="mt-3 grid gap-2.5">
          <Choice type="radio" name="side" checked={side === 'woman'} onChange={() => setSide('woman')}>
            I am a woman
          </Choice>
          <Choice type="radio" name="side" checked={side === 'man'} onChange={() => setSide('man')}>
            I am a man
          </Choice>
        </div>
      </fieldset>
      <div role="status" className="min-h-[1.5rem] text-[0.9rem] text-clay">
        {error}
      </div>

      <H2>Start from a sample</H2>
      <P muted>Each sample is a whole set of made-up answers. The fixed texts in this prototype are written for these samples, and only for them.</P>
      <ul className="mt-4 grid gap-3">
        {SCENARIOS.map((s) => (
          <li key={s.id} className="rounded-2xl border border-line bg-white/50 px-4 py-4">
            <p className="font-medium text-ink">{s.title}</p>
            <p className="mt-1 text-[0.88rem] leading-snug text-muted text-pretty">{s.expect}</p>
            <Button variant="soft" className="mt-3" onClick={() => go(s.id)}>
              Start from this sample
            </Button>
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <Button onClick={() => go()}>Start with blank answers</Button>
      </div>
      <p className="mt-6">
        <TextButton className="text-forest underline" onClick={() => dispatch({ type: 'go', stage: 'notes' })}>
          What is real here, and what is not
        </TextButton>
      </p>
    </Screen>
  )
}

const StepLine = ({ n }: { n: number }) => <p className="mt-2 text-[0.9rem] text-muted">{`Step ${n} of ${SETUP_STEPS}.`}</p>

const stepOf = (id: Parameters<typeof criterionOf>[0]) => POINT_STEPS.findIndex((g) => g.includes(id))

export function About({ s, dispatch }: { s: Session; dispatch: D }) {
  const [error, setError] = useState('')
  const me = s.me
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const missing = missingAbout(me)
    if (missing.length) {
      setError(`Still to fill in: ${missing.join(', ')}.`)
      return
    }
    setError('')
    dispatch(s.editing ? { type: 'go', stage: 'review' } : { type: 'go', stage: 'point', point: 0 })
  }
  return (
    <Screen onBack={() => dispatch(s.editing ? { type: 'go', stage: 'review' } : { type: 'go', stage: 'front' })}>
      <H1>About you.</H1>
      <StepLine n={1} />
      <P>Use a made-up first name and age. They are used only in this prototype, and the people you meet see both.</P>
      <form onSubmit={submit} noValidate>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-ink-soft">
            A made-up first name
            <input
              className={`${fieldClass} mt-1.5 block w-full px-4 py-3 text-base`}
              value={me.name}
              maxLength={20}
              autoComplete="off"
              onChange={(e) => dispatch({ type: 'name', value: e.target.value })}
            />
          </label>
          <label className="block text-sm font-medium text-ink-soft">
            A made-up age (18 or over)
            <input
              className={`${fieldClass} mt-1.5 block w-full px-4 py-3 text-base`}
              value={me.age}
              inputMode="numeric"
              autoComplete="off"
              onChange={(e) => dispatch({ type: 'age', value: e.target.value.replace(/\D/g, '').slice(0, 2) })}
            />
          </label>
        </div>
        <Note>Age is shown to the people you meet. It is not used to include or leave anyone out: age preferences are not built in this prototype.</Note>
        <div role="status" className="mt-5 min-h-[1.5rem] text-[0.9rem] text-clay">
          {error}
        </div>
        <Button type="submit" className="mt-2">
          Continue
        </Button>
      </form>
    </Screen>
  )
}

const FIRM: { id: Firmness; name: string; says: string }[] = [
  { id: 'requirement', name: 'Requirement', says: 'Only people who fit are shown to you. People who do not fit are left out, and they are never told.' },
  { id: 'preference', name: 'Preference', says: 'You will still see people who differ, and the difference is pointed out.' },
  { id: 'any', name: 'Doesn’t matter', says: 'Not used. What you chose above is set aside.' },
]

const GAP_WORDS: Record<PointGap, string> = {
  answer: 'your answer',
  accept: 'an answer that would work (or choose “Doesn’t matter”)',
  firm: 'how firm this is',
}

/**
 * One setup step: a point (or a few, when POINT_STEPS groups them) asked in the order
 * a person thinks it through. Your own answer, then which answers would work for you,
 * then how firm that is. Entered answers live in the reducer, so going Back or
 * forward never clears them.
 */
export function Point({ s, dispatch }: { s: Session; dispatch: D }) {
  const [error, setError] = useState('')
  const frozen = locked(s)
  const index = Math.min(Math.max(s.point, 0), POINT_STEPS.length - 1)
  const ids = POINT_STEPS[index]
  const heading = ids.map((id) => nameOf(id)).join(' and ')
  const next = index + 1 < POINT_STEPS.length ? { type: 'go' as const, stage: 'point' as const, point: index + 1 } : { type: 'go' as const, stage: 'words' as const }
  const previous = index > 0 ? { type: 'go' as const, stage: 'point' as const, point: index - 1 } : { type: 'go' as const, stage: 'about' as const }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const gaps = ids.flatMap((id) => missingPoint(s.me, id).map((g) => (ids.length > 1 ? `${nameOf(id).toLowerCase()}: ${GAP_WORDS[g]}` : GAP_WORDS[g])))
    if (gaps.length) {
      setError(`Still to do: ${gaps.join(ids.length > 1 ? '; ' : ', ')}.`)
      return
    }
    setError('')
    dispatch(s.editing ? { type: 'go', stage: 'review' } : next)
  }
  return (
    <Screen onBack={() => dispatch(s.editing ? { type: 'go', stage: 'review' } : previous)}>
      <H1>{`${heading}.`}</H1>
      <StepLine n={index + 2} />
      {frozen && <Note tone="clay">You have already chosen or passed on someone, so what you ask for is read-only now. Start again to change it.</Note>}
      <form onSubmit={submit} noValidate>
        {ids.map((id) => {
          const c = criterionOf(id)
          const ask = s.me.asks[id]
          const unused = ask.firm === 'any'
          return (
            <section key={id} aria-label={ids.length > 1 ? c.name : undefined}>
              {ids.length > 1 && <H2>{c.name}</H2>}
              <fieldset className="mt-6" disabled={frozen}>
                <legend className="text-[0.98rem] font-medium text-ink">{c.question}</legend>
                <div className="mt-2.5 grid gap-2">
                  {c.options.map((o) => (
                    <Choice key={o.id} type="radio" name={`about-${id}`} checked={s.me.answers[id] === o.id} onChange={() => dispatch({ type: 'answer', id, value: o.id })}>
                      {o.label}
                    </Choice>
                  ))}
                </div>
              </fieldset>

              <fieldset className={`mt-7 ${unused ? 'opacity-60' : ''}`} disabled={frozen || unused}>
                <legend className="text-[0.98rem] font-medium text-ink">{c.asks}</legend>
                <p className="mt-1 text-[0.86rem] text-muted">
                  {unused ? 'Set aside while this does not matter to you.' : 'Choose every answer that would work. At least one, unless this does not matter to you.'}
                </p>
                <div className="mt-2.5 grid gap-2">
                  {c.options.map((o) => (
                    <Choice key={o.id} type="checkbox" name={`accept-${id}`} checked={ask.accept.includes(o.id)} onChange={(on) => dispatch({ type: 'accept', id, option: o.id, on })}>
                      {o.label}
                    </Choice>
                  ))}
                </div>
              </fieldset>

              <fieldset className="mt-7" disabled={frozen}>
                <legend className="text-[0.98rem] font-medium text-ink">How firm is this for you?</legend>
                <div className="mt-2.5 grid gap-2">
                  {FIRM.map((f) => (
                    <Choice key={f.id} type="radio" name={`firm-${id}`} checked={ask.firm === f.id} onChange={() => dispatch({ type: 'firm', id, value: f.id })} hint={f.says}>
                      {f.name}
                    </Choice>
                  ))}
                </div>
              </fieldset>
            </section>
          )
        })}
        <P muted>It works the other way too: someone’s requirements can leave you out of their suggestions. Not sure? A preference still shows you the difference.</P>
        <div role="status" className="mt-4 min-h-[1.5rem] text-[0.9rem] text-clay">
          {error}
        </div>
        <Button type="submit" className="mt-2">
          Continue
        </Button>
      </form>
    </Screen>
  )
}

export function Words({ s, dispatch }: { s: Session; dispatch: D }) {
  const [error, setError] = useState('')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const missing = missingWords(s.me)
    if (missing.length) {
      setError(`Still to fix: ${missing.join('; ')}.`)
      return
    }
    setError('')
    dispatch({ type: 'go', stage: 'review' })
  }
  return (
    <Screen onBack={() => dispatch(s.editing ? { type: 'go', stage: 'review' } : { type: 'go', stage: 'point', point: POINT_STEPS.length - 1 })}>
      <H1>In your own words.</H1>
      <StepLine n={SETUP_STEPS} />
      <P>
        People suggested to you will read these, once your requirements have been applied. Keep phone numbers, emails and social handles out. If you both choose
        each other, you can share them in conversation.
      </P>
      <form onSubmit={submit} noValidate>
        {PROMPTS.map((p, i) => {
          const value = s.me.words[i]
          const contact = looksLikeContact(value)
          return (
            <div key={p.label} className="mt-6">
              <label className="block text-[0.98rem] font-medium text-ink" htmlFor={`words-${i}`}>
                {p.label}
              </label>
              <textarea
                id={`words-${i}`}
                className={`${fieldClass} mt-2 block min-h-28 w-full px-4 py-3 text-base`}
                value={value}
                maxLength={400}
                onChange={(e) => dispatch({ type: 'words', index: i as 0 | 1 | 2, value: e.target.value })}
              />
              <div className="mt-1 flex justify-between gap-3 text-[0.82rem] text-muted">
                <span role="status" className="text-clay">
                  {contact ? 'That looks like a way to reach you. Keep it out of here.' : ''}
                </span>
                <span>{value.length} / 400</span>
              </div>
            </div>
          )
        })}
        <div role="status" className="mt-5 min-h-[1.5rem] text-[0.9rem] text-clay">
          {error}
        </div>
        <Button type="submit" className="mt-2">
          Continue
        </Button>
      </form>
    </Screen>
  )
}

export function Review({ s, dispatch }: { s: Session; dispatch: D }) {
  const me: Me = s.me
  const ready = !!completeSelf(me) && missingAbout(me).length === 0 && missingPoints(me).length === 0 && missingWords(me).length === 0
  const change = (i: number) => dispatch({ type: 'go', stage: 'point', point: i, editing: true })
  return (
    <Screen onBack={() => dispatch({ type: 'go', stage: 'words' })}>
      <H1>Check before you see anyone.</H1>
      <H2>Your answers</H2>
      <ul className="mt-3 grid gap-4">
        {CRITERIA.map((c) => {
          const k = me.asks[c.id]
          const mine = me.answers[c.id]
          return (
            <li key={c.id} className="text-[0.95rem] leading-snug text-ink-soft">
              <p>
                <span className="font-medium text-ink">{c.name}.</span> You: {mine ? labelOf(c.id, mine) : 'no answer yet'}.
              </p>
              {k.firm === 'any' ? (
                <p className="mt-0.5 text-muted">Not used: this does not matter to you.</p>
              ) : (
                <p className="mt-0.5">
                  {k.accept.length ? `Would work: ${k.accept.map((o) => labelOf(c.id, o)).join('; ')}.` : 'No answer chosen yet.'}{' '}
                  {k.firm === 'requirement' ? 'Requirement.' : k.firm === 'preference' ? 'Preference.' : 'Not decided yet.'}
                </p>
              )}
              <TextButton className="mt-1 text-forest underline" onClick={() => change(stepOf(c.id))}>
                {`Change ${c.name.toLowerCase()}`}
              </TextButton>
            </li>
          )
        })}
      </ul>
      <p className="mt-5 flex flex-wrap gap-x-5 gap-y-1">
        <TextButton className="text-forest underline" onClick={() => dispatch({ type: 'go', stage: 'about', editing: true })}>
          Change name and age
        </TextButton>
        <TextButton className="text-forest underline" onClick={() => dispatch({ type: 'go', stage: 'words', editing: true })}>
          Change my words
        </TextButton>
      </p>
      <H2>Suggested people will see</H2>
      <ul className="mt-3 list-disc pl-5 text-[0.98rem] leading-relaxed text-ink-soft">
        <li>Your first name, age and city.</li>
        <li>Your answers on the six points.</li>
        <li>Your words.</li>
      </ul>
      <H2>They will not see</H2>
      <ul className="mt-3 list-disc pl-5 text-[0.98rem] leading-relaxed text-ink-soft">
        <li>Any photo.</li>
        <li>How firm you were on each point.</li>
        <li>Anyone you passed on.</li>
        <li>How to reach you.</li>
      </ul>
      <P muted>You will see up to three people at a time. Nothing refreshes by itself.</P>
      <div className="mt-6">
        <Button disabled={!ready} onClick={() => dispatch({ type: 'show' })}>
          Show me suggestions
        </Button>
      </div>
    </Screen>
  )
}
