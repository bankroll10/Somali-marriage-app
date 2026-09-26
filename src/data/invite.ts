import type { Gender } from '../types'
import { speak } from './read'
import { instrumentLink, toolLink } from '../lib/links'

/**
 * The invitation, retargeted at the instruments.
 *
 * It used to sell the readiness map — and a year of Niyyah+ that did not exist.
 * The Problemology audit ranked "am I ready" sixteenth of eighteen; the woman
 * who forwards something is the one whose friend is *also* talking to someone.
 * So the invitation names the thing that helped her, in the words she would
 * use, and promises nothing we cannot deliver tonight.
 *
 * And none of it says the sender is looking. In this community that costs her
 * something, so every text here is about the instrument and the friend, never
 * about the sender's own use of a marriage product — the rule docs/PRODUCT.md
 * §9 states for everything that gets forwarded.
 */
export type InviteSource = 'read' | 'beforeYes' | 'couple'

const TEXT: Record<InviteSource, string> = {
  read:
 'Talking to someone? Niyyah reads what {he}’s done — not what {he} says — in ninety seconds, and gives you the one question to ask {him} next. Built for us. No swiping, no account.',
  beforeYes:
    'Before you say yes — the eleven conversations to have before the families do: whose house, money home, a second wife. Niyyah asks which ones you two have had, and gives you the words to open the one that matters. Built for us. No account.',
  // From a couple who did it together, to a couple who is about to decide.
  couple:
    'Before you say yes — the eleven conversations to have before the families do: where you’d live, money home, a second wife. Niyyah asks each of you, on your own phones, which ones you’ve had; neither sees the other’s answers, only where you stand. Two minutes. No account.',
}

/**
 * Where the invitation lands. It used to open the front door; it now opens the
 * instrument the sender is talking about, and says only what kind of link it
 * was — never who sent it.
 *
 * Since the tools have addresses (src/data/tools.ts) the read's invitation
 * points at the one for the friend's side — a woman sends a friend
 * `/tools/is-he-serious`, which previews as what it is and asks her nothing on
 * arrival — and the eleven's at `/tools/before-you-say-yes`. The side in the
 * path is the friend's, the same as the words already are; it says nothing
 * about the sender. Without a known side the read falls back to the query
 * form, which asks on arrival.
 */
export function inviteLink(source: InviteSource, gender?: Gender): string {
  switch (source) {
    case 'read':
      return gender ? toolLink(gender === 'man' ? 'is-she-serious' : 'is-he-serious', 'words') : instrumentLink('read', 'words')
    case 'beforeYes':
      return toolLink('before-you-say-yes', 'eleven')
    case 'couple':
      return instrumentLink('eleven', 'couple')
  }
}

export function inviteText(source: InviteSource, gender: Gender = 'woman'): string {
  return speak(gender)(TEXT[source])
}
