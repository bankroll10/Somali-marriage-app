/**
 * The two non-negotiables a form can check.
 *
 * The server's twin of `gate()` in src/lib/matching.ts. Of the seven
 * non-negotiables a member may name, two can be read against another map — a
 * shared commitment to faith against his practice, and being aligned on
 * children against his answer — and the other five (honesty, respect, clean
 * living, direction, how he treats the powerless) are real and unverifiable
 * from any form, so on the client they become the first thing to ask and here
 * they do nothing at all. An honest "unsure" and an unanswered question never
 * clash; that rule holds on both sides.
 *
 * This is what decides whether two counted people could ever be introduced,
 * and it is the only preference the product lets fragment a pool — the rest
 * are scored, or asked, never gated (docs/LIQUIDITY.md). Must match
 * src/lib/matching.ts; tests/gate-sync.test.ts fails the moment either moves.
 */

export type Blocked = 'faith' | 'children' | null

/** Her answer on children against his, where the pair is a clash. */
const CLASHES = new Set(['want/no', 'no/want', 'no/open', 'open/no'])

export function blocked(
  nn: readonly string[],
  hers: { children?: unknown },
  his: { practice?: unknown; children?: unknown },
): Blocked {
  if (nn.includes('faith-nn') && (his.practice === 'cultural' || his.practice === 'returning')) return 'faith'
  if (
    nn.includes('kids-nn') &&
    typeof hers.children === 'string' &&
    typeof his.children === 'string' &&
    CLASHES.has(`${hers.children}/${his.children}`)
  )
    return 'children'
  return null
}
