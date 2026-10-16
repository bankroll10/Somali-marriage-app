import { PROMPTS, criterionOf, labelOf, nameOf } from './criteria'
import { fill, fingerprint, pairTextFor, scenarioFingerprint, type PairFacts, type PairText, type Ref } from './fixtures'
import { CRITERION_IDS, type Answers, type Asks, type CriterionId, type Person, type ScenarioId, type Side } from './types'

/**
 * Who may be suggested, and how two sets of answers compare.
 *
 * No score exists anywhere in here. Eligibility is yes or no and runs both
 * ways: a person is shown only if they meet the tester's requirements and the
 * tester meets theirs. Nothing is ever relaxed to fill the screen. Age is not
 * a point here, so these checks do not cover every requirement a real product
 * would need (docs/MATCH-PROTOTYPE.md).
 */

/** The most people shown at once. There is no refill. */
export const SHOWN_LIMIT = 3

export interface Self {
  side: Side
  answers: Answers
  asks: Asks
}

/** The points on which `asker` set a requirement that `other` does not meet. */
export function failedRequirements(asker: Asks, other: Answers): CriterionId[] {
  return CRITERION_IDS.filter((c) => asker[c].firm === 'requirement' && !asker[c].accept.includes(other[c]))
}

export interface Judged {
  person: Person
  /** Points where the tester's own requirement leaves this person out. */
  byYou: CriterionId[]
  /** Points where this person's own requirement leaves the tester out. */
  byThem: CriterionId[]
}

export const judge = (me: Self, person: Person): Judged => ({
  person,
  byYou: failedRequirements(me.asks, person.answers),
  byThem: failedRequirements(person.asks, me.answers),
})

export const isEligible = (j: Judged): boolean => j.byYou.length === 0 && j.byThem.length === 0

export interface Evaluation {
  eligible: Person[]
  /** The first few eligible, in the fixed order of the people. Not ranked. */
  shown: Person[]
  /** Everyone left out, with why. For the tester's own panel; the product would never show this. */
  leftOut: Judged[]
}

export function evaluate(me: Self, people: Person[]): Evaluation {
  const judged = people.map((p) => judge(me, p))
  const eligible = judged.filter(isEligible).map((j) => j.person)
  return { eligible, shown: eligible.slice(0, SHOWN_LIMIT), leftOut: judged.filter((j) => !isEligible(j)) }
}

export interface Difference {
  id: CriterionId
  /** What the person answered, as its label. */
  theirs: string
  /** The answers the tester said would work, as labels: what they preferred. */
  preferred: string[]
}

export interface Comparison {
  /** Points where the person’s answer is one the tester said would work. */
  lineUp: { id: CriterionId; text: string; theirs: string }[]
  /** Points marked a preference where the person’s answer is not one the tester said would work. */
  differ: Difference[]
  /** Points the tester said do not matter. Not compared. */
  unused: CriterionId[]
}

/**
 * Where the person’s answers fall inside or outside what the tester said would work.
 *
 * The comparison is with the answers the tester accepted for each point, never just
 * with the tester’s own answer: a different personal answer can still be one the
 * tester said would work (the person fits what the tester asked for), and the tester’s own answer is not
 * automatically one they accepted. Only the tester’s own asks are read: what the other
 * person asked is never shown. A difference can appear only on a point the tester
 * marked a preference, because a failed requirement would have left the person out.
 */
export function compare(me: Self, person: Person): Comparison {
  const lineUp: Comparison['lineUp'] = []
  const differ: Comparison['differ'] = []
  const unused: CriterionId[] = []
  for (const c of CRITERION_IDS) {
    const ask = me.asks[c]
    if (ask.firm === 'any') {
      unused.push(c)
      continue
    }
    const theirs = person.answers[c]
    if (ask.accept.includes(theirs)) {
      lineUp.push({
        id: c,
        theirs: labelOf(c, theirs),
        text: theirs === me.answers[c] ? `You both said: “${labelOf(c, theirs)}”.` : `${person.firstName} said: “${labelOf(c, theirs)}”. That works for you.`,
      })
    } else {
      // In the order the answers are listed on the form, not the order they were ticked.
      differ.push({ id: c, theirs: labelOf(c, theirs), preferred: criterionOf(c).options.filter((o) => ask.accept.includes(o.id)).map((o) => o.partner) })
    }
  }
  return { lineUp, differ, unused }
}

/** “A”, “A” or “B”, “A”, “B” or “C”: a list of quoted answers in a sentence. */
export function orList(labels: string[]): string {
  const q = labels.map((l) => `“${l}”`)
  return q.length <= 1 ? (q[0] ?? '') : `${q.slice(0, -1).join(', ')} or ${q.at(-1)}`
}

/**
 * The fixed pair text for this suggestion, or why there is none. It is
 * available only while the tester's answers still equal the sample scenario
 * the text was written for.
 */
export type Fixture = { available: true; text: PairText; scenario: ScenarioId } | { available: false; reason: 'no-scenario' | 'edited' | 'none-written' }

export function pairFixture(me: Self, scenario: ScenarioId | null, person: Person): Fixture {
  if (!scenario) return { available: false, reason: 'no-scenario' }
  if (fingerprint(me.side, me.answers, me.asks) !== scenarioFingerprint(scenario, me.side)) return { available: false, reason: 'edited' }
  const text = pairTextFor(scenario, person.id)
  if (!text) return { available: false, reason: 'none-written' }
  const filled: PairText = {
    summary: fill(text.summary, person.side, person.firstName),
    summaryWords: text.summaryWords,
    questions: text.questions.map((q) => ({ ...q, text: fill(q.text, person.side, person.firstName) })),
    facts: text.facts,
  }
  return { available: true, text: filled, scenario }
}

/** One cited answer, read from the data: a point (either person’s answer, or both), or one of the other person’s written answers. */
export type Resolved = { kind: 'pick'; point: CriterionId; you?: string; them?: string } | { kind: 'words'; index: 0 | 1 | 2; prompt: string; text: string }

/**
 * What the references of a line of the fixed text point at, resolved from the answers on
 * screen. Nothing is copied from the fixture: a cited answer is shown as it now stands. A
 * point cited for both people becomes one entry, in the order first cited.
 */
export function resolveBasis(refs: Ref[], me: Self, person: Person): Resolved[] {
  const out: Resolved[] = []
  for (const r of refs) {
    if ('words' in r) {
      if (!out.some((x) => x.kind === 'words' && x.index === r.words)) out.push({ kind: 'words', index: r.words, prompt: PROMPTS[r.words].short, text: person.words[r.words] })
      continue
    }
    let entry = out.find((x): x is Extract<Resolved, { kind: 'pick' }> => x.kind === 'pick' && x.point === r.pick)
    if (!entry) {
      entry = { kind: 'pick', point: r.pick }
      out.push(entry)
    }
    if (r.who === 'you') entry.you = labelOf(r.pick, me.answers[r.pick])
    else entry.them = labelOf(r.pick, person.answers[r.pick])
  }
  return out
}

/** A resolved citation as one line: “Work. You: “I plan to work”. Liban: “I plan to be at home”.” */
export function basisLine(r: Resolved, name: string): string {
  if (r.kind === 'words') return `${name}’s written answer, ${r.prompt}: “${r.text}”`
  return [`${nameOf(r.point)}.`, r.you !== undefined ? `You: “${r.you}”.` : '', r.them !== undefined ? `${name}: “${r.them}”.` : ''].filter(Boolean).join(' ')
}

/** The points a summary’s facts claim, in the order the form lists them. */
export function summaryPoints(facts: PairFacts): CriterionId[] {
  const claimed = new Set([...facts.same, ...facts.workable, ...facts.differs])
  return CRITERION_IDS.filter((c) => claimed.has(c))
}

/** A way to reach someone: an email, a phone number, a handle or a link. Kept out of the written answers. */
export function looksLikeContact(text: string): boolean {
  return /[^\s@]+@[^\s@]+\.[^\s@]+|(?:\+?\d[\s().-]*){7,}|(?:^|\s)@\w{2,}|https?:\/\/|www\.|\b\w+\.(?:com|net|org|io|me)\b/i.test(text)
}

export const pointNames = (ids: CriterionId[]): string => ids.map((c) => nameOf(c).toLowerCase()).join(', ')

