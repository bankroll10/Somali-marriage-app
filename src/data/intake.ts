import type { Chapter } from '../types'

/**
 * The guided intake. Tone: a wise, warm guide — not a survey, not a quiz.
 * Each option can carry `tags` (surfaced as core values) and a `weight`
 * (0–1) that informs the readiness reading for its dimension.
 *
 * This is intentionally edited prose, not generated. It is the soul of the app.
 *
 * Length is a product decision with evidence behind it. The first version ran
 * 23 questions over six chapters, and of the first two real people who opened
 * it, one stopped partway through the prompts and the other most likely did
 * too — neither reached the map. So this is the cut: every question that the
 * map's scoring, the alignment engine (lib/matching.ts) or the Guide reads
 * stays; every question that only added a tag or a second reading of the same
 * dimension went. Each of the seven dimensions still has at least one scoring
 * answer, which data/intake.test.ts guards. The removed questions are in git
 * history if the signal ever says people want to go deeper.
 */
export const chapters: Chapter[] = [
  {
    id: 'niyyah',
    kicker: '01 · Niyyah & Deen',
    title: 'Intention & faith',
    intro:
      'Before anyone else, this is between you and your own clarity. Marriage begins with an honest intention — not a feeling, not pressure, not a deadline. And for us, deen is its spine: not to judge, but to find someone walking at a pace that fits beside yours.',
    questions: [
      {
        id: 'timeline',
        type: 'single',
        dimension: 'intention',
        prompt: 'What is your timeline for marriage?',
        helper: 'Not a deadline — just where your heart honestly is.',
        options: [
          { id: 'within-1', label: 'Within the next year', tags: ['Ready now'], weight: 1 },
          { id: '1-2', label: 'In the next one to two years', tags: ['Soon'], weight: 0.9 },
          { id: '3-plus', label: 'Three years or more', tags: ['Long horizon'], weight: 0.65 },
          { id: 'exploring', label: 'No fixed time — but exploring seriously', tags: ['Exploring seriously'], weight: 0.7 },
        ],
      },
      {
        id: 'why-now',
        type: 'single',
        dimension: 'intention',
        prompt: 'Why are you looking for marriage now?',
        helper: 'There is no wrong answer. Be honest with yourself.',
        options: [
          {
            id: 'ready',
            label: 'I feel genuinely ready to build a life with someone',
            tags: ['Intentional'],
            weight: 1,
          },
          {
            id: 'lonely',
            label: 'I want companionship and to stop feeling alone',
            tags: ['Seeking partnership'],
            weight: 0.6,
          },
          {
            id: 'pressure',
            label: 'My family and community expect it of me',
            hint: 'Common, and worth naming honestly.',
            tags: ['Family-aware'],
            weight: 0.4,
          },
          {
            id: 'curious',
            label: "I'm exploring whether I'm ready",
            tags: ['Self-honest'],
            weight: 0.5,
          },
        ],
      },
      {
        id: 'practice',
        type: 'single',
        dimension: 'faith',
        prompt: 'Where are you in your practice right now?',
        helper: 'Honesty here saves years later.',
        options: [
          { id: 'devout', label: 'Practicing steadily — it shapes my daily life', tags: ['Devout'], weight: 1 },
          { id: 'consistent', label: 'Consistent in the core, growing in the rest', tags: ['Grounded'], weight: 0.85 },
          { id: 'returning', label: 'Reconnecting with my faith and on the way back', tags: ['Returning'], weight: 0.7 },
          { id: 'cultural', label: 'Muslim by identity, lighter in practice', tags: ['Cultural'], weight: 0.5 },
        ],
      },
      {
        id: 'faith-role',
        type: 'scale',
        dimension: 'faith',
        prompt: 'How central should faith be in your marriage and home?',
        scale: {
          min: 1,
          max: 5,
          minLabel: 'A private matter',
          maxLabel: 'The center of everything',
        },
      },
    ],
  },
  {
    id: 'life',
    kicker: '02 · Family & Life',
    title: 'The life you want',
    intro:
      'For us, marriage is rarely two people alone — it is families, roots, and a horizon meeting. Alignment is not about being identical. It is about walking toward the same horizon, with the same people in the story.',
    questions: [
      {
        id: 'family-role',
        type: 'single',
        dimension: 'family',
        prompt: 'How involved do you want family in the journey to marriage?',
        options: [
          { id: 'central', label: 'Central — family is part of every step', tags: ['Family-led'], weight: 0.9 },
          { id: 'guided', label: 'Involved once things are serious', tags: ['Balanced'], weight: 1 },
          { id: 'informed', label: 'Kept informed, but I lead the decision', tags: ['Independent-minded'], weight: 0.8 },
          { id: 'private', label: 'Mostly private until I’m sure', tags: ['Self-directed'], weight: 0.6 },
        ],
      },
      {
        id: 'children',
        type: 'single',
        dimension: 'vision',
        prompt: 'How do you feel about children?',
        options: [
          { id: 'want', label: 'I want children, God willing', tags: ['Family-minded'], weight: 1 },
          { id: 'open', label: 'Open to it with the right person', tags: ['Open'], weight: 0.8 },
          { id: 'unsure', label: "I'm still unsure", tags: ['Reflecting'], weight: 0.6 },
          { id: 'no', label: 'I don’t see children in my future', tags: ['Clear'], weight: 0.8 },
        ],
      },
      {
        id: 'value-most',
        type: 'multi',
        dimension: 'character',
        prompt: 'What do you value most in a partner?',
        helper: 'Choose up to three — the ones you could not live without.',
        max: 3,
        options: [
          { id: 'kindness', label: 'Kindness and a soft heart', tags: ['Kindness'] },
          { id: 'loyalty', label: 'Loyalty and steadiness', tags: ['Loyalty'] },
          { id: 'ambition', label: 'Drive and ambition', tags: ['Ambition'] },
          { id: 'humor', label: 'Humor and lightness', tags: ['Humor'] },
          { id: 'emotional', label: 'Emotional maturity', tags: ['Maturity'] },
          { id: 'deen-char', label: 'God-consciousness in how they live', tags: ['Taqwa'] },
          { id: 'intellect', label: 'A curious, thoughtful mind', tags: ['Depth'] },
        ],
      },
      {
        id: 'dealbreakers',
        type: 'multi',
        dimension: 'character',
        prompt: 'What are your true non-negotiables?',
        helper: 'Choose up to three. Knowing these protects your time and heart.',
        max: 3,
        options: [
          { id: 'honesty', label: 'Honesty — no lies, no games', tags: ['Honesty'] },
          { id: 'faith-nn', label: 'A shared commitment to faith', tags: ['Shared faith'] },
          { id: 'respect', label: 'Respect for me and my family', tags: ['Respect'] },
          { id: 'no-addiction', label: 'Free of addiction or serious vices', tags: ['Healthy living'] },
          { id: 'kids-nn', label: 'Aligned on children', tags: ['Aligned on children'] },
          { id: 'ambition-nn', label: 'Has direction in life', tags: ['Direction'] },
          { id: 'kindness-nn', label: 'Treats people well, especially the powerless', tags: ['Good character'] },
        ],
      },
    ],
  },
  {
    id: 'heart',
    kicker: '03 · Heart',
    title: 'Heart & honest mirror',
    intro:
      'The hardest and most important part — and the one no other app asks. Not who you want, but how your heart actually works, and what you are still becoming. This stays private to you.',
    questions: [
      {
        id: 'conflict',
        type: 'single',
        dimension: 'character',
        prompt: 'When something is wrong between you, what do you do?',
        helper: 'How we handle conflict predicts more than how we love.',
        options: [
          { id: 'talk', label: 'I talk it through, even when it’s hard', tags: ['Communicative'], weight: 1 },
          { id: 'space', label: 'I need space first, then I come back to it', tags: ['Reflective'], weight: 0.8 },
          { id: 'avoid', label: 'I tend to avoid it and hope it passes', tags: ['Conflict-avoidant'], weight: 0.45 },
          { id: 'heated', label: 'I get heated, then we work it out', tags: ['Passionate'], weight: 0.55 },
        ],
      },
      {
        id: 'healing',
        type: 'single',
        dimension: 'emotional',
        prompt: 'Are you carrying something you’re still healing from?',
        helper: 'There’s no shame here. Marriage goes better when we arrive whole, not perfect.',
        options: [
          { id: 'healed', label: 'I’ve done the work and feel at peace', tags: ['At peace'], weight: 1 },
          { id: 'healing', label: 'I’m healing, and aware of it', tags: ['Self-aware'], weight: 0.8 },
          { id: 'fresh', label: 'Honestly, something recent still aches', tags: ['Tender'], weight: 0.5 },
          { id: 'unsure', label: 'I’m not sure — I haven’t looked closely', tags: ['Unexamined'], weight: 0.55 },
        ],
      },
      {
        id: 'attachment',
        type: 'single',
        dimension: 'emotional',
        prompt: 'When you care about someone, how does your heart tend to move?',
        helper: 'Plainly — most of us lean one way. Knowing yours is a quiet superpower.',
        options: [
          { id: 'secure', label: 'Steady — I can stay calm and trust', tags: ['Secure'], weight: 1 },
          { id: 'anxious', label: 'I worry, overthink, need reassurance', tags: ['Anxious lean'], weight: 0.65 },
          { id: 'avoidant', label: 'I pull back and protect my independence', tags: ['Guarded lean'], weight: 0.65 },
          { id: 'mixed', label: 'A bit of both, depending on the person', tags: ['Mixed'], weight: 0.75 },
        ],
      },
      {
        id: 'pattern',
        type: 'single',
        dimension: 'selfAwareness',
        prompt: 'Looking back, what pattern do you want to leave behind?',
        helper: 'We all have one. Naming it is the beginning of changing it.',
        // Naming a live pattern is honest but the work is still ahead, so these
        // sit below "already done that work". They used to all weigh 0.9-1.0,
        // which pinned self-awareness at 90-100 for every single user — the one
        // sentence on the map that was identical for everybody, and a dimension
        // that could therefore never be anyone's thinnest ground.
        options: [
          { id: 'unavailable', label: 'Choosing people who can’t fully show up', tags: ['Pattern: availability'], weight: 0.65 },
          { id: 'rushing', label: 'Rushing in before I really know someone', tags: ['Pattern: pace'], weight: 0.65 },
          { id: 'walls', label: 'Keeping my walls up, staying guarded', tags: ['Pattern: guardedness'], weight: 0.65 },
          { id: 'settling', label: 'Settling for less than I deserve', tags: ['Pattern: self-worth'], weight: 0.65 },
          { id: 'none', label: 'I’ve done real work on myself already', tags: ['Self-aware'], weight: 1 },
        ],
      },
      {
        id: 'working-on',
        type: 'text',
        dimension: 'selfAwareness',
        prompt: 'In your own words — what are you still working on in yourself?',
        helper: 'A sentence is enough, and you can skip it. Self-awareness is the most attractive quality there is.',
        placeholder: "I'm still learning to…",
        optional: true,
      },
    ],
  },
]

export const allQuestions = chapters.flatMap((c) => c.questions)
export const totalQuestions = allQuestions.length

/**
 * A one-line reading shown when a chapter is completed — the "it's working"
 * signal that makes the intake feel like progressive payoff, not a survey.
 * Returns null for the final chapter (the readiness map is that payoff).
 */
export function chapterInsight(chapterId: string, answers: Record<string, unknown>): string | null {
  switch (chapterId) {
    case 'niyyah': {
      const tl = answers['timeline']
      const p = answers['practice']
      const intention =
        tl === 'within-1' || tl === '1-2'
          ? 'Your intention already has shape — you know why you’re here and roughly when. That’s rarer than you think.'
          : tl === 'exploring'
            ? 'You’re exploring seriously, not drifting — that honesty is the right foundation.'
            : 'You’re giving yourself room on the timeline. Good — a marriage chosen calmly beats one chosen against a clock.'
      const faith =
        p === 'devout' || p === 'consistent'
          ? 'And faith isn’t a checkbox for you — it’s the frame. We’ll look for someone walking at a pace that fits beside yours.'
          : p === 'returning'
            ? 'And you named where you really are with your deen — returning, and honest about it. That honesty will find you someone who meets you there.'
            : 'And you were honest about where faith sits for you right now. That clarity protects you from a mismatch more than any filter could.'
      return `${intention} ${faith}`
    }
    case 'life': {
      const f = answers['family-role']
      const kids = answers['children']
      const family =
        f === 'central' || f === 'guided'
          ? 'You want your people in the story. That isn’t old-fashioned — it’s protection, and it tells us to look for someone who honours family too.'
          : 'You lead your own decisions with family respected, not ruling. Knowing that now avoids the most common clash later.'
      const vision =
        kids === 'want'
          ? 'The life you want has a clear shape — family in it, direction under it.'
          : 'Even the open questions about the life ahead are named now — which is exactly how the right conversations start.'
      return `${family} ${vision}`
    }
    default:
      return null
  }
}
