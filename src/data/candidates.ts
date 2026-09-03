import type { Gender } from '../types'

/**
 * Mock candidates for discovery. These are intentionally DEPTH-FIRST — values,
 * intentions, and character lead; photos are blurred until mutual interest.
 * In production this is a query against verified, serious members; the shape and
 * the alignment-over-looks principle stay the same.
 */
export interface Candidate {
  id: string
  name: string
  age: number
  gender: Gender
  /** Scene id (see data/scenes.ts). */
  scene: string
  occupation: string
  /** Practice level id, aligned with intake 'practice' option ids. */
  practice: 'devout' | 'consistent' | 'returning' | 'cultural'
  /** How central faith is, 1–5 (aligned with 'faith-role'). */
  faithRole: number
  /** Timeline id, aligned with intake 'timeline' option ids. */
  timeline: 'within-1' | '1-2' | '3-plus' | 'exploring'
  /** Family involvement id, aligned with 'family-role'. */
  familyRole: 'central' | 'guided' | 'informed' | 'private'
  /** Children stance id, aligned with 'children'. */
  children: 'want' | 'open' | 'unsure' | 'no'
  /** How they'd live — ids aligned with intake's `livingQuestions`. */
  household: 'with-family' | 'near-family' | 'separate' | 'flexible'
  work: 'both' | 'seasons' | 'one-home' | 'unsure'
  moneyHome: 'expected' | 'some' | 'little' | 'unsure'
  /** Character value tags (overlap with intake 'value-most' tags). */
  values: string[]
  /** Partnership tags (overlap with 'partnership-style' tags). */
  partnership: string[]
  bio: string
  prompts: { q: string; a: string }[]
  trust: { verified: boolean; seriousIntention: boolean; waliFriendly: boolean }
  /** Whether this curated candidate returns interest (not everyone does — realism). */
  reciprocates: boolean
}

const men: Candidate[] = [
  {
    id: 'yusuf',
    name: 'Yusuf',
    age: 30,
    gender: 'man',
    scene: 'twin-cities',
    occupation: 'Software engineer',
    practice: 'consistent',
    faithRole: 5,
    timeline: '1-2',
    familyRole: 'guided',
    children: 'want',
    household: 'near-family',
    work: 'both',
    moneyHome: 'expected',
    values: ['Taqwa', 'Loyalty', 'Kindness'],
    partnership: ['Partnership', 'Gentle'],
    bio: 'Praying my five, building a calm life, and trying to be the kind of man my future kids would be proud of.',
    prompts: [
      { q: 'A marriage I admire', a: 'My grandparents — sixty years, and he still lights up when she walks in. That patience is the goal.' },
      { q: 'How I handle a disagreement', a: 'I cool down, then I come back and actually listen. Silence isn’t a punishment; it’s just me gathering myself.' },
    ],
    trust: { verified: true, seriousIntention: true, waliFriendly: true },
    reciprocates: true,
  },
  {
    id: 'abdirahman',
    name: 'Abdirahman',
    age: 33,
    gender: 'man',
    scene: 'twin-cities',
    occupation: 'Pharmacist',
    practice: 'devout',
    faithRole: 5,
    timeline: 'within-1',
    familyRole: 'central',
    children: 'want',
    household: 'with-family',
    work: 'one-home',
    moneyHome: 'expected',
    values: ['Taqwa', 'Maturity', 'Loyalty'],
    partnership: ['Provider', 'Traditional'],
    bio: 'Ready, not rushing. I want a home where deen comes first and laughter comes a close second.',
    prompts: [
      { q: 'My family will tell you', a: 'That I’m the one everyone calls when things go wrong. I show up.' },
      { q: 'Non-negotiable for me', a: 'Honesty. I’d rather a hard truth today than a comfortable lie I find out about later.' },
    ],
    trust: { verified: true, seriousIntention: true, waliFriendly: true },
    reciprocates: true,
  },
  {
    id: 'khalid',
    name: 'Khalid',
    age: 28,
    gender: 'man',
    scene: 'columbus',
    occupation: 'Teacher & part-time imam',
    practice: 'devout',
    faithRole: 5,
    timeline: '1-2',
    familyRole: 'guided',
    children: 'want',
    household: 'near-family',
    work: 'seasons',
    moneyHome: 'expected',
    values: ['Taqwa', 'Depth', 'Kindness'],
    partnership: ['Partnership', 'Gentle'],
    bio: 'I teach kids by day and study by night. Looking for a partner to grow with, in this life and hopefully the next.',
    prompts: [
      { q: 'What I bring', a: 'Patience, a steady income, and a genuinely calm home. I don’t bring drama.' },
      { q: 'A green flag in me', a: 'I’m close to my mother and I treat her well — ask her.' },
    ],
    trust: { verified: true, seriousIntention: true, waliFriendly: true },
    reciprocates: true,
  },
  {
    id: 'omar',
    name: 'Omar',
    age: 31,
    gender: 'man',
    scene: 'twin-cities',
    occupation: 'Small business owner',
    practice: 'consistent',
    faithRole: 4,
    timeline: '1-2',
    familyRole: 'informed',
    children: 'open',
    household: 'separate',
    work: 'both',
    moneyHome: 'some',
    values: ['Ambition', 'Loyalty', 'Humor'],
    partnership: ['Ambitious', 'Partnership'],
    bio: 'Built my business from nothing. Now I want to build a family with someone who has her own dreams too.',
    prompts: [
      { q: 'How I lead', a: 'By clarity, not control. I’ll always tell you where I stand and where I think we’re going.' },
      { q: 'Weekend with me', a: 'Fajr, a long walk by the lake, and somewhere good to eat. I keep it simple.' },
    ],
    trust: { verified: true, seriousIntention: true, waliFriendly: false },
    reciprocates: false,
  },
  {
    id: 'bilal',
    name: 'Bilal',
    age: 27,
    gender: 'man',
    scene: 'toronto',
    occupation: 'Nurse',
    practice: 'returning',
    faithRole: 4,
    timeline: 'exploring',
    familyRole: 'guided',
    children: 'want',
    household: 'with-family',
    work: 'seasons',
    moneyHome: 'expected',
    values: ['Kindness', 'Maturity', 'Loyalty'],
    partnership: ['Gentle', 'Partnership'],
    bio: 'Finding my way back to my deen and taking it seriously. I’d love someone gentle to walk it with.',
    prompts: [
      { q: 'Something I’m working on', a: 'Being more consistent with my prayers. I’m honest about where I am, not where I pretend to be.' },
      { q: 'What makes me feel at home', a: 'Hooyo’s cooking and a partner who feels easy to be quiet with.' },
    ],
    trust: { verified: true, seriousIntention: true, waliFriendly: true },
    reciprocates: true,
  },
  {
    id: 'ahmed',
    name: 'Ahmed',
    age: 29,
    gender: 'man',
    scene: 'stockholm',
    occupation: 'Primary school teacher',
    practice: 'devout',
    faithRole: 5,
    timeline: 'within-1',
    familyRole: 'central',
    children: 'want',
    household: 'near-family',
    work: 'both',
    moneyHome: 'expected',
    values: ['Taqwa', 'Kindness', 'Loyalty'],
    partnership: ['Traditional', 'Gentle'],
    bio: 'Rinkeby raised me, the masjid steadied me. I want a home where the athan is normal and the laughter is loud.',
    prompts: [
      { q: 'What my week looks like', a: 'School, gym, halaqa on Thursdays, hooyo’s on Sundays. I like a life with rhythm.' },
      { q: 'Non-negotiable for me', a: 'Softness. The dunya is hard enough — home should not be.' },
    ],
    trust: { verified: true, seriousIntention: true, waliFriendly: true },
    reciprocates: true,
  },
  {
    id: 'zakariya',
    name: 'Zakariya',
    age: 34,
    gender: 'man',
    scene: 'london',
    occupation: 'Chartered accountant',
    practice: 'consistent',
    faithRole: 4,
    timeline: '1-2',
    familyRole: 'guided',
    children: 'open',
    household: 'separate',
    work: 'both',
    moneyHome: 'little',
    values: ['Maturity', 'Depth', 'Loyalty'],
    partnership: ['Partnership', 'Ambitious'],
    bio: 'Thirty-four and unbothered by the aunties’ timeline — I waited to do this properly, not quickly.',
    prompts: [
      { q: 'A lesson that cost me', a: 'That “almost right” wastes more years than “not yet.” I don’t do almost anymore.' },
      { q: 'Weekend with me', a: 'A long run by the Thames, a bookshop, and dinner where they know my order.' },
    ],
    trust: { verified: true, seriousIntention: true, waliFriendly: true },
    reciprocates: true,
  },
]

const women: Candidate[] = [
  {
    id: 'iman',
    name: 'Iman',
    age: 26,
    gender: 'woman',
    scene: 'twin-cities',
    occupation: 'Dentist',
    practice: 'consistent',
    faithRole: 5,
    timeline: '1-2',
    familyRole: 'guided',
    children: 'want',
    household: 'near-family',
    work: 'both',
    moneyHome: 'some',
    values: ['Taqwa', 'Kindness', 'Depth'],
    partnership: ['Partnership', 'Gentle'],
    bio: 'Soft-hearted but clear-headed. I know what I want and I’m not in a rush to settle for less.',
    prompts: [
      { q: 'My non-negotiable', a: 'A man who is gentle with the people who can’t do anything for him.' },
      { q: 'What family means to me', a: 'Everything — I want mine involved, and I want to love yours like my own.' },
    ],
    trust: { verified: true, seriousIntention: true, waliFriendly: true },
    reciprocates: true,
  },
  {
    id: 'sagal',
    name: 'Sagal',
    age: 29,
    gender: 'woman',
    scene: 'twin-cities',
    occupation: 'Accountant',
    practice: 'consistent',
    faithRole: 4,
    timeline: 'within-1',
    familyRole: 'guided',
    children: 'want',
    household: 'near-family',
    work: 'seasons',
    moneyHome: 'expected',
    values: ['Loyalty', 'Humor', 'Maturity'],
    partnership: ['Partnership', 'Ambitious'],
    bio: 'I’ve done the inner work and I’m ready for something real. Looking for a steady, God-conscious man.',
    prompts: [
      { q: 'A green flag in me', a: 'I say what I mean. You’ll never have to guess where you stand with me.' },
      { q: 'What I bring', a: 'A calm, loyal, funny home — and a partner who’ll always have your back.' },
    ],
    trust: { verified: true, seriousIntention: true, waliFriendly: true },
    reciprocates: true,
  },
  {
    id: 'nasteexo',
    name: 'Nasteexo',
    age: 31,
    gender: 'woman',
    scene: 'columbus',
    occupation: 'Social worker',
    practice: 'devout',
    faithRole: 5,
    timeline: '1-2',
    familyRole: 'central',
    children: 'want',
    household: 'with-family',
    work: 'seasons',
    moneyHome: 'expected',
    values: ['Taqwa', 'Kindness', 'Loyalty'],
    partnership: ['Traditional', 'Gentle'],
    bio: 'Deen first, always. I want a marriage that brings us both closer to Allah and to peace.',
    prompts: [
      { q: 'How I handle conflict', a: 'Gently and directly. I don’t hold grudges, but I do expect to be heard.' },
      { q: 'My family will tell you', a: 'That I’m patient and that I love deeply once I trust.' },
    ],
    trust: { verified: true, seriousIntention: true, waliFriendly: true },
    reciprocates: true,
  },
  {
    id: 'hani',
    name: 'Hani',
    age: 27,
    gender: 'woman',
    scene: 'london',
    occupation: 'Graphic designer',
    practice: 'consistent',
    faithRole: 4,
    timeline: 'exploring',
    familyRole: 'informed',
    children: 'open',
    household: 'separate',
    work: 'both',
    moneyHome: 'some',
    values: ['Depth', 'Humor', 'Kindness'],
    partnership: ['Ambitious', 'Partnership'],
    bio: 'Creative, curious, and serious about marriage when it’s right. I lead my own choices, with my family close.',
    prompts: [
      { q: 'Weekend with me', a: 'A gallery, good coffee, and a long talk about everything and nothing.' },
      { q: 'What I’m looking for', a: 'A thoughtful man with direction — someone I can build with, not lean on.' },
    ],
    trust: { verified: true, seriousIntention: true, waliFriendly: false },
    reciprocates: false,
  },
  {
    id: 'amina',
    name: 'Amina',
    age: 30,
    gender: 'woman',
    scene: 'twin-cities',
    occupation: 'Teacher',
    practice: 'consistent',
    faithRole: 5,
    timeline: '1-2',
    familyRole: 'guided',
    children: 'want',
    household: 'near-family',
    work: 'both',
    moneyHome: 'expected',
    values: ['Kindness', 'Loyalty', 'Taqwa'],
    partnership: ['Gentle', 'Partnership'],
    bio: 'Warm, grounded, and ready to build a gentle, faithful home with the right person.',
    prompts: [
      { q: 'What makes me feel safe', a: 'Consistency. A man whose words and actions match, every time.' },
      { q: 'My non-negotiable', a: 'Kindness — to me, to my family, and to people who can offer him nothing.' },
    ],
    trust: { verified: true, seriousIntention: true, waliFriendly: true },
    reciprocates: true,
  },
  {
    id: 'leyla',
    name: 'Leyla',
    age: 28,
    gender: 'woman',
    scene: 'toronto',
    occupation: 'Early-childhood educator',
    practice: 'consistent',
    faithRole: 4,
    timeline: '1-2',
    familyRole: 'guided',
    children: 'want',
    household: 'flexible',
    work: 'both',
    moneyHome: 'some',
    values: ['Kindness', 'Humor', 'Loyalty'],
    partnership: ['Gentle', 'Partnership'],
    bio: 'I spend my days with four-year-olds, so I can spot a tantrum in a grown man from across the room.',
    prompts: [
      { q: 'A green flag in me', a: 'I laugh easily and forgive quickly — but I remember how you treat the waiter.' },
      { q: 'What family means to me', a: 'Sunday lunches that run four hours. If that sounds like heaven, keep reading.' },
    ],
    trust: { verified: true, seriousIntention: true, waliFriendly: true },
    reciprocates: true,
  },
  {
    id: 'ubah',
    name: 'Ubah',
    age: 30,
    gender: 'woman',
    scene: 'stockholm',
    occupation: 'Midwife',
    practice: 'devout',
    faithRole: 5,
    timeline: 'within-1',
    familyRole: 'central',
    children: 'want',
    household: 'near-family',
    work: 'one-home',
    moneyHome: 'expected',
    values: ['Taqwa', 'Kindness', 'Maturity'],
    partnership: ['Traditional', 'Gentle'],
    bio: 'I catch babies for a living and pray fajr before the city wakes. Ready for my own chapter now, bi’idhnillah.',
    prompts: [
      { q: 'What steadies me', a: 'Fajr, my sisters, and knowing exactly what I will not compromise on.' },
      { q: 'My non-negotiable', a: 'A man whose deen shows in how he treats people when no one is watching.' },
    ],
    trust: { verified: true, seriousIntention: true, waliFriendly: true },
    reciprocates: true,
  },
]

/** Candidates are the opposite gender of the seeker. */
export function candidatesFor(gender?: Gender): Candidate[] {
  if (gender === 'man') return women
  return men
}

export function getCandidate(id: string): Candidate | undefined {
  return [...men, ...women].find((c) => c.id === id)
}
