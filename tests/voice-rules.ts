/**
 * The voice, as a list of things it does not say (docs/DESIGN.md). Shared by
 * the copy scan in tests/voice.test.ts and the Guide's tone grader in
 * tests/guide-eval/graders.ts, so the product's words and the guide's words
 * are held to one list.
 */
export const BANNED: [RegExp, string][] = [
  [/\bactually\b/i, 'the tic — say the thing without insisting it is real'],
  [/\bgenuinely\b/i, 'announces sincerity; the sentence should carry it'],
  [/\bliterally\b/i, 'filler'],
  [/\btruly\b/i, 'announces sincerity'],
  [/\bsuperpower\b/i, 'startup'],
  [/\bon purpose\b/i, 'explains a design decision to the person'],
  [/\bdeliberately\b/i, 'explains a design decision to the person'],
  [/\bthat is deliberate\b/i, 'explains a design decision to the person'],
  [/\bthe whole point\b/i, 'aphorism'],
  [/here’s the frame|here's the frame/i, 'the fallback opener'],
  [/\byour peace\b/i, 'therapy, outside the therapist'],
  [/\bdata too\b/i, 'therapy, outside the therapist'],
  [/\bnervous system\b/i, 'clinical, even for the therapist'],
  [/\bregulate\b/i, 'clinical, even for the therapist'],
  [/\bjourney\b/i, 'self-help register'],
  [/\bhealing from\b/i, 'therapy, outside the therapist'],
  [/\binner work\b/i, 'therapy'],
  [/\bperforming recovery\b/i, 'therapy-internet'],
  [/\bfounding cohort\b/i, 'startup'],
  [/\bfounding member/i, 'startup'],
  [/\bplatform\b/i, 'startup — it is Niyyah, or nothing'],
  [/\bI want in\b/i, 'scarcity language put in her mouth'],
  [/\bsituationship/i, 'internet'],
  [/decides? a (Somali )?marriage/i, 'docs/PROTOCOL.md, "Exaggerated" — its example of an exaggerated claim'],
  [/\bthe whole road\b/i, 'a sweeping claim about every family, made four times'],
  [/\bsingle (best|most)\b/i, 'a verdict from eleven taps'],
  [/\bno other app\b/i, 'a claim about every other app'],
  [/\bload-bearing\b/i, 'jargon'],
  [/\bI’ve seen a hundred\b/i, 'the auntie claiming a record she does not have'],
]
