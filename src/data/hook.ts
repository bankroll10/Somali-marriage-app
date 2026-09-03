import type { Gender } from '../types'

/**
 * The onboarding hook — one emotionally loaded question, answered instantly and
 * personally, BEFORE we ask for the full intake. This is the 30-second aha: the
 * moment a first-time user feels "this app gets my reality."
 *
 * The answer is stored under 'hardest-part' (outside the intake schema, so it
 * never affects the readiness scoring) and is reused on Home to point the
 * first-run user at the Guide.
 */
export interface HookOption {
  id: string
  label: string
  /** Lowercase phrase for referencing later ("you said the hardest part is …"). */
  short: string
  insight: (name: string, gender?: Gender) => string
}

export const hookQuestion = 'What’s the hardest part for you right now?'

const person = (g?: Gender) => (g === 'man' ? 'she' : 'he')

export const hookOptions: HookOption[] = [
  {
    id: 'serious',
    label: 'Knowing if someone is actually serious',
    short: 'knowing if someone is actually serious',
    insight: (name, g) =>
      `${name ? `${name}, this` : 'This'} is the question that wastes the most years — and it has a calmer answer than your anxiety thinks. Seriousness isn’t in the words or the late-night energy; it’s in whether ${person(g)} moves toward clarity, family, and consistency — or away from them.

Niyyah is built around exactly this: reading intention early, so you stop guessing. Your guide will look at real situations with you — and the map you’re about to build is what makes that guidance truly yours.`,
  },
  {
    id: 'family',
    label: 'The pressure from family',
    short: 'the pressure from family',
    insight: (name) =>
      `${name ? `${name}, u` : 'U'}nderneath the weekly questions and the counting aunties there’s usually love that doesn’t know how to speak softly. That doesn’t make the weight lighter — but it changes how you carry it.

You can honour your family and still move at your own pace. Niyyah is built for that exact balance — family in the story, you holding the pen. Your map starts with your intention, not theirs.`,
  },
  {
    id: 'trust',
    label: 'Trusting again after being hurt',
    short: 'trusting again after being hurt',
    insight: (name) =>
      `${name ? `${name}, t` : 'T'}hat carefulness you carry isn’t a flaw — it’s what honest love looks like after it’s been let down. The goal isn’t to tear the wall down overnight. It’s to let the right person earn their way through it, slowly.

That’s why Niyyah starts with readiness, not profiles. Your map will meet your heart where it actually is — and your guide will be there for the wobbly moments.`,
  },
  {
    id: 'finding',
    label: 'Finding anyone serious at all',
    short: 'finding anyone serious at all',
    insight: (name) =>
      `${name ? `${name}, y` : 'Y'}ou’re not imagining it — the usual apps mix you into a crowd that isn’t looking for what you’re looking for, then make you sift by hand. The problem isn’t you. It’s the room.

Niyyah is a different room — one that only opens when enough serious people are in it, and matches on how lives fit instead of on looks. First we build your map, so when you meet people here, you’re matched on what actually lasts.`,
  },
  {
    id: 'ready',
    label: 'Knowing if I’m even ready',
    short: 'knowing if you’re even ready',
    insight: (name) =>
      `${name ? `${name}, a` : 'A'}sking that question honestly already puts you ahead of most people who are out there swiping. Readiness isn’t a feeling you wait for — it’s a handful of things you can actually look at: your intention, your heart’s patterns, what you need, what you won’t compromise.

That’s literally what we do next. Your readiness map will show you where you stand — clearly, kindly, and just for you.`,
  },
]

export function getHookOption(id?: string): HookOption | undefined {
  return hookOptions.find((o) => o.id === id)
}
