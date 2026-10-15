import { useEffect, useRef, useState, type Dispatch, type FormEvent } from 'react'
import { Button, fieldClass, TextButton } from '../../../components/ui'
import { ControlsPanel } from '../ControlsPanel'
import { fill } from '../fixtures'
import { person as personOf, type Action, type Session } from '../flow'
import { H1, H2, Note, P, Screen } from '../parts'
import { SafetyRow } from './Safety'

type D = Dispatch<Action>

/** A photo, as a labelled placeholder. The prototype has no image upload and no real photo anywhere. */
function PhotoTile({ whose }: { whose: string }) {
  return (
    <div className="flex aspect-[4/3] w-full max-w-xs items-center justify-center rounded-2xl border-2 border-dashed border-line-strong bg-sand/60 px-4 text-center text-[0.88rem] leading-snug text-muted">
      {`${whose} photo — placeholder. Made up, no image.`}
    </div>
  )
}

export function Conversation({ s, dispatch }: { s: Session; dispatch: D }) {
  const p = s.focus ? personOf(s, s.focus) : undefined
  const link = p ? s.links[p.id] : undefined
  const [draft, setDraft] = useState('')
  const [confirming, setConfirming] = useState(false)
  // Where focus goes when the control it was on is replaced: a keyboard user is never dropped on the page.
  const photos = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const next = useRef<'share' | 'stop' | null>(null)
  const youShare = link?.youShare ?? false
  useEffect(() => {
    if (confirming) panel.current?.focus()
    else if (next.current) photos.current?.querySelector<HTMLElement>(`[data-photo="${next.current}"]`)?.focus()
    next.current = null
  }, [confirming, youShare])
  if (!p || !link) return null
  const t = (x: string) => fill(x, p.side, p.firstName)
  const open = link.status === 'open'
  const theirs = s.they[p.id]?.sharePhoto ?? false
  const send = (e: FormEvent) => {
    e.preventDefault()
    if (!draft.trim()) return
    dispatch({ type: 'send', person: p.id, text: draft })
    setDraft('')
  }
  return (
    <Screen onBack={() => dispatch({ type: 'go', stage: 'people' })}>
      <H1>{p.firstName}</H1>
      <p className="mt-2 text-[0.95rem] text-muted">
        {p.age} · Made up
      </p>
      {!open ? (
        <Note>{t(link.status === 'blocked' ? '{name} is blocked in this tab.' : 'This conversation has ended. Messages and photos are no longer shown.')}</Note>
      ) : (
        <>
          <Note>Prototype messages stay in this tab. Nothing is delivered to anyone.</Note>
          <H2>Conversation</H2>
          <div role="log" aria-label={`Conversation with ${p.firstName}`} className="mt-3 grid gap-2.5">
            {link.messages.length === 0 && <P muted>Either of you can write first.</P>}
            {link.messages.map((m) => (
              <p
                key={m.n}
                className={`max-w-[22rem] rounded-2xl px-4 py-2.5 text-[0.97rem] leading-snug text-pretty ${
                  m.from === 'you' ? 'ml-auto bg-forest/10 text-ink' : 'mr-auto border border-line bg-white/60 text-ink-soft'
                }`}
              >
                <span className="block text-[0.74rem] uppercase tracking-wide text-muted">{m.from === 'you' ? 'You' : `${p.firstName} (simulated)`}</span>
                {m.text}
              </p>
            ))}
          </div>
          <form onSubmit={send} className="mt-4">
            <label htmlFor="compose" className="block text-sm font-medium text-ink-soft">
              {`Write to ${p.firstName}`}
            </label>
            <textarea
              id="compose"
              className={`${fieldClass} mt-1.5 block min-h-20 w-full px-4 py-3 text-base`}
              value={draft}
              maxLength={400}
              onChange={(e) => setDraft(e.target.value)}
            />
            <Button type="submit" className="mt-3">
              Send
            </Button>
          </form>

          <H2>Photos</H2>
          <P muted>
            {t(
              'Nobody has to share a photo. Sharing is your choice, for this conversation only, and {name} decides separately about {his}. Someone who has already seen a photo may have kept it.',
            )}
          </P>
          <div ref={photos} className="mt-4 grid gap-5">
            <div>
              <p className="text-[0.92rem] font-medium text-ink">Your photo, in this conversation</p>
              {link.youShare ? (
                <>
                  <div role="status" className="mt-2 text-[0.9rem] text-ink-soft">{t('Shared with {name} only. This is a placeholder: no image exists.')}</div>
                  <div className="mt-2">
                    <PhotoTile whose="Your" />
                  </div>
                  <Button variant="outline" className="mt-3" data-photo="stop" onClick={() => dispatch({ type: 'stopSharing', person: p.id })}>
                    {t('Stop sharing with {name}')}
                  </Button>
                </>
              ) : confirming ? (
                <div ref={panel} tabIndex={-1} role="group" aria-label="Confirm sharing your photo" className="mt-2 rounded-2xl border border-clay/40 bg-clay/[0.07] px-4 py-4">
                  <p className="text-[0.92rem] leading-snug text-ink-soft text-pretty">
                    {t('Share your photo with {name}? {He} will be able to see it in this conversation only. It does not go to anyone else, and {name} decides separately whether to share {his}.')}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <Button
                      onClick={() => {
                        next.current = 'stop'
                        dispatch({ type: 'sharePhoto', person: p.id })
                        setConfirming(false)
                      }}
                    >
                      {t('Share with {name}')}
                    </Button>
                    <TextButton
                      className="text-forest underline"
                      onClick={() => {
                        next.current = 'share'
                        setConfirming(false)
                      }}
                    >
                      Not now
                    </TextButton>
                  </div>
                </div>
              ) : (
                <>
                  <div role="status" className="mt-2 text-[0.9rem] text-ink-soft">{t('Not shared with {name}.')}</div>
                  <Button variant="soft" className="mt-2" data-photo="share" onClick={() => setConfirming(true)}>
                    {t('Share my photo with {name}')}
                  </Button>
                </>
              )}
            </div>
            <div>
              <p className="text-[0.92rem] font-medium text-ink">{`${p.firstName}’s photo`}</p>
              {theirs ? (
                <>
                  <div role="status" className="mt-2 text-[0.9rem] text-ink-soft">{t('Simulated: {name} chose to share {his} photo with you.')}</div>
                  <div className="mt-2">
                    <PhotoTile whose={`${p.firstName}’s`} />
                  </div>
                </>
              ) : (
                <div role="status" className="mt-2 text-[0.9rem] text-ink-soft">{t('{name} has not shared a photo with you.')}</div>
              )}
            </div>
          </div>
        </>
      )}
      <SafetyRow s={s} dispatch={dispatch} person={p} canDisconnect={open} />
      <ControlsPanel s={s} dispatch={dispatch} where="conversation" person={p} />
    </Screen>
  )
}
