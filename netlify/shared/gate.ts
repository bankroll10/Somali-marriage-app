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
 * A gate blocks only where the two answers plainly contradict what she said;
 * anything our reading would have to supply is a question, not a gate
 * (docs/ALIGNMENT.md).
 *
 * This is what decides whether two counted people could ever be introduced,
 * and it is the only preference the product lets fragment a pool — the rest
 * are scored, or asked, never gated (docs/LIQUIDITY.md). Must match
 * src/lib/matching.ts; tests/gate-sync.test.ts fails the moment either moves.
 */

export type Blocked = 'faith' | 'children' | null

/**
 * Her answer on children against his, where the pair is a clash.
 *
 * Only want against no, either way (docs/ALIGNMENT.md G2). "Open to it with
 * the right person" against "I don't see children" used to block too, but it
 * is not a contradiction in her words or his — two people who might accept
 * each other's position were never introduced. It is now the place they
 * differ, and the first thing to ask.
 */
const CLASHES = new Set(['want/no', 'no/want'])

/**
 * The practice that contradicts "a shared commitment to faith", in his own
 * words: "Muslim by identity, lighter in practice". `returning` — "reconnecting
 * with my faith and on the way back" — used to block as well; that was our
 * reading of her words, not her words, and it told a man on his way back that
 * no woman who named faith would ever be introduced to him (docs/ALIGNMENT.md
 * G1). It is now the first thing she asks.
 */
const FAITH_CLASH = 'cultural'

export function blocked(
  nn: readonly string[],
  hers: { children?: unknown },
  his: { practice?: unknown; children?: unknown },
): Blocked {
  if (nn.includes('faith-nn') && his.practice === FAITH_CLASH) return 'faith'
  if (
    nn.includes('kids-nn') &&
    typeof hers.children === 'string' &&
    typeof his.children === 'string' &&
    CLASHES.has(`${hers.children}/${his.children}`)
  )
    return 'children'
  return null
}
