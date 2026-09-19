import type { ProductId } from '../../shared/config.ts'

/**
 * Stand-in pictures for the product cards until her photos are dropped into
 * public/bread/ (see README). They are drawn in the site's own palette, they
 * are labelled as illustrations, and nothing about them claims to show the
 * bread she actually bakes.
 */
export function ProductArt({ id, className = '' }: { id: ProductId; className?: string }) {
  const label = 'Illustration — replace with a photo of her bread'
  if (id === 'sourdough') {
    return (
      <svg viewBox="0 0 96 72" className={className} role="img" aria-label={label}>
        <rect width="96" height="72" rx="14" fill="#f3ebdd" />
        <ellipse cx="48" cy="46" rx="34" ry="17" fill="#9a5426" />
        <ellipse cx="48" cy="40" rx="34" ry="17" fill="#c2743a" />
        <ellipse cx="46" cy="36" rx="24" ry="9" fill="#e0a26a" opacity="0.55" />
        <path d="M30 34 q6 -4 12 0 M42 30 q6 -4 12 0 M54 34 q6 -4 12 0" stroke="#fbf6ee" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 96 72" className={className} role="img" aria-label={label}>
      <rect width="96" height="72" rx="14" fill="#f3ebdd" />
      <rect x="20" y="30" width="56" height="28" rx="6" fill="#9a5426" />
      <rect x="20" y="24" width="56" height="28" rx="6" fill="#b8763f" />
      <path d="M24 26 q24 -14 48 0 v6 q-24 -12 -48 0 z" fill="#d9a066" />
      <path d="M36 22 q12 -6 24 0" stroke="#fbf6ee" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  )
}
