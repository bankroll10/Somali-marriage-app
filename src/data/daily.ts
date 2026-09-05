/**
 * Reflections — a small, culturally-specific drop of wisdom that changes each
 * day. Not a reason to return: a thought worth carrying when she happens to
 * open this, and the one thing here worth sending to someone.
 *
 * Hand-authored. The Claude seam could later personalize the daily reflection to
 * a user's readiness map, but the rotation below is the baseline.
 */
export interface DailyReflection {
  tag: 'Faith' | 'Heart' | 'Dignity' | 'Family' | 'Patience' | 'Diaspora'
  title: string
  body: string
}

export const dailyReflections: DailyReflection[] = [
  {
    tag: 'Dignity',
    title: 'Dignity is not coldness',
    body: 'You can be warm, open, and kind and still keep your standards. Protecting your peace is not arrogance — it is self-respect. The right person will be drawn to it, not scared by it.',
  },
  {
    tag: 'Family',
    title: 'Their worry is love in a heavy coat',
    body: 'When your parents push about marriage, it rarely lands gently. But underneath the pressure is fear that you’ll be alone, and love that doesn’t know how to say itself softly. You can honour the love and still set the pace.',
  },
  {
    tag: 'Patience',
    title: 'You are not behind',
    body: 'Cousins married, friends posting nikahs, aunties counting. None of that is your timeline. A marriage entered in a panic is harder to leave than a wedding you waited for. Tawakkul over the timeline.',
  },
  {
    tag: 'Faith',
    title: 'Choose the one of deen',
    body: '“Choose the one of deen, may your hands be dusty.” Charm fades, money moves, beauty changes. Taqwa and good character are what you actually lean on at 2am when the baby won’t sleep. Choose for the long night, not the first glance.',
  },
  {
    tag: 'Heart',
    title: 'Daylight intentions',
    body: 'Good intentions keep daytime hours. Someone who only appears late, only in secret, only when it suits them — is not building, they are passing time. You are not a midnight habit. You are a whole life.',
  },
  {
    tag: 'Diaspora',
    title: 'Two worlds, one you',
    body: 'You carry hooyo’s duco and the city you grew up in, the masjid and the group chat, two languages and one heart. You are not “too Western” or “too Somali.” Both are yours. The right person won’t make you choose a half of yourself.',
  },
  {
    tag: 'Heart',
    title: 'Anxious is not a verdict',
    body: 'When the reply is slow and your mind starts writing the ending, pause. That spiral is your nervous system, not the truth. Separate what happened from the story you added. Almost always, the facts are calmer than the fear.',
  },
  {
    tag: 'Dignity',
    title: 'Standards vs. a wish-list',
    body: 'Hold your standards like iron — honesty, deen, how he treats his mother. Soften the wish-list — the height, the perfect family, the fantasy. No one is complete. Don’t settle on character; don’t crucify a good person for not being a daydream.',
  },
  {
    tag: 'Family',
    title: 'Bring them into the light',
    body: 'What is done in the open, with the people who love you, carries a barakah that secrecy never can. Family isn’t the obstacle to your marriage — they’re part of how it’s built to last. A serious person expects them.',
  },
  {
    tag: 'Patience',
    title: 'Don’t audition for a maybe',
    body: 'You don’t have to perform, shrink, or over-explain to keep someone interested. If you have to become smaller to be chosen, it isn’t your seat. The right one wants the real, whole version — the one you stop editing.',
  },
  {
    tag: 'Faith',
    title: 'Make istikhara, then move',
    body: 'Do your part with sincerity and wisdom — ask, observe, involve your people — and then hand the outcome to Allah. You are responsible for your effort and your intention, never for controlling another heart. Barakah follows sincerity, not perfection.',
  },
  {
    tag: 'Heart',
    title: 'Walls were once protection',
    body: 'If you tend to pull back when you actually like someone, be gentle — that wall once kept you safe. The work isn’t to tear it down overnight. It’s to notice the urge to disappear, and say “I need a moment” instead of vanishing.',
  },
  {
    tag: 'Dignity',
    title: 'Your time is an amana',
    body: 'Months spent in a “situationship” are months you won’t get back. It isn’t rude to be clear: “I’m looking for marriage — where do you see this going?” Clarity protects you both. You are intentional, not impatient.',
  },
  {
    tag: 'Diaspora',
    title: 'Community is not a courtroom',
    body: 'Fear of what people will say has buried more good intentions than any haram ever did. Live by Allah’s gaze, not the aunties’ whispers. The ones who matter want your happiness; the rest were never going to be pleased anyway.',
  },
]

/** What this particular person needs to hear, derived in lib/personalize.ts. */
export interface DailyPrefs {
  /** Themes to favour for this user, most relevant first. */
  tags: DailyReflection['tag'][]
  /**
   * Why each theme was chosen, keyed by tag. Keyed rather than a single string
   * so the "Because …" line always explains the card actually shown.
   */
  reasons?: Partial<Record<DailyReflection['tag'], string>>
}

function dayOfYearFor(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0)
  return Math.floor((date.getTime() - start.getTime()) / 86_400_000)
}

/**
 * The day's reflection — stable per calendar day, and weighted to the person.
 *
 * Two days in three are drawn from the themes their own answers point to; every
 * third day broadens, so the collection still reaches them and the voice never
 * narrows into an echo. Without prefs this is the plain rotation.
 */
export function getDailyReflection(date = new Date(), prefs?: DailyPrefs): DailyReflection {
  const day = dayOfYearFor(date)
  const preferred = prefs?.tags ?? []
  const matching = dailyReflections.filter((r) => preferred.includes(r.tag))
  const rest = dailyReflections.filter((r) => !preferred.includes(r.tag))

  // Need a real pool on-theme, or personalisation backfires: with only two
  // matching cards a single-tag user saw a repeat by day three, while the
  // un-personalised rotation runs fourteen days clean.
  if (matching.length < 4) return dailyReflections[day % dailyReflections.length]
  if (day % 3 === 2 && rest.length > 0) return rest[day % rest.length]
  return matching[day % matching.length]
}

/**
 * Why today's reflection was chosen for this person — or null on a broadening
 * day, when it wasn't. Always describes the card actually on screen.
 */
export function chosenReason(date = new Date(), prefs?: DailyPrefs): string | null {
  if (!prefs?.tags.length) return null
  const matching = dailyReflections.filter((r) => prefs.tags.includes(r.tag))
  if (matching.length < 4) return null
  const chosen = getDailyReflection(date, prefs)
  if (!prefs.tags.includes(chosen.tag)) return null
  return prefs.reasons?.[chosen.tag] ?? null
}
