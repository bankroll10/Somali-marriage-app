import type { ReactNode } from 'react'
import { BackButton, Logo } from '../../components/ui'

/** A screen: header with Back, and the column the content sits in. */
export function Screen({ onBack, backLabel, children }: { onBack?: () => void; backLabel?: string; children: ReactNode }) {
  return (
    <div className="pb-20">
      <header className="border-b border-line/70 bg-cream/85">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-3 sm:px-6">
          {onBack ? <BackButton onClick={onBack} label={backLabel} /> : <span className="h-11 w-11" aria-hidden />}
          <Logo className="text-ink" />
          <span className="text-xs uppercase tracking-[0.2em] text-muted">Demo</span>
        </div>
      </header>
      <main className="mx-auto max-w-xl px-5 pt-8 sm:px-6">{children}</main>
    </div>
  )
}

export const H1 = ({ children }: { children: ReactNode }) => (
  <h1 className="font-display text-[2rem] font-medium leading-tight tracking-tight text-ink text-balance sm:text-[2.3rem]">{children}</h1>
)

export const H2 = ({ children, id }: { children: ReactNode; id?: string }) => (
  <h2 id={id} className="mt-9 font-display text-[1.3rem] font-medium text-ink">
    {children}
  </h2>
)

export const P = ({ children, muted = false }: { children: ReactNode; muted?: boolean }) => (
  <p className={`mt-3 text-[0.98rem] leading-relaxed text-pretty ${muted ? 'text-muted' : 'text-ink-soft'}`}>{children}</p>
)

/** A radio or checkbox with its words, as one tap target. */
export function Choice({
  type,
  name,
  checked,
  onChange,
  children,
  hint,
}: {
  type: 'radio' | 'checkbox'
  name: string
  checked: boolean
  onChange: (checked: boolean) => void
  children: ReactNode
  hint?: ReactNode
}) {
  return (
    <label
      className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 text-[0.95rem] leading-snug transition ${
        checked ? 'border-forest bg-forest/[0.06] text-ink' : 'border-line bg-white/50 text-ink-soft hover:border-forest/40'
      }`}
    >
      <input type={type} name={name} checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 h-4 w-4 flex-none accent-forest" />
      <span className="min-w-0">
        <span className="block">{children}</span>
        {hint && <span className="mt-0.5 block text-[0.84rem] text-muted">{hint}</span>}
      </span>
    </label>
  )
}

/** A line that says something outside the product, in the tester's view only. */
export function Note({ children, tone = 'plain' }: { children: ReactNode; tone?: 'plain' | 'clay' }) {
  return (
    <p
      className={`mt-4 rounded-2xl border px-4 py-3 text-[0.9rem] leading-snug text-ink-soft text-pretty ${
        tone === 'clay' ? 'border-clay/40 bg-clay/[0.07]' : 'border-line bg-white/50'
      }`}
    >
      {children}
    </p>
  )
}
