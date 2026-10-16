import { CRITERION_IDS, type Answers, type Ask, type Asks, type CriterionId, type Firmness, type Person, type Scenario, type ScenarioId, type Side } from './types'

/**
 * Everything made up in the matching prototype (docs/MATCH-PROTOTYPE.md).
 *
 * Five people per side, with fictional first names, adult fictional ages and
 * answers chosen so that the three sample scenarios below produce three, one
 * and no suggestions. Nothing here is real, and nothing is relaxed to fill a
 * screen: the scenario test (tests/prototype/suggest.test.ts) pins the counts.
 *
 * The pair texts at the bottom are fixed text standing in for what an AI model
 * might write. They are written for one sample scenario each and are shown only
 * while the tester's answers still match that scenario.
 */

const ask = (accept: string[], firm: Firmness): Ask => ({ accept, firm })
const any = (): Ask => ask([], 'any')
const asks = (a: Record<CriterionId, Ask>): Asks => a

interface Template {
  key: string
  age: number
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
      'Tell me what an honest disagreement looks like for you.',
    ],
    interestedInYou: true,
    replies: ['Salaam. Where do you see yourself living, and how fixed is that?', 'My family would want to know your family. How do you feel about that?'],
  },
  {
    key: 'p4',
    age: 34,
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
  return fingerprint(side, s.answers, s.asks)
}

export function fingerprint(side: Side, answers: Partial<Answers>, a: Partial<Asks>): string {
  return JSON.stringify([
    side,
    CRITERION_IDS.map((c) => answers[c] ?? null),
    CRITERION_IDS.map((c) => (a[c] ? [a[c]!.firm, [...a[c]!.accept].sort()] : null)),
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
  /** Points marked a preference where the person's answer is not one the tester said would work. All of them are named. */
  differs: CriterionId[]
}

export interface PairText {
  /** Two sentences, standing in for an AI summary. Written only from the scenario's structured answers. */
  summary: string
  /** Three questions, standing in for AI-suggested questions. */
  questions: string[]
  facts: PairFacts
}

/** Fixed pair texts: [scenario][person template key]. Only people who are eligible in a scenario have one. */
export const PAIR_TEXT: Partial<Record<ScenarioId, Record<string, PairText>>> = {
  three: {
    p1: {
      summary:
        'You and {name} give the same answers on timing, children, city, work and household, and you both want to marry within a year. {He} describes {his} practice as steadier than yours.',
      questions: [
        'What does a week of prayer and rest look like in the home you each imagine?',
        'What would you want settled before you marry, and what can wait?',
        'What do you each want your families to know about you, and when?',
      ],
      facts: { same: ['timeline', 'children', 'city', 'work', 'household'], workable: ['practice'], differs: [] },
    },
    p2: {
      summary:
        '{name} is a little later on timing (one to two years, where you said within a year) and open on children where you said you want them. The one difference you marked as a preference is work: {name} plans to be at home and you plan to work.',
      questions: [
        'What does being at home mean to you: always, for a time, or while children are small?',
        'What would you want in place before the wedding, given your different timing?',
        'What would you each want to decide together about children?',
      ],
      facts: { same: [], workable: ['timeline', 'children'], differs: ['work'] },
    },
    p3: {
      summary:
        '{name} meets your requirements on timing and children. {He} differs from your preferences on practice, city, work and household, and lives in Toronto, where you do not.',
      questions: [
        'Which of these differences would you each want to talk through first?',
        'Where would each of you want to live, and what would you give up for it?',
        'How do you each picture daily life with family nearby?',
      ],
      facts: { same: [], workable: ['timeline', 'children'], differs: ['practice', 'city', 'work', 'household'] },
    },
  },
  one: {
    p4: {
      summary:
        'You and {name} give the same answers on timing, children, city and household. {He} describes {his} practice as occasional, where you describe yours as steady, which you marked as a preference.',
      questions: [
        'What does practice look like for you in an ordinary week?',
        'What would you each want from the other around prayer and the home?',
        'What would make a longer timeline feel right to you both?',
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
