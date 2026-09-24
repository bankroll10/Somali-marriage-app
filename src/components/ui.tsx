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

/**
 * Shared text-field styling — inputs and textareas look identical everywhere.
 *
 * The focus state used to be `focus:outline-none` plus `ring-4 ring-forest/5`:
 * a five-percent forest ring on cream, which is to say nothing. Because it
 * carried a class it also beat the zero-specificity global focus outline in
 * index.css, so every text field in the product had a weaker focus indicator
 * than every button beside it (docs/NORMAN.md). Now the ring is visible, and
 * `outline-none` is gone so the global rule still applies where this does not.
 */
export const fieldClass =
  'rounded-2xl border border-line-strong bg-white/60 text-ink placeholder:text-muted focus:border-forest focus:ring-2 focus:ring-forest/40'

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

/**
 * A same-weight text action — "Skip", "Cancel", "Not now" — that shouldn't
 * look like a Button. Every call site kept hand-rolling this as a bare
 * underlined string with little or no padding, which is how ~26 of them
 * across the app ended up 16-29px tall (docs/MOBILE.md), well under the
 * touch-target floor docs/NORMAN.md already set for BackButton.
 *
 * This adds only the invisible tap-target floor. Text size, color and hover
 * treatment all stay with the caller via `className`, on purpose — the
 * ~26 sites span five different sizes and several colors today, and baking
 * any of that in here would be the one thing this pass isn't meant to do:
 * change how something looks.
 */
export function TextButton({ className = '', children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...rest} className={`inline-flex min-h-11 items-center px-2 underline-offset-4 transition ${className}`}>
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
      // 44px: this sits on fourteen screens and was 36, under every
      // touch-target guideline there is (docs/NORMAN.md).
      className={`flex h-11 w-11 flex-none items-center justify-center rounded-full transition ${tones[tone]} ${className}`}
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
      <div className={`mx-auto flex max-w-2xl items-center gap-3 px-5 sm:px-6 ${sticky ? 'pb-3.5 pt-safe-sticky' : 'py-3.5'}`}>
        {onBack && <BackButton onClick={onBack} label={backLabel} />}
        {children}
      </div>
    </header>
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

export function HeartGlyph({ className }: GlyphProp) {
  return (
    <svg {...gcls(className)}>
      <path d="M12 19.5c-4.5-3.2-7.5-6-7.5-9.2A3.9 3.9 0 0 1 8.4 6.4c1.5 0 2.8.8 3.6 2 .8-1.2 2.1-2 3.6-2a3.9 3.9 0 0 1 3.9 3.9c0 3.2-3 6-7.5 9.2Z" />
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

/**
 * A confirmation that exists for someone who cannot see it.
 *
 * Every success and every error in this product was a visual change and
 * nothing else — a swapped button label that clears itself after two seconds,
 * a coloured paragraph. The whole app contained one live region, on the
 * guide's thread, so tapping "Copy the words" put them on the clipboard and
 * announced nothing at all (docs/NORMAN.md).
 *
 * Renders nothing visible. Keep it mounted across the state change rather than
 * mounting it with the message, or there is nothing there to announce into.
 */
export function Announce({ message }: { message: string }) {
  return (
    <p role="status" aria-live="polite" className="sr-only">
      {message}
    </p>
  )
}

/**
 * One thing you can open, instead of eight hundred words you cannot close.
 *
 * Progressive disclosure, made a primitive. Niyyah's most honest screens were
 * also its heaviest: Trust said everything true about where a person's answers
 * live, in 2,366 rendered words and nine phone screens of continuous prose,
 * two of its paragraphs 562 and 536 words long (docs/LOAD.md). Nothing there
 * could be cut — every sentence matches a line of code that sends something —
 * so the fix is not fewer words. It is fewer words *at once*.
 *
 * `Read.tsx` had already worked out the right affordance twice by hand: the
 * native marker stripped, a chevron that rotates, and a hint that disappears
 * once the thing is open, because on a phone there is no hover to fall back on
 * (docs/NORMAN.md). This is those two blocks, extracted, so every screen in
 * the product opens the same way.
 *
 * `hint` is what the row says while it is closed: make it the *answer* rather
 * than a label, so that in the common case nobody has to open anything at all.
 */
export function Disclose({
  summary,
  hint,
  children,
  className = '',
  divided = true,
}: {
  summary: ReactNode
  hint?: ReactNode
  children: ReactNode
  className?: string
  /** A rule between the summary and the body. Off for a stack of small rows. */
  divided?: boolean
}) {
  return (
    <details className={`group/d rounded-card border border-line bg-white/50 ${className}`}>
      <summary className="cursor-pointer list-none px-5 py-4 text-[0.95rem] font-medium text-ink marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="flex items-center justify-between gap-3">
          <span className="min-w-0 flex-1 text-pretty">{summary}</span>
          <span className="flex flex-none items-center gap-2.5">
            {hint && (
              <span className="hidden text-[0.8rem] font-normal text-muted group-open/d:hidden sm:inline">{hint}</span>
            )}
            <ArrowRight className="flex-none text-forest transition-transform group-open/d:rotate-90" />
          </span>
        </span>
      </summary>
      <div className={`px-5 pb-5 ${divided ? 'border-t border-line pt-4' : 'pt-1'}`}>{children}</div>
    </details>
  )
}

/**
 * This browser is refusing to save anything.
 *
 * Private browsing, full storage, or a blocked origin. It used to appear on
 * three screens — and not on the read, the eleven or the couple sheet, which
 * are the ones a stranger arrives on from somebody else's link and the only
 * ones carrying a draft to lose
 * (docs/FAIL.md).
 *
 * `what` names the thing at risk on this screen, because "your progress" means
 * nothing to a man answering eleven questions about his own marriage.
 */
export function NotSaving({ what, className = '' }: { what: string; className?: string }) {
  return (
    <div role="status" className={`rounded-2xl border border-clay/40 bg-clay/[0.07] px-4 py-3 ${className}`}>
      <p className="text-[0.84rem] leading-snug text-ink-soft text-pretty">
        <span className="font-medium text-ink">This browser isn’t saving anything</span> — private browsing or full
        storage does that — so {what} will be gone when you close the tab. Finish in one sitting, or switch off
        private browsing first.
      </p>
    </div>
  )
}
