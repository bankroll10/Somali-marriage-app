import type { Question } from '../types'
import { allQuestions } from './intake'

/**
 * The short map — the ticket to the door.
 *
 * Being counted used to take the whole map: sixteen questions, the instrument
 * the product's own comments rank near the bottom of what hurts, before a
 * person could stand on the door. The pool reader (`netlify/functions/pool.ts`)
 * reads five things from a kept map and nothing else — age, stage, practice,
 * children, and what she will not compromise on — so sixteen was a toll on the
 * scarce side for eleven answers nobody counting needed (docs/BOARD.md,
 * decision 3). Age is asked at the door; the stage is the situation question;
 * these three are the rest. The full map is offered afterwards, from Home,
 * as the thing that makes a *reading* — never as the price of being counted.
 *
 * Held to `pool.ts` by `tests/short-map.test.ts`: a field the pool starts
 * reading is a question the door starts asking, in the same commit.
 */
export const SHORT_MAP_IDS = ['practice', 'children', 'dealbreakers'] as const

export function shortMapQuestions(): Question[] {
  return SHORT_MAP_IDS.map((id) => {
    const q = allQuestions.find((question) => question.id === id)
    if (!q) throw new Error(`short map: intake has no question ${id}`)
    return q
  })
}
