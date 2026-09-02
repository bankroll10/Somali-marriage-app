import type { Candidate } from './candidates'

/**
 * The guided-conversation engine. Once two serious people connect, Niyyah keeps
 * the conversation meaningful and moving toward marriage — value-based prompts,
 * and replies that reveal character, not small talk.
 *
 * ─── Claude seam ───────────────────────────────────────────────────────────
 * The candidate replies are templated from the candidate's own values/practice
 * today. With the API, the matched person is a real human — but the *guide's*
 * suggested prompts and the "help me reply" coaching are exactly where Claude
 * stays in the loop. Same shape, richer language.
 * ───────────────────────────────────────────────────────────────────────────
 */

/** Value-based questions Niyyah suggests to keep things meaningful. */
export const guidedPrompts: string[] = [
  'What does a blessed marriage look like to you?',
  'How would you want to involve our families?',
  'Where do you see your life in five years?',
  'How do you handle it when something’s wrong?',
  'What does your deen mean to you day to day?',
  'What matters most to you in a partner?',
]

/** A short coaching note shown when the user asks the guide for help. */
export const guideTip =
  'Keep it about values and intentions — and notice whether the answers match the actions. You don’t have to fill every silence, and you’re allowed to ask the real questions early.'

function practiceLine(c: Candidate): string {
  switch (c.practice) {
    case 'devout':
      return 'I pray my five and try to live by them'
    case 'consistent':
      return 'I’m consistent in the core and always growing'
    case 'returning':
      return 'I’m finding my way back and taking it seriously'
    default:
      return 'I’m working on it honestly'
  }
}

function valueLine(c: Candidate): string {
  const v = c.values[0]?.toLowerCase()
  const map: Record<string, string> = {
    taqwa: 'For me, a marriage that brings us both closer to Allah is everything.',
    loyalty: 'For me, loyalty and steadiness matter more than anything.',
    kindness: 'For me, how someone treats people — especially those who can’t do anything for them — tells you everything.',
    maturity: 'For me, emotional maturity is the thing I value most.',
    ambition: 'For me, having direction in life matters — I want us both moving forward.',
    depth: 'For me, a thoughtful, curious mind is what keeps a marriage alive.',
    humor: 'For me, being able to laugh together is underrated.',
  }
  return map[v] ?? 'For me, character matters more than anything else.'
}

export function opener(c: Candidate, userName?: string): string {
  const hi = userName ? `Salaam, ${userName}.` : 'Salaam.'
  return `${hi} I’m really glad we both reached out — that doesn’t happen by accident.

I’ll be honest: I’m here for something real, not to pass time. ${valueLine(c)} What are you hoping to build?`
}

interface Theme {
  keywords: string[]
  reply: (c: Candidate, userName?: string) => string
}

const themes: Theme[] = [
  {
    keywords: ['deen', 'faith', 'prayer', 'salah', 'religion', 'pray', 'spiritual', 'allah'],
    reply: (c) =>
      `My deen is the center of my life — ${practiceLine(c)}. I’m not looking for someone who’s perfect, just someone who wants to keep growing toward Allah together. Where are you with yours, honestly?`,
  },
  {
    keywords: ['famil', 'wali', 'parents', 'mother', 'father', 'mum', 'hooyo', 'aabo', 'brother'],
    reply: (c) =>
      c.trust.waliFriendly
        ? `Family means everything to me. I’d want to involve our families properly — the honourable way. I see it as a blessing, not a hurdle. How do you see yours fitting in?`
        : `Family matters to me — I lead my own decisions, but I’d want our families to meet when the time is right. How involved would you want yours?`,
  },
  {
    keywords: ['kids', 'children', 'family one day', 'baby', 'babies'],
    reply: (c) =>
      c.children === 'want'
        ? `I do want children, in’sha’Allah — building a family is a big part of why I’m here. Do you feel the same?`
        : c.children === 'open'
          ? `I’m open to children with the right person and the right life. How do you feel about it?`
          : `I’m honest that I’m still figuring out the children question. I’d rather we talk about it openly than assume. Where are you?`,
  },
  {
    keywords: ['conflict', 'disagree', 'argue', 'argument', 'upset', 'fight', 'angry', 'wrong'],
    reply: () =>
      `When something’s wrong, I’d rather talk it through than let it sit. I’ll cool down first if I need to, but I don’t believe in the silent treatment — that just builds walls. How do you handle it?`,
  },
  {
    keywords: ['five years', 'future', 'life', 'plan', 'where do you see', 'long term', 'goals', 'blessed', 'marriage look'],
    reply: () =>
      `In five years? In’sha’Allah married, settled, maybe starting a family, still growing in my deen and my work. I want a partner I’m building *with*, not just living beside. What does yours look like?`,
  },
  {
    keywords: ['looking for', 'want in a', 'matters most', 'partner', 'hoping', 'build', 'serious'],
    reply: (c) =>
      `Honestly? Someone serious, kind, and God-conscious — ${c.values.slice(0, 2).join(' and ').toLowerCase()} matter most to me. Looks fade; character doesn’t. What matters most to you?`,
  },
  {
    keywords: ['work', 'job', 'career', 'ambition', 'study', 'business'],
    reply: (c) =>
      `I take my work seriously — being a ${c.occupation.toLowerCase()} keeps me grounded. But it’ll never come before my family; balance matters to me. What about you?`,
  },
  {
    keywords: ['weekend', 'fun', 'hobby', 'free time', 'relax', 'enjoy'],
    reply: () =>
      `A good weekend for me is simple — fajr, time with people I love, somewhere good to eat, maybe a long walk. I keep life calm. What about you?`,
  },
  {
    keywords: ['hi', 'hello', 'salaam', 'salam', 'how are you', 'how’s it going', 'hey'],
    reply: (_c, userName) =>
      `Wa alaykum salaam${userName ? `, ${userName}` : ''}. Alhamdulillah, I’m well — better now that we’re actually talking. Tell me something real about you.`,
  },
]

/**
 * Whole-word match. Plain `includes` meant the greeting theme's 'hi' matched
 * "I t**hi**nk honesty matters" and 'hey' matched "t**hey**", so substantive
 * questions were answered with "Wa alaykum salaam… tell me something real
 * about you" — the reply that most obviously exposes a machine.
 */
function mentions(message: string, keyword: string): boolean {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:[^a-z0-9]|$)`, 'i').test(message)
}

export function candidateReply(c: Candidate, message: string, userName?: string): string {
  const m = message.toLowerCase().replace(/[’']/g, "'")
  for (const theme of themes) {
    if (theme.keywords.some((k) => mentions(m, k.replace(/[’']/g, "'")))) {
      return theme.reply(c, userName)
    }
  }
  return `I like that you ask real questions — most people don’t. ${valueLine(c)} Tell me how you think about it?`
}
