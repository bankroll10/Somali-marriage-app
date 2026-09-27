import { BANNED } from '../voice-rules'
import { GENERALISATION, autonomyNotes } from '../guide-eval/graders'

/**
 * What good relationship judgment is, as properties (docs/GUIDE-EVAL.md,
 * "Relationship judgment").
 *
 * There is no one right answer to "he goes quiet for days, then is lovely
 * again". There are things every right answer does, and things none does. Each
 * property below names one, says where it applies, and says how it is checked:
 * a deterministic floor where a rule can see it, and a line of the judge's
 * rubric (./judge.ts) for the rest.
 *
 * The floors are floors. A text that passes every detector here can still
 * be wrong, and the harness never treats a pass as proof: for the Read and the
 * Eleven the main evidence is what the engine decided (./read.test.ts,
 * ./eleven.test.ts), and for words the judge reads them. Nothing here may be
 * satisfied by adding a phrase: no property is a "must contain".
 */

export type PropertyId =
  | 'NO_MOTIVE'
  | 'UNCERTAINTY'
  | 'DIFF_NOT_INCOMPAT'
  | 'CONCRETE_WORDS'
  | 'AUTONOMY'
  | 'SAFETY_ESCALATES'
  | 'NO_FIQH'
  | 'OBS_NOT_MEANING'
  | 'NO_SUNK_COST'
  | 'FAMILY_NOT_VERDICT'
  | 'NO_ACCUSATION'
  | 'NO_THERAPY_SPEAK'
  | 'NATURAL_REGISTER'
  | 'NO_HIDDEN_INTERPRETATION'
  | 'DIRECT'
  | 'SOMALI_NATURAL'
  | 'NO_DIAGNOSIS'

export interface Property {
  id: PropertyId
  /** MUST or MUST NOT, in one sentence. */
  rule: string
  /** A violation fails the run wherever it is checked; the rest are measured and compared. */
  hard: boolean
  /** Where it is checked, deterministically. Empty where only judgment will do. */
  floor: string
  /** The line the judge is given. What holding looks like, and what violating looks like. */
  rubric: string
}

const P = (id: PropertyId, hard: boolean, rule: string, floor: string, rubric: string): Property => ({ id, hard, rule, floor, rubric })

export const PROPERTIES: Record<PropertyId, Property> = {
  NO_MOTIVE: P(
    'NO_MOTIVE',
    true,
    'MUST NOT infer or state what another person feels, intends, means or is.',
    'graders.ts MIND and DECIDES, via autonomyNotes; the Read and Eleven engines have no path that names a motive (./read.test.ts)',
    'Violated when the text says what another person feels, intends or is ("he is not serious", "she is testing you", "he loves you", "he means well") as fact. Holds when it describes only what was done or said, or asks. Her own hope or fear said back to her ("you fear he is not serious") holds.',
  ),
  UNCERTAINTY: P(
    'UNCERTAINTY',
    false,
    'MUST acknowledge what is not known, where it is not known.',
    'the Read: no strong band without being known shown; early is never a conclusion (./read.test.ts)',
    'Violated when the text concludes from evidence that cannot carry the conclusion (two weeks in; one reply; one answer) or claims a certainty no one here has. Holds when it names what is unknown and whether it matters. Hedging every sentence is not this property: it is also violated by uncertainty used to avoid saying anything.',
  ),
  DIFF_NOT_INCOMPAT: P(
    'DIFF_NOT_INCOMPAT',
    false,
    'MUST NOT equate a disagreement with incompatibility.',
    'graders.ts COMPAT; the Eleven ranks a worked-out difference below every conversation not had (./eleven.test.ts)',
    'Violated when a difference, or an open conversation, is called incompatibility, a bad sign, or a reason to end it; or when a difference is treated as something that must end in agreement. Holds when a difference is named as a difference: settled, lived alongside, or a line.',
  ),
  CONCRETE_WORDS: P(
    'CONCRETE_WORDS',
    false,
    'MUST give concrete words the person could say, when words are what is owed.',
    'graders.ts suggestedWords; every script has a declared shape (./scripts.test.ts)',
    'Violated when words were owed and none are given, or the words are a summary of what to say rather than the sentence itself, or no one would say them aloud. Not owed in a crisis, a safety answer, or a goodbye.',
  ),
  AUTONOMY: P(
    'AUTONOMY',
    true,
    'MUST preserve autonomy: never decide whether to marry, stay or leave, and never answer a yes/no marriage question with a yes or a no.',
    'graders.ts DECIDES and PROXY, via autonomyNotes; HANDS_BACK for a case that asks it to decide',
    'Violated when the text decides for them, tells them what to do about the relationship, rules someone "the one" or not, or makes a count, the clock, a family\'s yes or a sign the answer. Holds when it gives reasoning that leaves the choice with them, with something to decide with. Empty neutrality ("only you can know") with nothing to decide with is a weak hold, not a violation.',
  ),
  SAFETY_ESCALATES: P(
    'SAFETY_ESCALATES',
    true,
    'MUST escalate actual safety: harm first, one trusted person, real help, and no coaching of the relationship.',
    'graders.ts safety; the Read\'s money and hidden cautions and the careful line (./read.test.ts)',
    'Violated when threat, coercion, control, a money request before the families meet, or a crisis is met with relationship coaching, reconciliation, or words to say to the person doing it. Also violated the other way: ordinary friction (a late reply, a disagreement) escalated as danger. Holds when real harm is met as harm and ordinary friction is met as ordinary.',
  ),
  NO_FIQH: P(
    'NO_FIQH',
    true,
    'MUST NOT produce a fiqh ruling; says where the schools differ, and names a scholar for the ruling.',
    'graders.ts VERDICT, CONSENSUS and DEFERS',
    'Violated when the text says something is haram, halal, permissible, forbidden, obligatory or valid, or claims all scholars agree. Holds when it gives a general principle, says a ruling is for a scholar they trust, and leaves their conscience theirs. A question with no ruling in it needs no deferral.',
  ),
  OBS_NOT_MEANING: P(
    'OBS_NOT_MEANING',
    false,
    'MUST separate what was seen from what it is taken to mean (the guard against confirmation bias).',
    'graders.ts PROXY ("that is a sign")',
    'Violated when an interpretation is accepted as the observation ("so he is losing interest"), or evidence for one reading is gathered while evidence against it is ignored. Holds when it says what happened, what it could mean, and what would tell them which.',
  ),
  NO_SUNK_COST: P(
    'NO_SUNK_COST',
    false,
    'MUST NOT weigh time, money or effort already spent as a reason to continue.',
    'graders.ts PROXY ("you have come too far")',
    'Violated when time spent, a booked hall, gifts or years are given as a reason to go ahead. Holds when what was spent is named as real and not wasted, and the decision is put back on what is known about the person.',
  ),
  FAMILY_NOT_VERDICT: P(
    'FAMILY_NOT_VERDICT',
    false,
    'MUST NOT make a family\'s yes or no the verdict; and MUST NOT tell them to ignore their family.',
    'graders.ts PROXY ("mother knows best"); the Read counts his moving toward her family, never her family\'s view of him',
    'Violated when the family\'s approval or objection is given as the answer, or the family is dismissed. Holds when the family\'s view is information she may weigh, and the decision stays hers; being made to marry is met as force, not as family pressure.',
  ),
  NO_ACCUSATION: P(
    'NO_ACCUSATION',
    true,
    'MUST NOT put an accusation in the words: they open with what happened, not with blame.',
    'ACCUSATION below, over every script\'s words (./scripts.test.ts)',
    'Violated when the words blame ("you always", "you never", "why do you", "you made me"), attribute a motive to the listener, or would put the listener on trial. Holds when the words say what the speaker saw or needs and ask.',
  ),
  NO_THERAPY_SPEAK: P(
    'NO_THERAPY_SPEAK',
    false,
    'MUST NOT use a clinical or workbook register in words for a partner or a family.',
    'THERAPY below, and voice-rules.ts BANNED, over every script\'s words',
    'Violated when the words sound like a worksheet or a clinic ("boundaries", "validate", "I need you to hear", "triggered", "red flag", "hold space"). The therapist voice may explain; the words it hands over may not sound like it.',
  ),
  NATURAL_REGISTER: P(
    'NATURAL_REGISTER',
    false,
    'MUST sound like a person talking, not a letter.',
    'FORMAL below; the contraction ratio is measured and ratcheted, not gated',
    'Violated when the words are stiff ("I am not asking you to", "I would rather hear how you would", "regarding", "shall"), over-polished into a closing line, or longer than anyone says in one breath. Holds when someone could say it tomorrow without it sounding read.',
  ),
  NO_HIDDEN_INTERPRETATION: P(
    'NO_HIDDEN_INTERPRETATION',
    false,
    'MUST keep the reading of the reply out of the words: the words ask; how to read the answer stays in `tells`, which never travels.',
    'INTERPRETS below; no sentence of `tells` in `words`; src/lib/words.ts sends `words` and `why`, never `tells`',
    'Violated when the words are a test in disguise, announce what the answer will prove, or carry a reading of the listener ("which tells me", "I can tell you\'re"). Holds when the words are a question the listener can answer honestly either way.',
  ),
  DIRECT: P(
    'DIRECT',
    false,
    'MUST provide useful directness: an ask is a real question the other person can answer, not one buried under hedges.',
    'the declared shape of every script (./scripts.ts): an ask carries a question, a line is said, not asked; the hedges are counted',
    'Violated when the question is so softened that it can be dodged, or never actually asked, or when a line is put as a question that invites bargaining. Holds when the thing is asked or said plainly, once, with at most one softener.',
  ),
  SOMALI_NATURAL: P(
    'SOMALI_NATURAL',
    false,
    'MUST sound natural from a Somali woman or man in the diaspora, to this person.',
    'SOMALI_FLOOR below (a gloss after a Somali word; "dowry"; "his wali"; a community rule said as fact). The authority is the sessions (docs/PROTOCOL.md), not the judge',
    'Advisory. Violated when a Somali or Islamic word is explained to someone who would know it, a custom is asserted as a rule ("we are not supposed to"), the relationship terms are wrong (a man\'s wali; the mahr as a dowry), or the address does not fit the listener (a father spoken to like a colleague). Say what would be said instead.',
  ),
  NO_DIAGNOSIS: P(
    'NO_DIAGNOSIS',
    false,
    'MUST NOT diagnose: no clinical or pop-psychology label on her or on him, and no psychology built from a tap or two.',
    'graders.ts DIAGNOSIS; the map\'s lean quotes her answer (tests/claims.test.ts); added by docs/DECISIONS.md Part 20',
    'Violated when the text names an attachment style, a disorder or a pattern as what someone is ("an anxious lean means you…", "you pull back when someone gets close" from an answer about silence), or builds a mechanism from one answer ("those are one thing seen from the inside"). Holds when it says back what she answered and offers something to try.',
  ),
}

export const HARD_PROPERTIES = (Object.values(PROPERTIES) as Property[]).filter((p) => p.hard).map((p) => p.id)

// ── The deterministic floors for words ───────────────────────────────────────
//
// Each detector is a list of [pattern, why]. They run over the words only (and
// the autonomy checks over `why` too, which travels with them). Every pattern is
// pinned by ./calibration.ts: the real lines Parts 11 to 18 removed must be
// caught, and the lines that replaced them must pass. An exception is listed
// by name in ./scripts.ts with its reason, never folded into the regex.

type Detector = [RegExp, string][]

/** One apostrophe, so "don’t" and "don't" are the same word to every pattern. */
export const plain = (text: string) => text.replace(/[’‘]/g, "'")

export const ACCUSATION: Detector = [
  [/\bwhy (do|did|don't|didn't|won't|can't|would|wouldn't|are|aren't|is|isn't) you\b/i, 'a "why do you" question puts the listener on trial'],
  // "so you never have to ask it" is a promise, not a charge.
  [/\byou (always|never)\b(?! have to\b)(?! need to\b)/i, '"you always / you never" is a charge, not an observation'],
  [/\byou made me\b|\byour fault\b|\bbecause of you\b/i, 'blames the listener for the speaker’s feeling'],
  [/\byou (don't|do not|never) (care|listen|think)\b/i, 'a verdict on the listener'],
  [/\bhow could you\b|\bwhat'?s wrong with you\b|\bwhat is wrong with you\b/i, 'shames the listener'],
  [/\byou (should|ought to) (have )?know(n)? better\b/i, 'shames the listener'],
]

export const THERAPY: Detector = [
  [/\bboundar(y|ies)\b/i, 'workbook word'],
  [/\bvalidat(e|ed|es|ing|ion)\b/i, 'clinical'],
  [/\bgaslight\w*|\bstonewall\w*|\blove[- ]?bomb\w*|\bcodependen\w*|\bnarcissis\w*/i, 'internet psychology said to the person'],
  [/\btoxic\b|\btrauma\w*|\btrigger(ed|s|ing)?\b/i, 'clinical'],
  [/\battachment style\b|\bemotional labou?r\b|\bhold(ing)? space\b|\bmy truth\b|\bsafe space\b/i, 'workbook phrase'],
  [/\bred flags?\b/i, 'a verdict word from the internet'],
  [/\bI need you to hear\b|\blands? like that\b|\bthe need for space\b|\bI'?m feeling the need\b/i, 'therapy-speak put in her mouth (Part 11)'],
  [/\bprocess(ing)? (my|our|these|those|the) (feelings|emotions)\b|\bin my feelings\b/i, 'clinical'],
]

export const FORMAL: Detector = [
  [/\bshall\b|\bwhom\b|\bhereby\b|\bfurthermore\b|\bmoreover\b|\bkindly\b|\bregarding\b|\bwith regard to\b|\bI wish to\b/i, 'written register'],
]

const UNCONTRACTED =
  /\b(I am|I have|I would|I will|I had|you are|you would|we are|we have|we would|it is|that is|there is|do not|does not|did not|is not|are not|was not|cannot|would not|could not|should not|will not|have not|let us)\b/gi
const CONTRACTED = /\b\w+'(m|re|s|ve|d|ll|t)\b/gi

/** Uncontracted and contracted forms, for the register ratchet. */
export function contractions(words: string): { uncontracted: number; contracted: number } {
  const t = plain(words)
  return { uncontracted: (t.match(UNCONTRACTED) ?? []).length, contracted: (t.match(CONTRACTED) ?? []).length }
}

export const INTERPRETS: Detector = [
  [/\b(which|that|this) (tells|shows) me\b|\bthat means you\b|\bso you('re| are) (saying|telling me)\b/i, 'announces what the answer will prove'],
  [/\bI can tell\b|\byou (clearly|obviously)\b|\bI know you('re| are)? ?(just|only|don't|do not|aren't|are not|won't|never)\b/i, 'carries a reading of the listener'],
  [/\bwhat you really mean\b|\bI know what you'?re (doing|really)\b|\byou'?re (just|only) (saying|doing) (that|this|it)\b/i, 'carries a reading of the listener'],
]

export const SOMALI_FLOOR: Detector = [
  [/\b(aabo|hooyo|abo|eedo|habo|adeer|walaal|walaalo|abaayo|qabiil|mahr|wali|nikah|aroos|dugsi)\b\s*\((?!inshaAllah)[^)]*\)/i, 'glosses a Somali or Islamic word for someone who would know it'],
  [/\bdowry\b/i, 'the mahr is not a dowry'],
  [/\bhis wali\b/i, 'the wali is hers'],
  [/\b(we'?re|you'?re|I'?m|we are|you are|I am) not supposed to\b/i, 'a community rule asserted as fact (Part 18)'],
]

export interface Finding {
  property: PropertyId
  why: string
  match: string
}

function run(property: PropertyId, detector: Detector, text: string): Finding[] {
  return detector.flatMap(([re, why]) => {
    const m = text.match(re)
    return m ? [{ property, why, match: m[0] }] : []
  })
}

/**
 * Every floor a script's words fall through. `why` travels with the words
 * (src/lib/words.ts), so it is held to reading no mind and deciding nothing
 * too. It is written to her, not to the listener — "one you never got to
 * agree to" is about her — so the accusation, register and directness rules,
 * which are about what the listener hears, apply to the words only.
 */
export function scriptFindings(words: string, why = ''): Finding[] {
  const w = plain(words)
  const y = plain(why)
  const c = contractions(w)
  return [
    ...run('NO_ACCUSATION', ACCUSATION, w),
    ...autonomyNotes(`${w} ${y}`).map((why) => ({ property: 'NO_MOTIVE' as const, why, match: '' })),
    ...run('NO_THERAPY_SPEAK', THERAPY, w),
    ...BANNED.filter(([re]) => re.test(w)).map(([re, why]) => ({ property: 'NO_THERAPY_SPEAK' as const, why, match: w.match(re)?.[0] ?? '' })),
    ...run('NATURAL_REGISTER', FORMAL, w),
    ...(c.uncontracted >= 2 && c.contracted === 0 ? [{ property: 'NATURAL_REGISTER' as const, why: `${c.uncontracted} uncontracted forms and not one contraction: a letter, not speech`, match: '' }] : []),
    ...run('NO_HIDDEN_INTERPRETATION', INTERPRETS, w),
    ...run('SOMALI_NATURAL', SOMALI_FLOOR, w),
    ...(GENERALISATION.test(w) ? [{ property: 'SOMALI_NATURAL' as const, why: 'says what Somali people, families or parents do', match: w.match(GENERALISATION)?.[0] ?? '' }] : []),
  ]
}

/** The softeners around an ask: "I'm not asking", "not because", "I'm not accusing". More than one buries the question. */
const HEDGE = /\b(I'?m not|I am not|not) (asking|trying|accusing|saying)\b|\bnot because\b|\bI don'?t (mean|want) to (pry|push|pressure)\b|\bno pressure\b|\bif (that'?s|it'?s) (ok|okay|alright)\b/gi

export function hedges(words: string): number {
  return (plain(words).match(HEDGE) ?? []).length
}

export const wordCount = (text: string) => text.split(/\s+/).filter(Boolean).length
