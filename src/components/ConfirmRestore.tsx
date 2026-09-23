import { getScene } from '../data/scenes'
import type { PersistedState } from '../lib/storage'

interface Props {
  /** The code the link carried, as the server knows it. */
  code: string
  /** What is kept under it. Nothing of it is on this phone yet. */
  incoming: PersistedState
  /** What this phone holds right now, if anything. */
  current: PersistedState | null
  /** Her answer: true brings the map here, false leaves this phone exactly as it was. */
  onDone: (mine: boolean) => void
}

/**
 * A `?map=` link, asked about before it replaces anything.
 *
 * The restore link is for sending to herself — a map she kept, opened on a new
 * phone. It used to be applied the moment it was opened: whatever was on this
 * phone was overwritten, and the link's code became this phone's own. That is
 * a gift to anyone who can get her to tap a link. An abusive ex keeps a map of
 * his own and sends her `?map=HIS-CODE`; she opens it, her answers are gone
 * (irreversibly, if she had never kept them), and everything she writes from
 * then on is kept under a code he holds and can read (docs/SECURITY.md, O2).
 *
 * So the link now asks, and says whose map it is. Her own map, on a new phone,
 * costs her one tap; someone else's is refused by the first thing she reads —
 * a name that is not hers.
 */
export default function ConfirmRestore({ code, incoming, current, onDone }: Props) {
  const name = incoming.identity?.firstName?.trim()
  const city = getScene(incoming.identity?.scene)?.label
  const currentName = current?.identity?.firstName?.trim()
  const holdsMap = !!current && (!!currentName || Object.keys(current.answers ?? {}).length > 0)

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-forest-deep px-6 text-center text-cream">
      <main className="relative max-w-sm">
        <h1 className="font-display text-2xl font-medium tracking-tight">Bring this map onto this phone?</h1>
        <p className="mt-3 text-[0.98rem] leading-relaxed text-cream/80 text-pretty">
          This link opens the map kept under <span className="font-medium tracking-wider text-cream">{code}</span>
          {name ? (
            <>
              {' '}— for <span className="font-medium text-cream">{name}</span>
              {city ? `, in ${city}` : ''}.
            </>
          ) : (
            '.'
          )}
        </p>
        {holdsMap && (
          <p className="mt-3 text-[0.95rem] leading-relaxed text-cream/80 text-pretty">
            It replaces the map on this phone now{currentName ? ` — ${currentName}’s` : ''}, and that
            cannot be undone.
          </p>
        )}
        <p className="mt-3 text-[0.88rem] leading-relaxed text-cream/60 text-pretty">
          Only bring it here if it is yours. A map someone else sends you would keep everything you
          write next under their code, where they can read it.
        </p>
        <div className="mt-7 flex flex-col items-center gap-3">
          <button
            onClick={() => onDone(true)}
            className="rounded-full bg-gold-soft px-7 py-3 text-[0.95rem] font-medium text-forest-deep transition hover:bg-gold"
          >
            Yes, it’s mine
          </button>
          <button
            onClick={() => onDone(false)}
            className="text-sm text-cream/70 underline-offset-4 transition hover:text-cream hover:underline"
          >
            Not mine — leave this phone as it is
          </button>
        </div>
      </main>
    </div>
  )
}
