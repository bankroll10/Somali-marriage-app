import { blobs } from './blobs'
import type { Phone } from './device'

/**
 * Where anything of hers is still written (docs/TESTING.md).
 *
 * Every key and every value in every store, and every key and value on the
 * phones given, searched for each needle. "Delete means deleted" is checked
 * against this, not against a list of the keys a route is known to write —
 * a list would miss exactly the key someone adds later.
 */
export function residue(needles: string[], phones: Phone[] = []): string[] {
  const found: string[] = []
  for (const [name, m] of blobs.stores) {
    for (const [key, b] of m) {
      for (const n of needles) if (key.includes(n) || b.value.includes(n)) found.push(`${name}:${key} ∋ ${n}`)
    }
  }
  for (const p of phones) {
    for (const [key, value] of p.storage) {
      for (const n of needles) if (key.includes(n) || value.includes(n)) found.push(`phone ${p.name}:${key} ∋ ${n}`)
    }
  }
  return found
}
