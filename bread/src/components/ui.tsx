import { useId, type ButtonHTMLAttributes, type ReactNode } from 'react'

export function Page({ children, width = 'max-w-md' }: { children: ReactNode; width?: string }) {
  return <main className={`mx-auto ${width} px-4 pb-32 pt-6 sm:pt-10`}>{children}</main>
}

export function Title({ kicker, children, sub }: { kicker?: string; children: ReactNode; sub?: ReactNode }) {
  return (
    <header className="mb-6">
      {kicker && <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-crust-dark">{kicker}</p>}
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
  primary: 'bg-crust-dark text-cream hover:bg-cocoa disabled:bg-line disabled:text-cocoa-soft',
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

/**
 * A labelled control. `children` is a render function so the input can carry
 * the generated id and be described by its hint or error for screen readers.
 */
export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string
  children: (props: { id: string; 'aria-describedby': string | undefined; 'aria-invalid': boolean }) => ReactNode
}) {
  const id = useId()
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[14px] font-medium text-cocoa">
        {label}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': Boolean(error) })}
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-[13px] font-medium text-berry">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1 text-[13px] text-cocoa-soft">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export const inputClass =
  'w-full min-h-12 rounded-xl border border-line bg-white px-3.5 text-[16px] text-cocoa outline-none placeholder:text-cocoa-soft/60 focus:border-crust focus:ring-2 focus:ring-crust/25'

export function Notice({
  tone = 'info',
  role,
  children,
  className = '',
}: {
  tone?: 'info' | 'warn' | 'error' | 'ok'
  /** 'alert' interrupts a screen reader (submit errors); 'status' waits for a pause. */
  role?: 'alert' | 'status'
  children: ReactNode
  className?: string
}) {
  const tones = {
    info: 'bg-cream-2 text-cocoa',
    warn: 'bg-amber-100 text-amber-900',
    error: 'bg-berry/10 text-berry',
    ok: 'bg-sage/10 text-sage',
  }
  return (
    <div role={role} className={`rounded-xl px-4 py-3 text-[14px] leading-relaxed ${tones[tone]} ${className}`}>
      {children}
    </div>
  )
}

export function Spinner({ label }: { label: string }) {
  return (
    <p className="pulse-soft py-10 text-center text-[15px] text-cocoa-soft" role="status">
      {label}
    </p>
  )
}
