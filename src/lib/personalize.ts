import type { Dimension, Reflection, Stage } from '../types'
import type { DailyPrefs, DailyReflection } from '../data/daily'

type Tag = DailyReflection['tag']

/**
 * What each onboarding answer says about the theme this person needs most.
 * These are their own words coming back to them — the reason is shown on the card.
 */
const HOOK_THEME: Record<string, { tag: Tag; reason: string }> = {
  serious: {
    tag: 'Dignity',
    reason: 'you said the hardest part is knowing if someone is actually serious',
  },
  family: { tag: 'Family', reason: 'you said the pressure from family is the hardest part' },
  trust: { tag: 'Heart', reason: 'you said trusting again after being hurt is the hardest part' },
  finding: { tag: 'Diaspora', reason: 'you said finding anyone serious at all is the hardest part' },
  ready: { tag: 'Patience', reason: 'you said knowing if you’re even ready is the hardest part' },
}

/** The theme that speaks to a person's thinnest ground on the map. */
const DIMENSION_THEME: Record<Dimension, Tag> = {
  intention: 'Patience',
  faith: 'Faith',
  family: 'Family',
  vision: 'Patience',
  character: 'Dignity',
  emotional: 'Heart',
  selfAwareness: 'Heart',
}

/**
 * Which reflections this person should see more of, drawn from what they gave
 * us themselves: the hardest part they named at the door, where they are in
 * the arc, and the thinnest ground on their map. No two people with different
 * answers get the same rotation. (A "heavy week" from the daily check-in used
 * to be a signal here; the check-in is gone, and with it the only reason the
 * app had to ask how she felt every day.)
 */
export function dailyPrefsFor(
  hookId: string | undefined,
  reflection: Reflection | null,
  stage: Stage = 'preparing',
): DailyPrefs {
  const tags: Tag[] = []
  const reasons: Partial<Record<Tag, string>> = {}
  const add = (tag: Tag, reason: string) => {
    if (!tags.includes(tag)) tags.push(tag)
    // First reason for a theme wins — signals are added strongest-first.
    if (!reasons[tag]) reasons[tag] = reason
  }

  // 1. What they named as the hardest part — the strongest, most personal
  // signal, but only while they're still looking. Telling a married woman her
  // reflection was chosen because finding someone serious is hard is nonsense.
  const seeking = stage === 'preparing' || stage === 'talking'
  const hook = seeking && hookId ? HOOK_THEME[hookId] : undefined
  if (hook) add(hook.tag, hook.reason)

  // Past the search, the stage itself is the strongest signal.
  if (stage === 'deciding') {
    add('Family', 'you’re deciding together, and families are part of that')
    add('Patience', 'you’re deciding together, and this part shouldn’t be rushed')
  }
  if (stage === 'married') {
    add('Heart', 'you’re building the marriage now, not looking for one')
    add('Family', 'you’re building a marriage inside two families')
  }

  // 2. The thinnest ground on their map — where growth would help most.
  if (reflection?.thinnest.length) {
    const lowest = reflection.dimensions.find((d) => d.dimension === reflection.thinnest[0])
    const tag = lowest ? DIMENSION_THEME[lowest.dimension] : undefined
    if (lowest && tag) {
      add(tag, `${lowest.label.toLowerCase()} is where your map has the most room right now`)
    }
  }

  return { tags, reasons }
}
