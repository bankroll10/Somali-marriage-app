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
 * Rules, enforced by tests/somali-gate.test.ts:
 *   - one entry per line;
 *   - every unapproved line carries `// VERIFY`;
 *   - no approved line carries `// VERIFY`;
 *   - every Somali sentence is followed by its English, so an unread line is
 *     never a wall.
 */

export interface SomaliLine {
  text: string
  approved: boolean
}

export const SOMALI: Record<string, SomaliLine> = {
  'auntie.opener': { text: 'Kaalay, gabadhaydaay. Sit with your auntie a moment.', approved: false }, // VERIFY — read aloud by a woman from the audience first
  'brother.opener': { text: 'Waqtigaaga ha lumin, walaal. Don’t waste your time on someone who won’t say what they want.', approved: true },
  'map.warmest': { text: 'Way kuu suurtagal tahay. This is possible for you — and you are closer than you think.', approved: true },
  'situation.preparing': { text: 'Marka hore is diyaari. Get yourself ready first; the rest follows.', approved: true },
  'situation.talking': { text: 'Hadalku waa bilow. Talking is a beginning, not a promise.', approved: true },
  'situation.deciding': { text: 'Labada reer ayaa arrinta ku soo biiraya. The two families are becoming involved — be ready for them.', approved: true },
  'situation.married': { text: 'Guurku wuxuu u baahan yahay dadaal. Marriage takes effort from both of you.', approved: true },
  'beforeYes.intro': { text: 'Wada hadallada muhiimka ah. The important conversations, before the families have them for you.', approved: true },
  'families.intro': { text: 'Erayada aad u baahan tahay. The words you will need.', approved: true },
  'read.eyebrow': { text: 'Waxa uu ku tusay. What he has shown you.', approved: true },
}

/** The approved line for a key, or null — callers fall back to English. */
export function somali(key: string): string | null {
  const line = SOMALI[key]
  return line?.approved ? line.text : null
}
