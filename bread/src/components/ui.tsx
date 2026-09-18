import type { ButtonHTMLAttributes, ReactNode } from 'react'

export function Page({ children, width = 'max-w-md' }: { children: ReactNode; width?: string }) {
  return <main className={`mx-auto ${width} px-4 pb-32 pt-6 sm:pt-10`}>{children}</main>
}

export function Title({ kicker, children, sub }: { kicker?: string; children: ReactNode; sub?: ReactNode }) {
  return (
    <header className="mb-6">
      {kicker && <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-crust">{kicker}</p>}
      <h1 className="font-display text-[2rem] leading-tight font-semibold text-cocoa">{children}</h1>
      {sub && <p className="mt-2 text-[15px] leading-relaxed text-cocoa-soft">{sub}</p>}
    </header>
  )
}

export function Section({ step, title, children, aside }: { step?: number; title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="mb-7">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="flex items-center gap-2 text-[17px] font-semibold text-cocoa">
          {step !== undefined && (
            <span className="grid size-6 place-items-center rounded-full bg-cocoa text-[12px] font-bold text-cream">{step}</span>
          )}
          {title}
        </h2>
        {aside && <span className="text-[13px] text-cocoa-soft">{aside}</span>}
      </div>
      {children}
    </section>
  )
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
const variants: Record<Variant, string> = {
  primary: 'bg-crust text-cream hover:bg-crust-dark disabled:bg-line disabled:text-cocoa-soft',
  secondary: 'bg-cream-2 text-cocoa hover:bg-line disabled:opacity-50',
  ghost: 'bg-transparent text-cocoa-soft hover:bg-cream-2 disabled:opacity-50',
  danger: 'bg-berry/10 text-berry hover:bg-berry/20 disabled:opacity-50',
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      {...props}
      className={`min-h-11 rounded-xl px-4 text-[15px] font-semibold transition-colors disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    />
  )
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[14px] font-medium text-cocoa">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[13px] text-cocoa-soft">{hint}</span>}
    </label>
  )
}

export const inputClass =
  'w-full min-h-12 rounded-xl border border-line bg-white px-3.5 text-[16px] text-cocoa outline-none placeholder:text-cocoa-soft/60 focus:border-crust focus:ring-2 focus:ring-crust/25'

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'warn' | 'error' | 'ok'; children: ReactNode }) {
  const tones = {
    info: 'bg-cream-2 text-cocoa',
    warn: 'bg-amber-100 text-amber-900',
    error: 'bg-berry/10 text-berry',
    ok: 'bg-sage/10 text-sage',
  }
  return <div className={`rounded-xl px-4 py-3 text-[14px] leading-relaxed ${tones[tone]}`}>{children}</div>
}

export function Spinner({ label }: { label: string }) {
  return (
    <p className="pulse-soft py-10 text-center text-[15px] text-cocoa-soft" role="status">
      {label}
    </p>
  )
}
