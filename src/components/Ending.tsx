import { useState } from 'react'
import type { EndingRecord, Identity } from '../types'
import type { Ending } from '../lib/ending'
import { endingHeadline } from '../lib/ending'
import { ADVICE_PLACEHOLDER, ADVICE_PROMPT, PAY_IT_FORWARD, endingQuestions } from '../data/ending'
import { instrumentLink } from '../lib/links'
import { shareOrCopy } from '../lib/share'
import { CheckIcon, Logo, fieldClass } from './ui'

interface Props {
  identity: Identity
  /** Her record, built from what she actually did. See src/lib/ending.ts. */
  ending: Ending
  saved: EndingRecord | null
  onSave: (record: EndingRecord) => void
  onBack: () => void
}

/**
 * The ending.
 *
 * This is the screen a product in this category is never allowed to build,
 * because it tells a member the thing every other app is structured to prevent:
 * you are finished, and you can delete this now. It is the whole thesis in one
 * page — success is departure, and a departure that is designed is worth more
 * to everyone than one that is quietly discouraged.
 *
 * The order is deliberate and it is not negotiable: she is given her record
 * first, told she owes nothing and can leave, and only then — below all of it,
 * skippable in a scroll — asked the four questions this company needs and the
 * one thing it would like. Nothing on this page is required to finish, and
 * nothing on it is required to leave.
 */
export default function Ending({ identity, ending, saved, onSave, onBack }: Props) {
  const name = identity.firstName?.trim()
  const gender = identity.gender ?? 'woman'
  const questions = endingQuestions(gender)
  const [answers, setAnswers] = useState<EndingRecord>(saved ?? { at: new Date().toISOString() })
  const [copied, setCopied] = useState(false)
  const [shared, setShared] = useState(false)

  function put(patch: Partial<EndingRecord>) {
    const next = { ...answers, ...patch, at: answers.at }
    setAnswers(next)
    onSave(next)
  }

  function toggleUsed(id: string) {
    const used = answers.used ?? []
    put({ used: used.includes(id) ? used.filter((x) => x !== id) : [...used, id] })
  }

  /** The record, as plain text, so it survives leaving. */
  const asText = [
    name ? `${name} — how you chose` : 'How you chose',
    ending.span ? `${ending.span}, start to finish.` : '',
    '',
    ...ending.lines.map((l) => `· ${l.text}`),
    '',
    endingHeadline(ending),
  ]
    .filter((l) => l !== undefined)
    .join('\n')

  async function keep() {
    try {
      await navigator.clipboard.writeText(asText)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2400)
    } catch {
      /* clipboard refused — the record is on screen to keep by hand */
    }
  }

  /**
   * The one thing only she can say.
   *
   * Everything else this product hands out is careful never to reveal that the
   * sender is looking, because in this community that costs her something. The
   * moment she is married that inverts entirely: "before we said yes, we had
   * these conversations" is not an admission, it is the most credible thing
   * anyone can say about marrying well, and only she can say it.
   */
  async function tellSomeone() {
    const advice = answers.advice?.trim()
    const text = [
      'Before we said yes, we went through eleven conversations — where we’d live, money home, all of it. I wish someone had handed me that list earlier.',
      advice ? `\n${advice}` : '',
      '\nIt is free, and there is no account.',
    ].join('')
    const result = await shareOrCopy({ text, url: instrumentLink('eleven', 'married') }, 'married_told')
    if (result === 'copied') {
      setShared(true)
      window.setTimeout(() => setShared(false), 2400)
    }
  }

  return (
    <div className="min-h-dvh bg-cream pb-20">
      <header className="border-b border-line/70 bg-cream/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <Logo className="text-ink" />
          <button onClick={onBack} className="text-[0.85rem] font-medium text-muted underline-offset-4 hover:underline">
            Close
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6">
        {/* The record. Given first, before anything is asked. */}
        <section className="animate-rise relative mt-8 overflow-hidden rounded-card bg-forest-deep p-7 text-cream sm:p-9">
          <div className="bg-geo pointer-events-none absolute inset-0 opacity-30" aria-hidden />
          <div className="relative">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-gold-soft">
              {name ? `${name} · how you chose` : 'How you chose'}
            </p>
            <h1 className="mt-3 font-display text-[2rem] font-medium leading-tight tracking-tight text-balance sm:text-[2.4rem]">
              {endingHeadline(ending)}
            </h1>
            {ending.span && (
              <p className="mt-3 text-[0.95rem] text-cream/70">{ending.span}, start to finish.</p>
            )}

            {ending.lines.length > 0 ? (
              <ul className="mt-7 space-y-3.5 border-t border-cream/15 pt-6">
                {ending.lines.map((l) => (
                  <li key={l.text} className="flex gap-3 text-[0.98rem] leading-relaxed text-cream/85 text-pretty">
                    <span className="mt-2.5 h-1.5 w-1.5 flex-none rounded-full bg-gold-soft" />
                    <span>{l.text}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-6 text-[0.98rem] leading-relaxed text-cream/75 text-pretty">
                You did not leave much of a trail here, and that is completely fine. The decision was
                yours and you made it.
              </p>
            )}

            <button
              onClick={keep}
              className="mt-7 inline-flex items-center gap-2 rounded-full border border-cream/30 px-5 py-2.5 text-[0.88rem] font-medium text-cream transition hover:bg-cream/10"
            >
              {copied ? (
                <>
                  <CheckIcon size={13} /> Copied — paste it somewhere you keep things
                </>
              ) : (
                'Keep this'
              )}
            </button>
          </div>
        </section>

        {/* The goodbye. Said plainly, before any ask, because it is true. */}
        <section className="mt-8 rounded-card border border-line bg-white/60 p-6">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted">You’re done here</p>
          <p className="mt-2.5 font-display text-[1.4rem] font-medium leading-snug tracking-tight text-ink text-balance">
            You can delete the app.
          </p>
          <p className="mt-3 text-[0.98rem] leading-relaxed text-ink-soft text-pretty">
            We mean it plainly. There is nothing left to finish, no streak to lose, nobody waiting, and
            nothing that will be charged. If the first year gets hard, the words for two families and
            the guide are here — and if they are not needed, better still. Barakallahu lakuma wa baraka
            alaykuma wa jama’a baynakuma fi khayr.
          </p>
        </section>

        {/* The one thing only a married person can say. */}
        <section className="mt-5 rounded-card border border-gold/30 bg-gold/[0.07] p-6">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-gold">
            Before you go, if you want to
          </p>
          <p className="mt-2.5 font-display text-[1.25rem] font-medium leading-snug tracking-tight text-ink text-balance">
            You can say this now in a way you never could before.
          </p>
          <p className="mt-2.5 text-[0.95rem] leading-relaxed text-muted text-pretty">
            While you were looking, forwarding anything about it meant admitting you were looking. That
            is over. “Before we said yes, we had these eleven conversations” is a thing a married woman
            can say to anyone — a sister, a cousin, the girl at the wedding who is where you were.
          </p>
          <button
            onClick={tellSomeone}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-forest px-5 py-2.5 text-[0.9rem] font-medium text-cream transition hover:bg-forest-deep"
          >
            {shared ? (
              <>
                <CheckIcon size={13} /> Copied to send
              </>
            ) : (
              'Send the eleven to someone'
            )}
          </button>
        </section>

        {/* Everything below here is optional, and comes after the gift. */}
        <section className="mt-10">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted">
            If you have two more minutes
          </p>
          <p className="mt-2.5 text-[0.95rem] leading-relaxed text-ink-soft text-pretty">
            Four questions, and then we stop. Nobody has ever told us what actually decides this, and
            without knowing we are guessing at what to build for the next person. Skip any of them.
          </p>

          <div className="mt-6 flex flex-col gap-6">
            {questions.map((q) => (
              <div key={q.id}>
                <p id={`q-${q.id}`} className="font-display text-[1.15rem] font-medium text-ink text-pretty">
                  {q.prompt}
                </p>
                {q.helper && <p className="mt-1 text-[0.85rem] text-muted text-pretty">{q.helper}</p>}
                <div role="group" aria-labelledby={`q-${q.id}`} className="mt-3 flex flex-wrap gap-2">
                  {q.options.map((o) => {
                    const selected = q.multi
                      ? (answers.used ?? []).includes(o.id)
                      : answers[q.id === 'who' ? 'who' : 'mattered'] === o.id
                    return (
                      <button
                        key={o.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() =>
                          q.multi ? toggleUsed(o.id) : put(q.id === 'who' ? { who: o.id } : { mattered: o.id })
                        }
                        className={`rounded-full border px-3.5 py-2 text-[0.88rem] font-medium transition-all ${
                          selected
                            ? 'border-forest bg-forest text-cream'
                            : 'border-line bg-white/60 text-ink-soft hover:border-forest/40 hover:bg-white'
                        }`}
                      >
                        {o.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

            <div>
              <label htmlFor="ending-advice" className="font-display text-[1.15rem] font-medium text-ink">
                {ADVICE_PROMPT}
              </label>
              <p className="mt-1 text-[0.85rem] text-muted text-pretty">
                Kept with your record. If you send the eleven above, it goes with it.
              </p>
              <textarea
                id="ending-advice"
                rows={3}
                value={answers.advice ?? ''}
                onChange={(e) => put({ advice: e.target.value })}
                placeholder={ADVICE_PLACEHOLDER}
                className={`mt-3 w-full resize-none bg-white/70 p-3.5 text-[0.98rem] leading-relaxed ${fieldClass}`}
              />
            </div>
          </div>
        </section>

        {/* The ask, last, after everything has been given and nothing is owed. */}
        <section className="mt-8 rounded-card border border-line bg-white/50 p-6">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted">{PAY_IT_FORWARD.title}</p>
          <p className="mt-2.5 text-[0.95rem] leading-relaxed text-ink-soft text-pretty">{PAY_IT_FORWARD.body}</p>
          <p className="mt-2.5 text-[0.82rem] leading-relaxed text-muted text-pretty">{PAY_IT_FORWARD.note}</p>
        </section>

        <div className="mt-10 text-center">
          <button onClick={onBack} className="text-[0.88rem] font-medium text-forest underline-offset-4 hover:underline">
            Close
          </button>
        </div>
      </main>
    </div>
  )
}
