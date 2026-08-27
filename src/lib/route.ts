import type { Gender, ModeId } from '../types'
import { defaultModeFor } from '../data/coach'

/**
 * Route a sentence to the voice best suited to answer it.
 *
 * The app used to ask people to choose between six guides before they could say
 * what happened — which means classifying your own problem while you're upset,
 * at the exact moment you have the least patience for it. You say the thing;
 * we work out who should answer.
 *
 * Rule-based and deliberately legible: the reason is shown to the user and the
 * voice can be switched in one tap, so a wrong guess costs nothing. (Same Claude
 * seam as the rest of the guide — see lib/coach.ts.)
 */

interface Rule {
  mode: ModeId | 'gendered'
  /** Said back to the user, so the routing is never a black box. */
  why: string
  patterns: RegExp
}

// Order matters: the first match wins, so the most specific topics come first.
const RULES: Rule[] = [
  {
    mode: 'islamic',
    why: 'this sounded like a question of deen',
    patterns:
      /\b(halal|haram|islam|islamic|deen|sunnah|allah|quran|istikhara|nikah|mahram|wali|imam|sheikh|masjid|pray|prayer|salah|sin|permissible|allowed)\b/i,
  },
  {
    mode: 'therapist',
    why: 'this sounded like it’s sitting heavy',
    patterns:
      /\b(anxious|anxiety|overthink|overthinking|spiral|spiralling|spiraling|panic|panicking|scared|afraid|insecure|jealous|attached|attachment|obsess|obsessing|can.?t stop|cant stop|numb|depressed|crying|hurt|heartbroken|triggered|abandon|lonely|exhausted|drained|feel nothing|feel empty)\b/i,
  },
  {
    mode: 'auntie',
    why: 'this sounded like family',
    patterns:
      /\b(family|families|mother|mum|mom|hooyo|father|dad|aabo|parents|aunt|auntie|aunties|uncle|cousin|sister|brother.?in|clan|qabiil|tribe|reer|community|people talk|what people)\b/i,
  },
  {
    mode: 'matchmaker',
    why: 'this sounded like a question about fit',
    patterns:
      /\b(who fits|what kind of person|my map|compatible|compatibility|my type|right for me|suited|match me|matches)\b/i,
  },
  {
    mode: 'profile',
    why: 'this sounded like it’s about how you come across',
    patterns: /\b(my profile|my bio|my photos|my pictures|how i look|come across|first impression)\b/i,
  },
  {
    mode: 'gendered',
    why: 'this sounded like the two of you',
    patterns:
      /\b(he|him|his|she|her|hers|they|text|texted|texting|message|messaged|reply|replied|call|called|ghost|ghosted|quiet|silent|left me on read|seen|serious|intention|intentions|talking stage|situationship|date|dating|proposal|proposed|meet|meeting|waste|wasting)\b/i,
  },
]

export interface Route {
  mode: ModeId
  /** A short clause explaining the choice, shown in the guide. */
  why: string
}

export function routeToMode(text: string, gender?: Gender): Route {
  const t = text.trim()
  if (t) {
    for (const rule of RULES) {
      if (!rule.patterns.test(t)) continue
      return {
        mode: rule.mode === 'gendered' ? defaultModeFor(gender) : rule.mode,
        why: rule.why,
      }
    }
  }
  // Nothing matched — the everyday voice for this person, said honestly.
  return { mode: defaultModeFor(gender), why: 'this felt like one to start here' }
}
