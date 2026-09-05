import type { Gender } from '../types'
import { speak } from './read'
import { instrumentLink } from '../lib/links'

/**
 * The invitation, retargeted at the instruments.
 *
 * It used to sell the readiness map — and a year of Niyyah+ that did not exist.
 * The Problemology audit ranked "am I ready" sixteenth of eighteen; the woman
 * who forwards something is the one whose friend is *also* talking to someone.
 * So the invitation names the thing that helped her, in the words she would
 * use, and promises nothing we cannot deliver tonight.
 */
export type InviteSource = 'profile' | 'read' | 'beforeYes' | 'couple'

const TEXT: Record<InviteSource, string> = {
  profile:
    'Salaam — I’ve been using Niyyah, built for us. If you’re talking to someone, it reads what {he}’s actually done in ninety seconds and gives you the one question to ask {him}. No swiping, no account.',
  read:
    'Talking to someone? Niyyah reads what {he}’s actually done — not what {he} says — in ninety seconds, and gives you the one question to ask {him} next. Built for us. No swiping, no account.',
  beforeYes:
    'Before you say yes — the eleven conversations our marriages break on: whose house, money home, a second wife. Niyyah asks which ones you two have had, and gives you the words to open the one that matters. Built for us. No account.',
  // From a couple who did it together, to a couple who is about to decide.
  couple:
    'Before you say yes — the eleven conversations most of us have too late: where you’d live, money home, a second wife. We did them on Niyyah, each on our own phone; neither of us saw the other’s answers, only where we matched. Two minutes. No account.',
}

/**
 * Where the invitation lands. It used to open the front door; it now opens the
 * instrument the sender is talking about, and says only what kind of link it
 * was — never who sent it.
 */
export function inviteLink(source: InviteSource): string {
  switch (source) {
    case 'read':
    case 'profile':
      return instrumentLink('read', 'words')
    case 'beforeYes':
      return instrumentLink('eleven', 'eleven')
    case 'couple':
      return instrumentLink('eleven', 'couple')
  }
}

export function inviteText(source: InviteSource, gender: Gender = 'woman'): string {
  return speak(gender)(TEXT[source])
}
