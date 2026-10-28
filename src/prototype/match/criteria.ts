import type { CriterionId, Firmness, PointId } from './types'

export interface Option {
  id: string
  /** The answer in the first person: what a person says about themselves. */
  label: string
  /** The same answer as something wanted in a partner. Display only: eligibility runs on `id`. */
  partner: string
}

export interface Criterion {
  id: CriterionId
  group: 'intentions' | 'practical'
  /** The name of the point, as a heading. */
  name: string
  /** About you. */
  question: string
  options: Option[]
}

export const GROUPS: { id: Criterion['group']; title: string }[] = [
  { id: 'intentions', title: 'What you are looking for' },
  { id: 'practical', title: 'How life would work' },
]

/** The six points. Provisional prototype choices, held as data so they are cheap to change. */
export const CRITERIA: Criterion[] = [
  {
    id: 'timeline',
    group: 'intentions',
    name: 'Timing',
    question: 'When would you like to be married?',
    options: [
      { id: 't-year', label: 'Within a year', partner: 'A partner who wants to marry within a year' },
      { id: 't-two', label: 'In one to two years', partner: 'A partner who wants to marry in one to two years' },
      { id: 't-later', label: 'Later than that', partner: 'A partner who wants to marry more than two years from now' },
      { id: 't-unsure', label: 'I am not sure yet', partner: 'A partner who is not sure yet' },
    ],
  },
  {
    id: 'children',
    group: 'intentions',
    name: 'Children',
    question: 'Where are you on children?',
    options: [
      { id: 'c-want', label: 'I want children', partner: 'A partner who wants children' },
      { id: 'c-open', label: 'I am open to them, and would decide together', partner: 'A partner who is open to children, and would decide together' },
      { id: 'c-none', label: 'I do not want children', partner: 'A partner who does not want children' },
    ],
  },
  {
    id: 'practice',
    group: 'intentions',
    name: 'Practice',
    question: 'How would you describe your practice day to day?',
    options: [
      { id: 'p-steady', label: 'Prayer is steady and central to my days', partner: 'A partner whose prayer is steady and central to their days' },
      { id: 'p-build', label: 'I am building the habit', partner: 'A partner who is building the habit of prayer' },
      { id: 'p-occasional', label: 'I practise occasionally', partner: 'A partner who practises occasionally' },
    ],
  },
  {
    id: 'city',
    group: 'practical',
    name: 'City',
    question: 'Where do you live?',
    options: [
      { id: 'mpls', label: 'Minneapolis–St. Paul', partner: 'A partner who lives in Minneapolis–St. Paul' },
      { id: 'london', label: 'London', partner: 'A partner who lives in London' },
      { id: 'toronto', label: 'Toronto', partner: 'A partner who lives in Toronto' },
    ],
  },
  {
    id: 'work',
    group: 'practical',
    name: 'Work',
    question: 'After marriage, what do you expect for your own work?',
    options: [
      { id: 'w-work', label: 'I plan to work', partner: 'A partner who plans to work' },
      { id: 'w-either', label: 'I am open to either', partner: 'A partner who is open to working or staying at home' },
      { id: 'w-home', label: 'I plan to be at home', partner: 'A partner who plans to be at home' },
    ],
  },
  {
    id: 'household',
    group: 'practical',
    name: 'Household',
    question: 'Where would you live at first?',
    options: [
      { id: 'h-own', label: 'Our own home', partner: 'A partner who wants us to have our own home' },
      { id: 'h-open', label: 'Open to living with family for a time', partner: 'A partner who is open to living with family for a time' },
      { id: 'h-family', label: 'With family', partner: 'A partner who wants to live with family' },
    ],
  },
]

export const criterionOf = (id: CriterionId): Criterion => CRITERIA.find((c) => c.id === id)!

export function labelOf(id: CriterionId, option: string): string {
  return criterionOf(id).options.find((o) => o.id === option)?.label ?? option
}

/** The answer as something wanted in a partner (the tester’s own accepted answers are shown this way). */
export function partnerLabelOf(id: CriterionId, option: string): string {
  return criterionOf(id).options.find((o) => o.id === option)?.partner ?? option
}

/** Words for the point, lower case, for use inside a sentence. */
export const nameOf = (id: CriterionId): string => criterionOf(id).name

/** The name of a point that can include or leave someone out: one of the six, or Age. */
export const pointName = (id: PointId): string => (id === 'age' ? 'Age' : nameOf(id))

/**
 * The three written prompts. `label` is what the tester is asked; `short` is the small
 * heading over the same answer when another person's words are read.
 */
export const PROMPTS = [
  { label: 'What are you looking for in a marriage?', short: 'Looking for', required: true },
  { label: 'What should the person you marry know about how you live?', short: 'How they live', required: true },
  { label: 'How involved do you expect your families to be? (optional)', short: 'Families', required: false },
] as const

/**
 * What each firmness means, written once. `full` is read at first use and again whenever the
 * person reopens the explanation; `short` is the definition that stays in view after that.
 * Nothing here chooses for the person or leans toward one of the three.
 */
export const FIRMNESS: { id: Firmness; name: string; short: string; full: string }[] = [
  {
    id: 'requirement',
    name: 'Requirement',
    short: 'People who do not fit are left out.',
    full: 'Only people who fit are shown to you. People who do not fit are left out, and they are never told.',
  },
  {
    id: 'preference',
    name: 'Preference',
    short: 'People who differ are still shown.',
    full: 'People who differ are still shown to you, and the difference is pointed out.',
  },
  {
    id: 'any',
    name: 'Doesn’t matter',
    short: 'Not used for this topic.',
    full: 'Your choice on this topic won’t exclude anyone or flag a preference difference. Your own answer is still shown and can be checked against the other person’s requirements. Your partner selections are kept but not used.',
  },
]

/** Said at first use, when the explanation is reopened, and again on Review. */
export const BOTH_WAYS = 'Requirements work both ways. If your answer does not fit someone’s requirement, you are left out of their suggestions, and you are not told.'
