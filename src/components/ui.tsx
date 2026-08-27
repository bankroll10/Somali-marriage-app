import type { ButtonHTMLAttributes, ReactNode } from 'react'

/** The Niyyah mark — a small flame/seed for intention. */
export function Logo({
  className = '',
  mono = false,
  size = 'md',
}: {
  className?: string
  mono?: boolean
  /** 'sm' is the quiet watermark used on shareable cards. */
  size?: 'sm' | 'md'
}) {
  const stroke = mono ? 'currentColor' : 'var(--color-gold)'
  const glyph = size === 'sm' ? 15 : 22
  return (
    <span className={`inline-flex items-center ${size === 'sm' ? 'gap-1.5' : 'gap-2'} ${className}`}>
      <svg width={glyph} height={glyph} viewBox="0 0 64 64" fill="none" aria-hidden>
        <path
          d="M32 13c-6.5 8.5-12.5 12.8-12.5 21A12.5 12.5 0 0 0 44.5 34c0-8.2-6-12.5-12.5-21Z"
          stroke={stroke}
          strokeWidth={size === 'sm' ? 3 : 2.6}
          strokeLinejoin="round"
        />
        <circle cx="32" cy="35" r="4.2" fill={stroke} />
      </svg>
      <span
        className={`font-display font-medium tracking-tight ${size === 'sm' ? 'text-[0.85rem]' : 'text-[1.15rem]'}`}
      >
        Niyyah
      </span>
    </span>
  )
}

/** Shared text-field styling — inputs and textareas look identical everywhere. */
export const fieldClass =
  'rounded-2xl border border-line bg-white/60 text-ink placeholder:text-muted/60 focus:border-forest/50 focus:outline-none focus:ring-4 focus:ring-forest/5'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'onDark' | 'soft' | 'outline'
  children: ReactNode
}

export function Button({ variant = 'primary', className = '', children, ...rest }: ButtonProps) {
  // Ring offset lives in the variant, not the base — a cream offset on a dark
  // hero draws a pale halo round the focused button.
  const base =
    'inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-[0.95rem] font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:ring-offset-2'
  const variants = {
    primary:
      'bg-forest text-cream hover:bg-forest-deep hover:-translate-y-0.5 shadow-lift focus-visible:ring-offset-cream',
    // For the dark hero. Forest-on-forest makes the most important button on the
    // page the least visible thing on it; this inverts so the click is obvious.
    onDark:
      'bg-cream text-forest-deep hover:bg-white hover:-translate-y-0.5 shadow-lift focus-visible:ring-offset-forest-deep',
    soft: 'bg-sand text-ink hover:bg-cream-deep focus-visible:ring-offset-cream',
    // Secondary: quiet by design — hierarchy comes from the system, not bespoke pills.
    outline:
      'border border-line bg-transparent text-ink-soft hover:border-forest/40 hover:text-ink focus-visible:ring-offset-cream',
  }
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...rest}>
      {children}
    </button>
  )
}

/** Faint geometric backdrop behind hero moments — dots only, no blur blobs. */
export function GeoBackdrop({ className = '' }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      <div className="bg-geo absolute inset-0 opacity-50" />
    </div>
  )
}

export function ArrowRight({ className = '' }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M5 12h14m0 0-5.5-5.5M19 12l-5.5 5.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function BackIcon({ className = '' }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M19 12H5m0 0 5.5 5.5M5 12l5.5-5.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function CheckIcon({ className = '', size = 13 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M5 12.5 10 17.5 19 6.5"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Round back button. `tone="light"` for dark backgrounds. */
export function BackButton({
  onClick,
  label = 'Back',
  tone = 'dark',
  className = '',
}: {
  onClick: () => void
  label?: string
  tone?: 'dark' | 'light'
  className?: string
}) {
  const tones = {
    dark: 'text-ink-soft hover:bg-sand',
    light: 'text-cream/70 hover:bg-cream/10',
  }
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`flex h-9 w-9 flex-none items-center justify-center rounded-full transition ${tones[tone]} ${className}`}
    >
      <BackIcon />
    </button>
  )
}

/** Standard screen header: back button + arbitrary content. */
export function ScreenHeader({
  onBack,
  backLabel,
  sticky = false,
  children,
}: {
  onBack?: () => void
  backLabel?: string
  sticky?: boolean
  children?: ReactNode
}) {
  return (
    <header
      className={`${sticky ? 'sticky top-0 z-10 ' : ''}border-b border-line/70 bg-cream/85 backdrop-blur-md`}
    >
      <div className="mx-auto flex max-w-2xl items-center gap-3 px-5 py-3.5 sm:px-6">
        {onBack && <BackButton onClick={onBack} label={backLabel} />}
        {children}
      </div>
    </header>
  )
}

/** Initial-letter avatar — flat clay, revealed post-mutual-interest. */
export function InitialAvatar({
  name,
  size = 'md',
  className = '',
}: {
  name: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const sizes = {
    sm: 'h-9 w-9 text-sm',
    md: 'h-10 w-10 text-base',
    lg: 'h-14 w-14 text-lg',
  }
  return (
    <span
      className={`flex flex-none items-center justify-center rounded-full bg-clay ${sizes[size]} ${className}`}
    >
      <span className="font-display font-medium text-cream">{name.charAt(0)}</span>
    </span>
  )
}

/* ── Glyph system ─────────────────────────────────────────────────────────────
   Monochrome, in-palette, stroke-based icons. No emoji as UI — emoji appear
   only as the user's own expressive content (e.g. check-in moods). */

export function GlyphTile({
  className = '',
  small = false,
  children,
}: {
  className?: string
  small?: boolean
  children: ReactNode
}) {
  return (
    <span
      className={`flex ${small ? 'h-10 w-10' : 'h-12 w-12'} flex-none items-center justify-center rounded-2xl ${className}`}
    >
      {children}
    </span>
  )
}

const glyphProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const

type GlyphProp = { className?: string }
const gcls = (className?: string) => ({ ...glyphProps, width: 22, height: 22, className })

/** The Niyyah seed — the guide carries the brand mark. */
export function SeedGlyph({ className }: GlyphProp) {
  return (
    <svg {...gcls(className)}>
      <path d="M12 4c-2.4 3.2-4.7 4.8-4.7 7.9a4.7 4.7 0 0 0 9.4 0C16.7 8.8 14.4 7.2 12 4Z" />
      <circle cx="12" cy="12.3" r="1.6" fill="currentColor" stroke="none" />
      <path d="M12 17v3" />
    </svg>
  )
}

export function SparkGlyph({ className }: GlyphProp) {
  return (
    <svg {...gcls(className)}>
      <path d="M12 3.5 13.8 9 19.5 11 13.8 13 12 18.5 10.2 13 4.5 11 10.2 9 12 3.5Z" />
    </svg>
  )
}

export function HeartGlyph({ className }: GlyphProp) {
  return (
    <svg {...gcls(className)}>
      <path d="M12 19.5c-4.5-3.2-7.5-6-7.5-9.2A3.9 3.9 0 0 1 8.4 6.4c1.5 0 2.8.8 3.6 2 .8-1.2 2.1-2 3.6-2a3.9 3.9 0 0 1 3.9 3.9c0 3.2-3 6-7.5 9.2Z" />
    </svg>
  )
}

export function PersonGlyph({ className }: GlyphProp) {
  return (
    <svg {...gcls(className)}>
      <circle cx="12" cy="8.2" r="3.4" />
      <path d="M5.5 19.5c1.2-3 3.6-4.6 6.5-4.6s5.3 1.6 6.5 4.6" />
    </svg>
  )
}

export function PeopleGlyph({ className }: GlyphProp) {
  return (
    <svg {...gcls(className)}>
      <circle cx="9.5" cy="8.5" r="3" />
      <path d="M4 19c1-2.8 3.1-4.3 5.5-4.3S14 16.2 15 19" />
      <circle cx="16.5" cy="9.5" r="2.4" />
      <path d="M16 14.7c1.9.4 3.3 1.7 4 4.3" />
    </svg>
  )
}

export function CompassGlyph({ className }: GlyphProp) {
  return (
    <svg {...gcls(className)}>
      <circle cx="12" cy="12" r="8.2" />
      <path d="m15 9-1.8 4.2L9 15l1.8-4.2L15 9Z" />
    </svg>
  )
}

export function ShieldGlyph({ className }: GlyphProp) {
  return (
    <svg {...gcls(className)}>
      <path d="M12 3.5 5.5 6v5.2c0 4 2.6 6.9 6.5 9.3 3.9-2.4 6.5-5.3 6.5-9.3V6L12 3.5Z" />
      <path d="m9.3 11.8 1.9 1.9 3.5-3.7" />
    </svg>
  )
}

export function RingGlyph({ className }: GlyphProp) {
  return (
    <svg {...gcls(className)}>
      <circle cx="12" cy="14" r="5.6" />
      <path d="m12 4.2 2.4 2.3L12 8.4 9.6 6.5 12 4.2Z" />
    </svg>
  )
}

export function EyeOffGlyph({ className }: GlyphProp) {
  return (
    <svg {...gcls(className)}>
      <path d="M3 12s3.3-5.5 9-5.5S21 12 21 12s-3.3 5.5-9 5.5S3 12 3 12Z" />
      <circle cx="12" cy="12" r="2.4" />
      <path d="M4.5 19.5 19.5 4.5" />
    </svg>
  )
}

export function LockGlyph({ className }: GlyphProp) {
  return (
    <svg {...gcls(className)}>
      <rect x="6" y="10.5" width="12" height="9" rx="2.2" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </svg>
  )
}

export function CrescentGlyph({ className }: GlyphProp) {
  return (
    <svg {...gcls(className)}>
      <path d="M19.5 14.2A8 8 0 1 1 9.8 4.5a6.6 6.6 0 1 0 9.7 9.7Z" />
    </svg>
  )
}

export function PenGlyph({ className }: GlyphProp) {
  return (
    <svg {...gcls(className)}>
      <path d="m4.5 19.5.9-3.6L16.6 4.7a2 2 0 0 1 2.8 2.8L8.1 18.6l-3.6.9Z" />
      <path d="m14.5 6.8 2.8 2.8" />
    </svg>
  )
}

/** Small inline spinner for in-button loading states. */
export function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      className={`animate-spin ${className}`}
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

/** Three bouncing dots — "thinking / typing". */
export function TypingDots() {
  return (
    <div className="flex gap-1.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-2 animate-bounce rounded-full bg-muted/60"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  )
}
