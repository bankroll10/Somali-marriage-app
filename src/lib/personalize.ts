import type { CheckIn, Dimension, Reflection, Stage } from '../types'
import type { DailyPrefs, DailyReflection } from '../data/daily'
import { dayKey } from '../data/checkin'

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
 * Which daily reflections this person should see more of, drawn from three
 * signals they gave us themselves: the hardest part they named at the door,
 * the thinnest ground on their readiness map, and how their week has actually
 * been going. No two people with different answers get the same rotation.
 */
export function dailyPrefsFor(
  hookId: string | undefined,
  reflection: Reflection | null,
  checkIns: CheckIn[],
  stage: Stage = 'preparing',
): DailyPrefs {
  const tags: Tag[] = []
  const reasons: Partial<Record<Tag, string>> = {}
  const add = (tag: Tag, reason: string, first = false) => {
    if (!tags.includes(tag)) {
      if (first) tags.unshift(tag)
      else tags.push(tag)
    }
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

  // 2. A heavy or anxious week outranks the map — meet them where today is.
  let heavyish = 0
  for (let i = 0; i < 7; i++) {
    const m = checkIns.find((c) => c.date === dayKey(i))?.mood
    if (m === 'heavy' || m === 'overthinking') heavyish++
  }
  if (heavyish >= 3) add('Heart', 'this week has asked a lot of you', true)

  // 3. The thinnest ground on their map — where growth would help most.
  if (reflection?.thinnest.length) {
    const lowest = reflection.dimensions.find((d) => d.dimension === reflection.thinnest[0])
    const tag = lowest ? DIMENSION_THEME[lowest.dimension] : undefined
    if (lowest && tag) {
      add(tag, `${lowest.label.toLowerCase()} is where your map has the most room right now`)
    }
  }

  return { tags, reasons }
}
