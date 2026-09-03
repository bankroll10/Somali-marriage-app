import type { Gender } from '../types'
import { speak } from './read'

/**
 * The invitation, retargeted at the instruments.
 *
 * It used to sell the readiness map — and a year of Niyyah+ that did not exist.
 * The Problemology audit ranked "am I ready" sixteenth of eighteen; the woman
 * who forwards something is the one whose friend is *also* talking to someone.
 * So the invitation names the thing that helped her, in the words she would
 * use, and promises nothing we cannot deliver tonight.
 */
export type InviteSource = 'profile' | 'read' | 'beforeYes'

const TEXT: Record<InviteSource, string> = {
  profile:
    'Salaam — I’ve been using Niyyah, built for us. If you’re talking to someone, it reads what {he}’s actually done in ninety seconds and gives you the one question to ask {him}. No swiping, no account.',
  read:
    'Talking to someone? Niyyah reads what {he}’s actually done — not what {he} says — in ninety seconds, and gives you the one question to ask {him} next. Built for us. No swiping, no account.',
  beforeYes:
    'Before you say yes — the eleven conversations our marriages break on: whose house, money home, a second wife. Niyyah asks which ones you two have had, and gives you the words to open the one that matters. Built for us. No account.',
}

export function inviteText(source: InviteSource, gender: Gender = 'woman'): string {
  return speak(gender)(TEXT[source])
}
