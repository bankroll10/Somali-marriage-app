/**
 * Every Somali sentence in the product, in one place, behind a gate.
 *
 * Cultural depth is the one skew nobody can copy — and one clumsy line in front
 * of a room of Somali women reads as outsiders faking it, which is worse than
 * no Somali at all. So: I draft, a reviewer reads, the founder approves, and
 * nothing here reaches a screen until `approved` is true. Callers fall back to
 * English.
 *
 * Review of 2026-09-12 (docs/BOARD.md, "The Somali lines"): all ten were read
 * as understandable Somali; seven were reworded for naturalness — fuller
 * constructions where the draft translated an English idiom word for word,
 * and the married line softened, since "and you chose it" read as scolding.
 * The founder accepted the review and approved nine. The auntie greeting is
 * held: the affectionate calling ending (-aay) is a voice choice the reviewer
 * asked to have read aloud by a woman from the audience before it is settled.
 *
 * Loanwords inside English lines — hooyo, wali, mahr, qabiil, dugsi, aroos —
 * are not gated; they are the vocabulary of the diaspora, not sentences.
 *
 * `somali` and `english` are two fields, not one string with a full stop
 * between them (2026-09-20, docs/ACCESS.md) — so a caller can mark the
 * Somali sentence `lang="so"` without also marking its own English gloss,
 * which a screen reader would otherwise try to pronounce as Somali. The
 * pairing itself is unchanged: every approved line still carries both.
 *
 * Rules, enforced by tests/somali-gate.test.ts:
 *   - one entry per line;
 *   - every unapproved line carries `// VERIFY`;
 *   - no approved line carries `// VERIFY`;
 *   - every line has both a Somali sentence and an English gloss, so an
 *     unread line is never a wall.
 */

export interface SomaliLine {
  somali: string
  english: string
  approved: boolean
}

export const SOMALI: Record<string, SomaliLine> = {
  'situation.preparing': { somali: 'Marka hore is diyaari.', english: 'Get yourself ready first; the rest follows.', approved: true },
  'situation.talking': { somali: 'Hadalku waa bilow.', english: 'Talking is a beginning, not a promise.', approved: true },
  'situation.deciding': { somali: 'Labada reer ayaa arrinta ku soo biiraya.', english: 'The two families are becoming involved — be ready for them.', approved: true },
  'situation.married': { somali: 'Guurku wuxuu u baahan yahay dadaal.', english: 'Marriage takes effort from both of you.', approved: true },
  'beforeYes.intro': { somali: 'Wada hadallada muhiimka ah.', english: 'The important conversations, before the families have them for you.', approved: true },
  'families.intro': { somali: 'Erayada aad u baahan tahay.', english: 'The words you will need.', approved: true },
}

/** The approved line for a key, or null — callers fall back to English. */
export function somali(key: string): SomaliLine | null {
  const line = SOMALI[key]
  return line?.approved ? line : null
}
