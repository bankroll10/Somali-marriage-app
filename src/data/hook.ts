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
 label: 'Knowing if someone is serious',
 short: 'knowing if someone is serious',
    insight: (name, g) =>
      `${name ? `${name}, this` : 'This'} has a calmer answer than it feels like it does. Seriousness isn’t in the words or the late-night energy; it’s in whether ${person(g)} moves toward clarity, family, and consistency — or away from them.

Niyyah is built around reading that early, so you stop guessing. Your guide will look at real situations with you, and the map you’re about to build is what makes that guidance yours.`,
  },
  {
    id: 'family',
    label: 'The pressure from family',
    short: 'the pressure from family',
    insight: (name) =>
      `${name ? `${name}, u` : 'U'}nderneath the weekly questions there’s usually love that doesn’t know how to speak softly. That doesn’t make the weight lighter — but it changes how you carry it.

You can honour your family and still move at your own pace. Niyyah is built for that exact balance — family in the story, you holding the pen. Your map starts with your intention, not theirs.`,
  },
  {
    id: 'trust',
    label: 'Trusting again after being hurt',
    short: 'trusting again after being hurt',
    insight: (name) =>
      `${name ? `${name}, t` : 'T'}hat carefulness isn’t a flaw. It is what care looks like after it has been let down. The goal isn’t to tear the wall down overnight. It’s to let the right person earn their way through it, slowly.

That’s why Niyyah starts with where you are, not with a profile. Your map will meet your heart where it is — and your guide will be there for the wobbly moments.`,
  },
  {
    id: 'finding',
    label: 'Finding anyone serious at all',
    short: 'finding anyone serious at all',
    insight: (name) =>
      `${name ? `${name}, y` : 'Y'}ou’re not imagining it — the usual apps mix you into a crowd that isn’t looking for what you’re looking for, then make you sift by hand. The problem isn’t you. It’s the room.

Niyyah doesn’t introduce anyone. It makes the next person you meet, wherever you meet them, someone you find out about early: what they have done rather than what they say, and the conversations to have before anyone says yes. First we build your map, so you know what you are looking for.`,
  },
  {
    // The list's own test. Without this, a skip and "none of these fit" both
    // arrived on the server as `none`, and docs/RESEARCH.md's rule — a closed list's
    // `other` share tests the list — had nothing to read (docs/DECISIONS.md).
    id: 'other',
    label: 'Something else',
    short: 'something else',
    insight: (name) =>
 `${name ? `${name}, t` : 'T'}hat is allowed. The five above are not everyone’s, and what you carry is what your map should start from — nothing here presumes your problem.

Your map will show where you stand, in words, and your guide will take the rest in your own.`,
  },
  {
    id: 'ready',
    label: 'Knowing if I’m even ready',
    short: 'knowing if you’re even ready',
    insight: (name) =>
 `${name ? `${name}, a` : 'A'}sking that question honestly is already the first step. Readiness isn’t a feeling you wait for — it’s a handful of things you can look at: your intention, your heart’s patterns, what you need, what you won’t compromise.

That is what we do next. Your map will show you where you stand — clearly, kindly, and just for you.`,
  },
]

export function getHookOption(id?: string): HookOption | undefined {
  return hookOptions.find((o) => o.id === id)
}
