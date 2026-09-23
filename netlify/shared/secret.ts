/**
 * Two secrets compared in constant time, so the response time never says how
 * much of a guess was right.
 *
 * Was private to netlify/shared/founder.ts; the couple owner key
 * (netlify/functions/couple.ts, docs/SECURITY.md O6) is the second secret a
 * request presents, so the comparison lives here and both use it. The edge
 * gate keeps its own copy — it runs on Deno, in a separate bundle.
 */
export function sameSecret(a: string, b: string): boolean {
  const encoder = new TextEncoder()
  const left = encoder.encode(a)
  const right = encoder.encode(b)
  let diff = left.length ^ right.length
  const len = Math.min(left.length, right.length)
  for (let i = 0; i < len; i++) diff |= left[i] ^ right[i]
  return diff === 0
}
