/**
 * Every Somali sentence in the product, in one place, behind a gate.
 *
 * Cultural depth is the one skew nobody can copy — and one clumsy line in front
 * of a room of Somali women reads as outsiders faking it, which is worse than
 * no Somali at all. So: I draft, the founder approves, and nothing here reaches
 * a screen until `approved` is true. Callers fall back to English.
 *
 * Loanwords inside English lines — hooyo, wali, mahr, qabiil, dugsi, aroos —
 * are not gated; they are the vocabulary of the diaspora, not sentences.
 *
 * Rules, enforced by src/data/somali.test.ts:
 *   - one entry per line;
 *   - every unapproved line carries `// VERIFY`;
 *   - no approved line carries `// VERIFY`.
 */

export interface SomaliLine {
  text: string
  approved: boolean
}

export const SOMALI: Record<string, SomaliLine> = {
  'auntie.opener': { text: 'Kaalay, gabadhayda. Sit with your auntie a moment.', approved: false }, // VERIFY
  'brother.opener': { text: 'Waqtigaaga ha lumin, walaal. Don’t waste your time on someone who won’t say what they want.', approved: false }, // VERIFY
  'map.warmest': { text: 'Waa kuu suurtagal. This is possible for you — and you are closer than you think.', approved: false }, // VERIFY
  'situation.preparing': { text: 'Naftaada hore u diyaari. Get yourself ready first; the rest follows.', approved: false }, // VERIFY
  'situation.talking': { text: 'Hadalku waa bilow. Talking is a beginning, not a promise.', approved: false }, // VERIFY
  'situation.deciding': { text: 'Reeraha ayaa soo galaya. The families are coming in — be ready for them.', approved: false }, // VERIFY
  'situation.married': { text: 'Guurku waa shaqo. Marriage is work, and you chose it.', approved: false }, // VERIFY
  'beforeYes.intro': { text: 'Sheekooyinka dhabta ah. The real conversations, before the families have them for you.', approved: false }, // VERIFY
  'families.intro': { text: 'Erayada aad u baahan tahay. The words you will need.', approved: false }, // VERIFY
  'read.eyebrow': { text: 'Waxa uu ku tusay. What he has shown you.', approved: false }, // VERIFY
}

/** The approved line for a key, or null — callers fall back to English. */
export function somali(key: string): string | null {
  const line = SOMALI[key]
  return line?.approved ? line.text : null
}
