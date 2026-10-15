import { useState, type Dispatch, type FormEvent } from 'react'
import { Button, fieldClass, TextButton } from '../../../components/ui'
import { CRITERIA, GROUPS, criterionOf, labelOf } from '../criteria'
import { SCENARIOS } from '../fixtures'
import { completeSelf, missingAbout, missingAsk, missingWords, type Action, type Me, type Session } from '../flow'
import { Choice, H1, H2, Note, P, Screen } from '../parts'
import { looksLikeContact } from '../suggest'
import type { Firmness, Side } from '../types'

type D = Dispatch<Action>

/** Where the tester says what they are looking for: the five screens before any suggestion. */

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

export function About({ s, dispatch }: { s: Session; dispatch: D }) {
  const [error, setError] = useState('')
  const me = s.me
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const missing = missingAbout(me)
    if (missing.length) {
      setError(`Still to fill in: ${missing.map((m) => (m in criterionLookup ? criterionLookup[m] : m)).join(', ')}.`)
      return
    }
    setError('')
    dispatch({ type: 'go', stage: 'ask' })
  }
  return (
    <Screen onBack={() => dispatch({ type: 'go', stage: 'front' })}>
      <H1>About you.</H1>
      <P>Answer for yourself, with made-up answers. These are used only here, to find people who fit what you ask for next.</P>
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
        {GROUPS.map((g) => (
          <section key={g.id}>
            <H2>{g.title}</H2>
            {CRITERIA.filter((c) => c.group === g.id).map((c) => (
              <fieldset key={c.id} className="mt-5">
                <legend className="text-[0.98rem] font-medium text-ink">{c.question}</legend>
                <div className="mt-2.5 grid gap-2">
                  {c.options.map((o) => (
                    <Choice key={o.id} type="radio" name={`about-${c.id}`} checked={me.answers[c.id] === o.id} onChange={() => dispatch({ type: 'answer', id: c.id, value: o.id })}>
                      {o.label}
                    </Choice>
                  ))}
                </div>
              </fieldset>
            ))}
          </section>
        ))}
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

const criterionLookup: Record<string, string> = Object.fromEntries(CRITERIA.map((c) => [c.id, c.name.toLowerCase()]))

const FIRM: { id: Firmness; name: string; says: string }[] = [
  { id: 'requirement', name: 'Requirement', says: 'Only people who fit are shown to you.' },
  { id: 'preference', name: 'Preference', says: 'You will still see people who differ, and the difference is pointed out.' },
  { id: 'any', name: 'Doesn’t matter', says: 'Not used.' },
]

export function Ask({ s, dispatch }: { s: Session; dispatch: D }) {
  const [error, setError] = useState('')
  const frozen = Object.values(s.decision).some((d) => d !== 'undecided')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const missing = missingAsk(s.me)
    if (missing.length) {
      setError(`Still to decide: ${missing.map((c) => criterionOf(c).name.toLowerCase()).join(', ')}.`)
      return
    }
    setError('')
    dispatch({ type: 'go', stage: 'words' })
  }
  return (
    <Screen onBack={() => dispatch({ type: 'go', stage: 'about' })}>
      <H1>What you ask for.</H1>
      <P>For each point, say how firm it is, and which answers would work for you.</P>
      <ul className="mt-4 grid gap-2.5 text-[0.93rem] leading-snug text-ink-soft">
        {FIRM.map((f) => (
          <li key={f.id} className="rounded-2xl border border-line bg-white/50 px-4 py-3">
            <span className="font-medium text-ink">{f.name}.</span> {f.says}
            {f.id === 'requirement' && ' People who do not fit are left out, and they are never told.'}
          </li>
        ))}
      </ul>
      <P>It works the other way too: someone’s requirements about who they are open to can leave you out of their suggestions.</P>
      <P>A requirement is a line for you. If you are unsure, choose preference: you will still be told where you differ.</P>
      <Note>Age is not one of these points, and age preferences are not built in this prototype. The checks here cover these six points only, not everything a real product would need.</Note>
      {frozen && <Note tone="clay">You have already chosen or passed on someone, so what you ask for is read-only now. Start again to change it.</Note>}
      <form onSubmit={submit} noValidate>
        {GROUPS.map((g) => (
          <section key={g.id}>
            <H2>{g.title}</H2>
            {CRITERIA.filter((c) => c.group === g.id).map((c) => {
              const ask = s.me.asks[c.id]
              return (
                <div key={c.id} className="mt-6 rounded-card border border-line bg-white/40 px-4 py-4">
                  <p className="font-medium text-ink">{c.name}</p>
                  <p className="text-[0.88rem] text-muted">
                    You said: {s.me.answers[c.id] ? labelOf(c.id, s.me.answers[c.id]!) : 'no answer yet'}
                  </p>
                  <fieldset className="mt-3" disabled={frozen}>
                    <legend className="text-[0.92rem] font-medium text-ink-soft">How firm is this for you?</legend>
                    <div className="mt-2 grid gap-2">
                      {FIRM.map((f) => (
                        <Choice key={f.id} type="radio" name={`firm-${c.id}`} checked={ask.firm === f.id} onChange={() => dispatch({ type: 'firm', id: c.id, value: f.id })}>
                          {f.name}
                        </Choice>
                      ))}
                    </div>
                  </fieldset>
                  {ask.firm && ask.firm !== 'any' && (
                    <fieldset className="mt-4" disabled={frozen}>
                      <legend className="text-[0.92rem] font-medium text-ink-soft">{c.asks}</legend>
                      <div className="mt-2 grid gap-2">
                        {c.options.map((o) => (
                          <Choice
                            key={o.id}
                            type="checkbox"
                            name={`accept-${c.id}`}
                            checked={ask.accept.includes(o.id)}
                            onChange={(on) => dispatch({ type: 'accept', id: c.id, option: o.id, on })}
                          >
                            {o.label}
                          </Choice>
                        ))}
                      </div>
                    </fieldset>
                  )}
                </div>
              )
            })}
          </section>
        ))}
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

const PROMPTS = [
  { label: 'What are you looking for in a marriage?', required: true },
  { label: 'What should the person you marry know about how you live?', required: true },
  { label: 'How involved do you expect your families to be? (optional)', required: false },
]

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
    <Screen onBack={() => dispatch({ type: 'go', stage: 'ask' })}>
      <H1>In your own words.</H1>
      <P>
        People suggested to you will read these, once your requirements have been applied. Write what you would want to read from them, with made-up answers.
        Keep phone numbers, emails and social handles out. If you both choose each other, you can share them in conversation.
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
  const ready = !!completeSelf(me) && missingAbout(me).length === 0 && missingWords(me).length === 0
  return (
    <Screen onBack={() => dispatch({ type: 'go', stage: 'words' })}>
      <H1>Check before you see anyone.</H1>
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
      <div className="mt-6 flex flex-wrap gap-3">
        <Button disabled={!ready} onClick={() => dispatch({ type: 'show' })}>
          Show me suggestions
        </Button>
        <Button variant="outline" onClick={() => dispatch({ type: 'go', stage: 'about' })}>
          Change my answers
        </Button>
      </div>
    </Screen>
  )
}
