import { CRITERION_IDS, type AgeAsk, type Answers, type Ask, type Asks, type CriterionId, type Firmness, type Person, type PointId, type Scenario, type ScenarioId, type Side } from './types'

/**
 * Everything made up in the matching prototype (docs/MATCH-PROTOTYPE.md).
 *
 * Five people per side, with fictional first names, adult fictional ages, an explicit
 * choice about the ages they would consider (a requirement, a preference or "doesn't
 * matter") and answers chosen so that the three sample scenarios below produce three,
 * one and no suggestions. Nothing here is real, and nothing is relaxed to fill a
 * screen: the scenario test (tests/prototype/suggest.test.ts) pins the counts.
 *
 * The pair texts at the bottom are fixed text standing in for what an AI model
 * might write. They are written for one sample scenario each and are shown only
 * while the tester's answers still match that scenario.
 */

const ask = (accept: string[], firm: Firmness): Ask => ({ accept, firm })
const any = (): Ask => ask([], 'any')
const asks = (a: Record<CriterionId, Ask>): Asks => a
const ages = (firm: 'requirement' | 'preference', min: number, max: number): AgeAsk => ({ firm, min, max })
const anyAge: AgeAsk = { firm: 'any' }

interface Template {
  key: string
  age: number
  ageAsk: AgeAsk
  answers: Answers
  asks: Asks
  words: string[]
  interestedInYou: boolean
  replies: string[]
}

const TEMPLATES: Template[] = [
  {
    key: 'p1',
    age: 29,
    ageAsk: ages('requirement', 27, 35),
    answers: { timeline: 't-year', children: 'c-want', practice: 'p-steady', city: 'mpls', work: 'w-work', household: 'h-own' },
    asks: asks({
      timeline: ask(['t-year', 't-two'], 'requirement'),
      children: ask(['c-want', 'c-open'], 'requirement'),
      practice: ask(['p-steady', 'p-build'], 'preference'),
      city: ask(['mpls'], 'preference'),
      work: any(),
      household: ask(['h-own', 'h-open'], 'preference'),
    }),
    words: [
      'I want a calm, steady home with prayer at the centre of it, and a marriage where we can talk openly.',
      'I work, I like my routines, and I would rather say a hard thing early than let it sit.',
      'I expect our families to know us both well, and to leave the daily decisions to us.',
    ],
    interestedInYou: true,
    replies: ['Salaam. I read your words and I would like to hear how an ordinary week looks for you.', 'Would you want our families to meet early, or after we have talked for a while?'],
  },
  {
    key: 'p2',
    age: 31,
    ageAsk: ages('preference', 28, 32),
    answers: { timeline: 't-two', children: 'c-open', practice: 'p-build', city: 'mpls', work: 'w-home', household: 'h-open' },
    asks: asks({
      timeline: ask(['t-year', 't-two', 't-later'], 'requirement'),
      children: ask(['c-want', 'c-open'], 'preference'),
      practice: any(),
      city: ask(['mpls', 'toronto'], 'requirement'),
      work: ask(['w-work', 'w-either'], 'preference'),
      household: any(),
    }),
    words: [
      'I am looking for someone kind and patient who wants to build slowly.',
      'I like to plan, and I like to be asked before the plan changes.',
      'Our families should be welcome. We should decide together how often.',
    ],
    interestedInYou: false,
    replies: ['Salaam. What made you want to write that first answer the way you did?', 'I would like to talk about timing before anything else.'],
  },
  {
    key: 'p3',
    age: 27,
    ageAsk: anyAge,
    answers: { timeline: 't-two', children: 'c-open', practice: 'p-occasional', city: 'toronto', work: 'w-home', household: 'h-family' },
    asks: asks({
      timeline: ask(['t-year', 't-two'], 'preference'),
      children: ask(['c-want', 'c-open'], 'requirement'),
      practice: ask(['p-steady', 'p-build'], 'preference'),
      city: any(),
      work: ask(['w-either', 'w-home'], 'preference'),
      household: ask(['h-open', 'h-family'], 'preference'),
    }),
    words: [
      'I am close to my family and I want a marriage that includes them without being run by them.',
      'I am not rushing, and I am not waiting for a perfect version of anyone either.',
      'I expect my family to be part of our life, and I expect us to make our own decisions.',
    ],
    interestedInYou: true,
    replies: ['Salaam. Where do you see yourself living, and how fixed is that?', 'My family would want to know your family. How do you feel about that?'],
  },
  {
    key: 'p4',
    age: 34,
    ageAsk: ages('requirement', 30, 40),
    answers: { timeline: 't-later', children: 'c-open', practice: 'p-occasional', city: 'mpls', work: 'w-home', household: 'h-open' },
    asks: asks({
      timeline: ask(['t-two', 't-later', 't-unsure'], 'requirement'),
      children: ask(['c-open', 'c-none'], 'preference'),
      practice: any(),
      city: ask(['mpls', 'london'], 'requirement'),
      work: any(),
      household: ask(['h-open', 'h-family'], 'preference'),
    }),
    words: [
      'I have taken my time, and I would like to keep a pace that suits both of us.',
      'I practise when I can and I am honest about the weeks I do not.',
      'I want to be known before I am introduced to anyone’s family.',
    ],
    interestedInYou: true,
    replies: ['Salaam. I would like to know what a good pace feels like to you.', 'What would you want to have in place before either of us meets the other’s family?'],
  },
  {
    key: 'p5',
    age: 38,
    ageAsk: ages('requirement', 33, 45),
    answers: { timeline: 't-year', children: 'c-want', practice: 'p-steady', city: 'mpls', work: 'w-work', household: 'h-own' },
    asks: asks({
      timeline: ask(['t-year', 't-two'], 'preference'),
      children: any(),
      practice: ask(['p-steady'], 'requirement'),
      city: ask(['mpls'], 'preference'),
      work: any(),
      household: any(),
    }),
    words: [
      'Prayer shapes my day, and I want a partner for whom it shapes theirs.',
      'I have a steady job and a home of my own, and I am ready to share both.',
      'I would like a marriage that is quiet, and busy only with the right things.',
    ],
    interestedInYou: false,
    replies: ['Salaam. What do your mornings look like?', 'I would like to hear what you are hoping the first year looks like.'],
  },
]

const NAMES: Record<Side, string[]> = {
  woman: ['Amina', 'Sahra', 'Ladan', 'Ifrah', 'Fadumo'],
  man: ['Abdi', 'Liban', 'Yusuf', 'Hassan', 'Said'],
}

/** The made-up people a tester on `viewer`'s side meets: the other side, in a fixed order. */
export function peopleFor(viewer: Side): Person[] {
  const side: Side = viewer === 'woman' ? 'man' : 'woman'
  return TEMPLATES.map((t, i) => ({
    id: `${side}-${t.key}`,
    firstName: NAMES[side][i],
    side,
    age: t.age,
    ageAsk: t.ageAsk,
    answers: t.answers,
    asks: t.asks,
    words: t.words,
    interestedInYou: t.interestedInYou,
    replies: t.replies,
  }))
}

/** He or she, for text written once for both sides. `{He}` capitalises. */
export function fill(text: string, side: Side, name: string): string {
  const w = side === 'woman'
  return text
    .replaceAll('{name}', name)
    .replaceAll('{He}', w ? 'She' : 'He')
    .replaceAll('{he}', w ? 'she' : 'he')
    .replaceAll('{His}', w ? 'Her' : 'His')
    .replaceAll('{his}', w ? 'her' : 'his')
    .replaceAll('{him}', w ? 'her' : 'him')
}

/** Sample answer sets. Each is a whole tester: answers, asks and written answers. */
export const SCENARIOS: Scenario[] = [
  {
    id: 'three',
    title: 'Three suggestions',
    expect: 'Three people meet everyone’s requirements. One person is left out by your requirement and by their own; one is left out by their requirement alone.',
    name: 'Maryan',
    age: 30,
    // A preference: nobody is left out for their age, and a person outside 28 to 34 is shown as different.
    ageAsk: ages('preference', 28, 34),
    answers: { timeline: 't-year', children: 'c-want', practice: 'p-build', city: 'mpls', work: 'w-work', household: 'h-own' },
    asks: asks({
      timeline: ask(['t-year', 't-two'], 'requirement'),
      children: ask(['c-want', 'c-open'], 'requirement'),
      practice: ask(['p-steady', 'p-build'], 'preference'),
      city: ask(['mpls'], 'preference'),
      work: ask(['w-work', 'w-either'], 'preference'),
      household: ask(['h-own', 'h-open'], 'preference'),
    }),
    words: [
      'I want a marriage that is calm and honest, with room for both of us to keep growing.',
      'I work and I like my work. I would want that to be understood from the start.',
      'I would like our families to be close, and to stay out of the small decisions.',
    ],
  },
  {
    id: 'one',
    title: 'One suggestion',
    expect: 'One person meets everyone’s requirements. The rest are left out: most by your requirements, and one by both sides’.',
    name: 'Maryan',
    age: 35,
    // A requirement. The four people it leaves out were already left out by another requirement.
    ageAsk: ages('requirement', 32, 40),
    answers: { timeline: 't-later', children: 'c-open', practice: 'p-steady', city: 'mpls', work: 'w-either', household: 'h-open' },
    asks: asks({
      timeline: ask(['t-later', 't-unsure'], 'requirement'),
      children: ask(['c-open', 'c-none'], 'requirement'),
      practice: ask(['p-steady'], 'preference'),
      city: ask(['mpls'], 'requirement'),
      work: any(),
      household: ask(['h-open', 'h-own'], 'preference'),
    }),
    words: [
      'I am not in a hurry. I would rather be sure than be quick.',
      'My practice is steady and it is the base of my week.',
      'I want to know someone well before I ask them to meet my family.',
    ],
  },
  {
    id: 'none',
    title: 'No suggestions',
    expect: 'No one meets everyone’s requirements. Three people are left out by your requirements; two are left out by their own. Nothing is relaxed.',
    name: 'Maryan',
    age: 33,
    // Doesn't matter: the range is not used. Her own age is still checked against what others require.
    ageAsk: anyAge,
    answers: { timeline: 't-unsure', children: 'c-none', practice: 'p-occasional', city: 'london', work: 'w-either', household: 'h-family' },
    asks: asks({
      timeline: ask(['t-year'], 'requirement'),
      children: ask(['c-want'], 'requirement'),
      practice: ask(['p-steady'], 'requirement'),
      city: ask(['london'], 'preference'),
      work: any(),
      household: any(),
    }),
    words: [
      'I know what I need, and I have kept it short.',
      'I have thought about this for a long time and I do not want to waste anyone’s.',
      'Ask me anything you need to ask.',
    ],
  },
]

export const scenarioOf = (id: ScenarioId): Scenario => SCENARIOS.find((s) => s.id === id)!

/** Names for the tester, by side, when a sample scenario fills the form. */
export const SAMPLE_NAME: Record<Side, string> = { woman: 'Maryan', man: 'Guled' }

/**
 * A scenario's answers and asks as one comparable string. The pair texts below
 * hold only while this equals the tester's own (src/prototype/match/suggest.ts
 * `fingerprint`): edit an answer and the fixed text is shown as unavailable.
 */
export function scenarioFingerprint(id: ScenarioId, side: Side): string {
  const s = scenarioOf(id)
  return fingerprint(side, s.answers, s.asks, s.ageAsk)
}

/**
 * The tester's own age is not in it, and neither is the name or the words: no text mentions them.
 * The ages they would consider are, because a text says whether a person is inside them.
 */
export function fingerprint(side: Side, answers: Partial<Answers>, a: Partial<Asks>, ageAsk: AgeAsk): string {
  return JSON.stringify([
    side,
    CRITERION_IDS.map((c) => answers[c] ?? null),
    CRITERION_IDS.map((c) => (a[c] ? [a[c]!.firm, [...a[c]!.accept].sort()] : null)),
    ageAsk.firm === 'any' ? ['any'] : [ageAsk.firm, ageAsk.min, ageAsk.max],
  ])
}

/**
 * What a hand-written summary claims, point by point, so a test can hold it against the
 * answers. This is metadata the writer keeps in step with the prose: it catches a text that
 * drifts from the data it was written for (a point named that is not claimed, a claim the
 * answers do not support), and it is not a proof that every sentence is accurate. Each
 * text was also read against the scenario's answers when it was written
 * (docs/MATCH-PROTOTYPE.md records how).
 */
export interface PairFacts {
  /** Points the summary says the two answered identically. */
  same: CriterionId[]
  /** Points where the answers differ, but the person's is one the tester said would work. */
  workable: CriterionId[]
  /** Points marked a preference where the person's answer is not one the tester said would work (age included). All of them are named. */
  differs: PointId[]
}

/**
 * A pointer to one answer a line of the fixed text was written from: a point (the
 * tester’s answer, the other person’s, or both), or one of the other person’s written
 * answers. The words are resolved from the data when shown, never copied here, and a
 * written answer can only be the other person’s: the tester’s own words are not cited.
 */
export type Ref = { who: 'you' | 'them'; pick: CriterionId } | { who: 'them'; words: 0 | 1 | 2 }

export interface PairQuestion {
  text: string
  /** What the question was written from, or `general`: it draws on no answer of either person. */
  basis: Ref[] | 'general'
}

export interface PairText {
  /** Two sentences, standing in for an AI summary. Written only from the scenario's structured answers. */
  summary: string
  /** Which of the other person’s written answers the summary draws on. Empty: it uses structured answers only. */
  summaryWords: (0 | 1 | 2)[]
  /** Three questions, standing in for AI-suggested questions. */
  questions: PairQuestion[]
  facts: PairFacts
}

const you = (pick: CriterionId): Ref => ({ who: 'you', pick })
const them = (pick: CriterionId): Ref => ({ who: 'them', pick })
const theirWords = (words: 0 | 1 | 2): Ref => ({ who: 'them', words })
const both = (pick: CriterionId): Ref[] => [you(pick), them(pick)]
const general = 'general' as const

/** Fixed pair texts: [scenario][person template key]. Only people who are eligible in a scenario have one. */
export const PAIR_TEXT: Partial<Record<ScenarioId, Record<string, PairText>>> = {
  three: {
    p1: {
      summary:
        'You and {name} give the same answers on timing, children, city, work and household, and you both want to marry within a year. On practice, {name} chose “Prayer is steady and central to my days”, a steadier answer than your “I am building the habit”.',
      summaryWords: [],
      questions: [
        { text: 'What does prayer look like in an ordinary week for each of you?', basis: both('practice') },
        { text: 'What would you want settled before you marry, and what can wait?', basis: general },
        { text: '{name} wrote about families knowing you both while leaving daily decisions to the couple. What would that involvement look like for each of you?', basis: [theirWords(2)] },
      ],
      facts: { same: ['timeline', 'children', 'city', 'work', 'household'], workable: ['practice'], differs: [] },
    },
    p2: {
      summary:
        '{name} is a little later on timing (one to two years, where you said within a year) and open on children where you said you want them. The one difference you marked as a preference is work: {name} plans to be at home and you plan to work.',
      summaryWords: [],
      questions: [
        { text: '{name} chose “I plan to be at home”. What would you want to understand about that day to day?', basis: [them('work')] },
        { text: 'You chose different marriage timelines. What timing could work for both of you?', basis: both('timeline') },
        { text: 'What would you each want to decide together about children?', basis: both('children') },
      ],
      facts: { same: [], workable: ['timeline', 'children'], differs: ['work'] },
    },
    p3: {
      summary:
        '{name} meets your requirements on timing and children. {He} differs from your preferences on age, practice, city, work and household: {he} is 27, outside the 28 to 34 you preferred, and lives in Toronto, where you do not.',
      summaryWords: [],
      questions: [
        { text: 'Which of these differences would you each want to talk through first?', basis: general },
        { text: 'You live in different cities. How does each of you see where you would live?', basis: both('city') },
        { text: '{name} chose “With family” and you chose “Our own home” for where to live at first. What does each of you picture?', basis: both('household') },
      ],
      facts: { same: [], workable: ['timeline', 'children'], differs: ['age', 'practice', 'city', 'work', 'household'] },
    },
  },
  one: {
    p4: {
      summary:
        'You and {name} give the same answers on timing, children, city and household. On practice, {name} chose “I practise occasionally”, where you chose “Prayer is steady and central to my days”, and you marked practice as a preference.',
      summaryWords: [],
      questions: [
        { text: 'What does practice look like for you in an ordinary week?', basis: [them('practice'), theirWords(1)] },
        { text: 'What would each of you want your partner to understand about your practice?', basis: both('practice') },
        { text: '{name} wrote about “a pace that suits both of us”. What does a good pace look like for you?', basis: [...both('timeline'), theirWords(0)] },
      ],
      facts: { same: ['timeline', 'children', 'city', 'household'], workable: [], differs: ['practice'] },
    },
  },
}

/** The text for one pair, or null when the scenario has none for this person. Null is also what `tests` use for the unavailable state. */
export function pairTextFor(scenario: ScenarioId, personId: string): PairText | null {
  const key = personId.split('-')[1]
  return PAIR_TEXT[scenario]?.[key] ?? null
}
