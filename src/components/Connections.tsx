import type { ConvMessage } from '../types'
import { getCandidate } from '../data/candidates'
import { getScene } from '../data/scenes'
import { Button, GlyphTile, HeartGlyph, InitialAvatar, ScreenHeader } from './ui'

interface Props {
  matched: string[]
  conversations: Record<string, ConvMessage[]>
  onOpen: (id: string) => void
  onDiscover: () => void
  onBack: () => void
}

export default function Connections({ matched, conversations, onOpen, onDiscover, onBack }: Props) {
  return (
    <div className="min-h-dvh bg-cream pb-16">
      <ScreenHeader onBack={onBack}>
        <p className="font-display text-[1.05rem] font-medium text-ink">Connections</p>
      </ScreenHeader>

      <main className="mx-auto max-w-2xl px-6">
        {matched.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <GlyphTile className="bg-forest/10 text-forest"><HeartGlyph /></GlyphTile>
            <h1 className="mt-5 font-display text-[1.6rem] font-medium tracking-tight text-ink">
              Empty — on purpose.
            </h1>
            <p className="mt-2 max-w-sm text-[0.98rem] leading-relaxed text-muted text-pretty">
              This page only ever holds people you <em>both</em> chose. No likes to
              farm, no inbox full of “hey.” When someone appears here, it means
              something.
            </p>
            <div className="mt-7">
              <Button onClick={onDiscover}>See today’s introductions</Button>
            </div>
          </div>
        ) : (
          <>
            <p className="py-6 text-[0.95rem] leading-relaxed text-muted text-pretty">
              People you’ve both chosen. Take your time — these are conversations
              meant to lead somewhere.
            </p>
            <div className="space-y-3">
              {matched.map((id) => {
                const c = getCandidate(id)
                if (!c) return null
                const msgs = conversations[id] ?? []
                const last = msgs[msgs.length - 1]
                const preview = last
                  ? `${last.from === 'me' ? 'You: ' : ''}${last.text.split('\n')[0]}`
                  : 'Say salaam and begin.'
                return (
                  <button
                    key={id}
                    onClick={() => onOpen(id)}
                    className="group flex w-full items-center gap-4 rounded-card border border-line bg-white/60 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-forest/40"
                  >
                    <InitialAvatar name={c.name} size="lg" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="font-display text-[1.15rem] font-medium text-ink">
                          {c.name}, {c.age}
                        </span>
                        <span className="rounded-full bg-forest/10 px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-wide text-forest">
                          Connected
                        </span>
                      </span>
                      <span className="block text-[0.82rem] text-muted">
                        {c.occupation} · {getScene(c.scene)?.label}
                      </span>
                      <span className="mt-1 block truncate text-[0.88rem] text-ink-soft">{preview}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
