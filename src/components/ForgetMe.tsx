import { useState } from 'react'
import type { Gender } from '../types'
import { Disclose, TextButton } from './ui'
import { CONTACT_EMAIL } from '../lib/site'
import { formatCode } from '../lib/code'
import { speak } from '../data/read'

/**
 * Delete everything kept under her codes, then start this phone over.
 * `intro` false means the introduction list's deletion is *unconfirmed* (not
 * necessarily still there); `introHeld` is then every introduction code not yet
 * confirmed, and `introKept` whether this phone's storage holds them.
 */
export type Forgot = () => Promise<{
  map: boolean
  progress: boolean
  couple: boolean
  intro: boolean
  code?: string
  introHeld?: string[]
  introKept?: boolean
}>

/** "A", "A and B", "A, B and C". */
function and(items: React.ReactNode[]): React.ReactNode[] {
  return items.flatMap((item, i) => [i === 0 ? '' : i === items.length - 1 ? ' and ' : ', ', <span key={i}>{item}</span>])
}

/**
 * Forget me.
 *
 * It lived only on Trust, which a married person could no longer reach. So the
 * Ending said "You can delete the app" while everything kept on
 * our server outlived the uninstall: the kept map for a year, the eleven for
 * ninety days, the step count for good (docs/PRODUCT.md). One block,
 * on both screens, so the two can never say different things about what it
 * deletes.
 */
export default function ForgetMe({
  gender,
  onForget,
  className = '',
}: {
  gender?: Gender
  onForget: Forgot
  className?: string
}) {
  const fix = speak(gender)
  const [forgetting, setForgetting] = useState<'idle' | 'sure' | 'working'>('idle')
  // What a failed server delete left behind, named rather than hidden.
  const [stillHeld, setStillHeld] = useState<string[]>([])
  // The code still held on the server, so she can write in with it.
  const [heldCode, setHeldCode] = useState<string | undefined>()
  // Introduction codes not confirmed gone, and whether this phone saved them. Codes and nothing else.
  const [introHeld, setIntroHeld] = useState<string[]>([])
  const [introKept, setIntroKept] = useState(true)

  return (
<section className={`${className} rounded-card border border-line bg-white/50 p-5`}>
      <h2 className="font-display text-[1.08rem] font-medium text-ink">Forget me</h2>
      <p className="mt-1 text-[0.88rem] leading-snug text-muted text-pretty">
        Deletes your kept map, {fix('the eleven you sent {him}')}, the count of your steps, and
        your name on the introduction list if you put it down — then clears this phone. If you
        come back after this, you start as a stranger. A concern you reported stays with the
        founder until she has read it.
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
                setHeldCode(result.code)
                setIntroHeld(result.intro ? [] : (result.introHeld ?? []))
                setIntroKept(result.introKept !== false)
                // A full success replaces the page and never gets here. The
                // introduction list is not named in this list: it is not
                // "still held", it is unconfirmed, and says so below.
                setStillHeld(
                  [
                    !result.map && 'your kept map',
                    !result.progress && 'the count of your steps',
                    !result.couple && 'the eleven you sent',
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
        {(stillHeld.length > 0 || introHeld.length > 0) && (
          <div role="status" className="w-full space-y-2 text-[0.85rem] leading-snug text-clay text-pretty">
            <p>
              This phone is cleared.
              {stillHeld.length > 0 && (
                <>
                  {' '}
                  We could not reach {stillHeld.join(' and ')} just now, so
                  {stillHeld.length > 1 ? ' they are' : ' it is'} still held — that is us, not you.
                </>
              )}
              {introHeld.length > 0 && (
                <>
                  {' '}
                  We could not confirm that your name came off the introduction list. It may have, or it may not.
                </>
              )}
            </p>
            <p>
              {introHeld.length > 0 && !introKept ? (
                <>
                  This browser could not save {introHeld.length === 1 ? 'this recovery code' : 'these recovery codes'}, so it cannot try again once this page is
                  closed or reloaded. Copy {introHeld.length === 1 ? 'it' : 'them'} now. Until then you can tap Forget me again.
                </>
              ) : (
                <>
                  This phone keeps only what it needs to finish, and tries again each time Niyyah opens, though that may not get through; or tap Forget me again
                  in a moment.
                </>
              )}
            </p>
            <p>
              Or write to <span className="font-medium">{CONTACT_EMAIL}</span>
              {heldCode || introHeld.length > 0 ? (
                <>
                  {' '}
                  with {(heldCode ? 1 : 0) + introHeld.length === 1 ? 'the code' : 'these codes'}{' '}
                  {and([
                    ...(heldCode ? [<span key="map" className="font-medium tracking-[0.15em]">{heldCode}</span>] : []),
                    ...introHeld.map((c) => (
                      <span key={c} className="font-mono font-semibold tracking-wider text-ink">
                        {formatCode(c)}
                      </span>
                    )),
                  ])}{' '}
                  to ask for help removing {(heldCode ? 1 : 0) + introHeld.length === 1 ? 'it' : 'them'}.
                </>
              ) : (
                <> to ask for help removing what is held.</>
              )}
              {introHeld.length > 0 && <> An introduction code can also go in “Take a name off with its code” on the looking screen.</>}
            </p>
          </div>
        )}
        {forgetting === 'working' && <span className="text-[0.88rem] text-muted">Forgetting…</span>}
      </div>
    </section>
  )
}
