import type { CriterionId } from './types'

export interface Option {
  id: string
  label: string
}

export interface Criterion {
  id: CriterionId
  group: 'intentions' | 'practical'
  /** The name of the point, as a heading. */
  name: string
  /** About you. */
  question: string
  /** What would work for you. */
  asks: string
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
    asks: 'Which timing would work for you?',
    options: [
      { id: 't-year', label: 'Within a year' },
      { id: 't-two', label: 'In one to two years' },
      { id: 't-later', label: 'Later than that' },
      { id: 't-unsure', label: 'I am not sure yet' },
    ],
  },
  {
    id: 'children',
    group: 'intentions',
    name: 'Children',
    question: 'Where are you on children?',
    asks: 'Which would work for you?',
    options: [
      { id: 'c-want', label: 'I want children' },
      { id: 'c-open', label: 'I am open to them, and would decide together' },
      { id: 'c-none', label: 'I do not want children' },
    ],
  },
  {
    id: 'practice',
    group: 'intentions',
    name: 'Practice',
    question: 'How would you describe your practice day to day?',
    asks: 'Which would work for you?',
    options: [
      { id: 'p-steady', label: 'Prayer is steady and central to my days' },
      { id: 'p-build', label: 'I am building the habit' },
      { id: 'p-occasional', label: 'I practise occasionally' },
    ],
  },
  {
    id: 'city',
    group: 'practical',
    name: 'City',
    question: 'Where do you live?',
    asks: 'Which cities would work for you?',
    options: [
      { id: 'mpls', label: 'Minneapolis–St. Paul' },
      { id: 'london', label: 'London' },
      { id: 'toronto', label: 'Toronto' },
    ],
  },
  {
    id: 'work',
    group: 'practical',
    name: 'Work',
    question: 'After marriage, what do you expect for your own work?',
    asks: 'Which would work for you?',
    options: [
      { id: 'w-work', label: 'I plan to work' },
      { id: 'w-either', label: 'I am open to either' },
      { id: 'w-home', label: 'I plan to be at home' },
    ],
  },
  {
    id: 'household',
    group: 'practical',
    name: 'Household',
    question: 'Where would you live at first?',
    asks: 'Which would work for you?',
    options: [
      { id: 'h-own', label: 'Our own home' },
      { id: 'h-open', label: 'Open to living with family for a time' },
      { id: 'h-family', label: 'With family' },
    ],
  },
]

export const criterionOf = (id: CriterionId): Criterion => CRITERIA.find((c) => c.id === id)!

export function labelOf(id: CriterionId, option: string): string {
  return criterionOf(id).options.find((o) => o.id === option)?.label ?? option
}

/** Words for the point, lower case, for use inside a sentence. */
export const nameOf = (id: CriterionId): string => criterionOf(id).name

/**
 * The three written prompts. `label` is what the tester is asked; `short` is the small
 * heading over the same answer when another person's words are read.
 */
export const PROMPTS = [
  { label: 'What are you looking for in a marriage?', short: 'Looking for', required: true },
  { label: 'What should the person you marry know about how you live?', short: 'How they live', required: true },
  { label: 'How involved do you expect your families to be? (optional)', short: 'Families', required: false },
] as const
