import type { Gender, ModeId } from '../types'

/**
 * The four things most likely to have just happened.
 *
 * These exist so the fastest path through the app is one tap: open Niyyah,
 * touch the thing that's true right now, get a real answer. No typing, no
 * choosing a guide, no explaining yourself first. They also do quiet teaching —
 * a new member reads these and understands what this app is for.
 *
 * Each carries its own voice rather than going through the router, so a tapped
 * moment can never be misrouted.
 */
export interface Moment {
  /** Short label on the chip. */
  label: string
  /** What actually gets said to the guide. */
  prompt: string
  mode: ModeId
  /**
   * Send this one to the read instead of the Guide.
   *
   * "Is he serious?" is the highest-pain question we can answer, and a chat
   * reply is the weaker answer to it — eleven questions about his behaviour
   * beat a paragraph of good advice about behaviour in general.
   */
  target?: 'read'
}

const women: Moment[] = [
  {
    label: 'He’s gone quiet',
    prompt: 'He’s gone quiet on me and I don’t know what it means.',
    mode: 'auntie',
  },
  {
    label: 'My family is pushing',
    prompt: 'My family is pushing me about marriage and I don’t know how to handle it.',
    mode: 'auntie',
  },
  {
    label: 'I’m overthinking',
    prompt: 'I can’t stop overthinking his reply. Help me slow it down.',
    mode: 'therapist',
  },
  {
    label: 'Is he serious?',
    prompt: 'Someone has shown interest. How do I tell if he’s actually serious?',
    mode: 'auntie',
    target: 'read',
  },
]

const men: Moment[] = [
  {
    label: 'She’s gone quiet',
    prompt: 'She’s gone quiet on me and I don’t know what it means.',
    mode: 'brother',
  },
  {
    label: 'Is she serious?',
    prompt: 'Someone has shown interest. How do I tell if she’s actually serious?',
    mode: 'brother',
    target: 'read',
  },
  {
    label: 'Saying my intention',
    prompt: 'How do I say my intention for marriage clearly without it being awkward?',
    mode: 'brother',
  },
  {
    label: 'Talking to her wali',
    prompt: 'What do I actually say to her father or brother when the time comes?',
    mode: 'islamic',
  },
]

export function momentsFor(gender?: Gender): Moment[] {
  return gender === 'man' ? men : women
}
