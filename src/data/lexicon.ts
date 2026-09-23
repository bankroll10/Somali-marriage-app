/**
 * The words this product already uses, collected and defined, in one place.
 *
 * These aren't invented jargon — every one of them is live in the app. Writing
 * them down is what turns private product nouns into language members share
 * with each other, and it makes the whole thing legible as one system instead
 * of a pile of screens.
 *
 * It lived inside `Philosophy.tsx` until 2026-09-18, which meant the glossary
 * sat on the one screen reached from Home's footer while the words themselves
 * appeared everywhere else: "your map" is said 96 times in live copy, "vouch"
 * 41, "the eleven" 35, "kept" 31, "the door" 18, "counted" 16 (docs/LOAD.md).
 * Six terms were defined and seven were not. Now it is a module, so a screen
 * can show the definitions of the words *it* uses, closed, beside the words —
 * see `<Words>` in src/components/ui.tsx.
 *
 * Adding a term is cheap; leaving one undefined is not. `tests/load.test.ts`
 * holds two rules: every id a screen asks for exists here, and every term here
 * is a word the product actually says somewhere in live copy. A definition for
 * a word nobody uses is clutter, and a word used without a definition is the
 * burden this file exists to remove.
 */

export type TermId =
  | 'map'
  | 'reading'
  | 'ground'
  | 'thin'
  | 'work'
  | 'mirror'
  | 'space'
  | 'read'
  | 'eleven'
  | 'vouch'
  | 'door'
  | 'code'
  | 'counted'

export interface Term {
  id: TermId
  term: string
  body: string
}

export const LEXICON: Term[] = [
  {
    id: 'map',
    term: 'Your map',
    body: 'The reading you get at the end of the reflection. Not a score of you as a person — the ground you are standing on.',
  },
  {
    id: 'reading',
    term: 'A reading',
    body: 'One dated map. You will have several, and what changed between them is what to read.',
  },
  {
    id: 'ground',
    term: 'Your ground',
    body: 'The seven things a marriage stands on. Everyone is thin somewhere; the map just says where.',
  },
  {
    id: 'thin',
    term: 'Thin, steady, strong',
    body: 'The only three words your map uses about a ground. Never a number, never a grade — thin means there is work there, not that something is wrong with you.',
  },
  {
    id: 'work',
    term: 'The work',
    body: 'One honest thing, taken on and done. Nothing is scored — doing it changes your answers, and your answers are the map.',
  },
  {
    id: 'mirror',
    term: 'The mirror',
    body: 'The part of your map you would rather not read. It is the reason to trust the rest of it.',
  },
  {
    id: 'space',
    term: 'Home',
    body: 'Where you land when something happens: what happened, what you are working on, and where you are. Not a feed, and not a reason to come back.',
  },
  {
    id: 'read',
    term: 'A read',
    body: 'Twelve questions about what someone has done, not what they promise. It reads them, not you, and it never asks their name.',
  },
  {
    id: 'eleven',
    term: 'The eleven',
    body: 'The eleven conversations couples rarely have before the families do. You can answer them alone, or send them to the other person and see only where you match.',
  },
  {
    id: 'vouch',
    term: 'A vouch',
    body: 'One family member saying, in their own sentence, that they know you and stand behind you. The only verification this product claims.',
  },
  {
    id: 'door',
    term: 'The door',
    body: 'Where people who are looking are counted. Nobody is introduced to anyone until both sides of a city are real, so the door shows the number rather than promising a match.',
  },
  {
    id: 'code',
    term: 'Your code',
    body: 'Eight characters that bring your map back on any phone. Registered to nobody, and there is no account behind it — which is why keeping it matters.',
  },
  {
    id: 'counted',
    term: 'Counted',
    body: 'One word about a step you reached, under a code that is not your map code. Never your answers, never a name. You can turn it off.',
  },
]

const BY_ID = new Map(LEXICON.map((t) => [t.id, t]))

/** The terms a screen names, in the order it names them; unknown ids drop. */
export function terms(ids: TermId[]): Term[] {
  return ids.map((id) => BY_ID.get(id)).filter((t): t is Term => !!t)
}
