import type { Answers, Gender, Identity, ModeId, Stage } from '../types'

/**
 * The AI Guide's knowledge — five guidance MODES, each a different voice and
 * lens. Hand-authored, culturally fluent wisdom for a Muslim
 * / Somali audience. The local engine (lib/coach.ts) selects the active mode,
 * matches the user's message to the best intent within it, and falls back to the
 * mode's own fallback. The Claude seam later swaps the body of askCoach while
 * keeping this same shape — and these voices become the system prompts.
 */

export interface CoachContext {
  identity: Identity
  answers: Answers
  /** She asked for the Guide to stay on this device — never call out. */
  onDeviceOnly?: boolean
  /**
   * Where she is in the arc. This was declared on StageDef from the beginning
   * and never once reached the Guide, so a woman three months into talking to
   * someone was addressed exactly like a woman who has never met anyone.
   */
  stage?: Stage
  /** One line about the read she took on someone. Never his name — we don't have it. */
  readNote?: string
  /** One line about Before you say yes — which conversations they have had. */
  beforeYesNote?: string
}

export interface Starter {
  label: string
  prompt: string
}

export interface CoachIntent {
  keywords: string[]
  respond: (ctx: CoachContext) => string
}

export interface GuidanceMode {
  id: ModeId
  label: string
  tagline: string
  /** One-line description for the picker. */
  description: string
  /** Glyph id rendered by Coach's ModeGlyph (stroke icon, not emoji). */
  glyph: string
  accent: 'gold' | 'forest' | 'clay' | 'sky'
  /** If set, recommended for this audience (still available to all). */
  recommendedFor?: Gender
  greeting: (ctx: CoachContext) => string
  starters: Starter[]
  intents: CoachIntent[]
  /**
   * Never her name: a fallback sits in the thread after her first message, and
   * the thread goes to the live guide as history. The greeting may use it — it
   * comes before her first message and never leaves the phone (src/lib/coach.ts,
   * docs/PRIVACY.md C5).
   */
  fallback: (ctx: CoachContext) => string
}

const NON_NEGOTIABLE_LABELS: Record<string, string> = {
  honesty: 'honesty',
  'faith-nn': 'shared faith',
  respect: 'respect',
  'no-addiction': 'clean living',
  'kids-nn': 'alignment on children',
  'ambition-nn': 'direction in life',
  'kindness-nn': 'good character',
}

function ownNonNegotiables(ctx: CoachContext): string[] {
  const v = ctx.answers['dealbreakers']
  if (!Array.isArray(v)) return []
  return v.map((id) => NON_NEGOTIABLE_LABELS[String(id)]).filter(Boolean)
}

function name(ctx: CoachContext): string {
  return ctx.identity.firstName?.trim() || ''
}

/**
 * How a voice addresses the member. The first name is optional at Identity, so
 * every greeting has to read correctly without one — several did not: both
 * branches of `${name ? '. ' : '. '}` emitted the same string, rendering
 * "Tell me what you're weighing, — a specific person" to anyone who skipped
 * the field.
 */
function addressed(ctx: CoachContext, fallback = 'friend'): string {
  return name(ctx) || fallback
}

// ── Fit: what to look for, in whichever everyday voice is answering ─────────
// These were the Matchmaker's, a sixth voice that could only say "there is
// nobody for me to introduce you to" (removed 2026-09-24, docs/DECISIONS.md).
// The questions stayed real, so their answers moved to the two everyday
// voices; routing sends a question about fit to whichever of them is hers.
function readMap(ctx: CoachContext): string {
  const a = ctx.answers
  const bits: string[] = []
  const faith = a['faith-role']
  if (typeof faith === 'number' && faith >= 4) bits.push('deen at the centre of your home')
  const fam = a['family-role']
  if (fam === 'central' || fam === 'guided') bits.push('your family in the story')
  const tl = a['timeline']
  if (tl === 'within-1' || tl === '1-2') bits.push('marriage within a year or two')
  if (Array.isArray(a['value-most']) && a['value-most'].length)
    bits.push(`the character you said you value most`)
 return bits.length ? bits.join(', ') : 'the life you described'
}

const fit: GuidanceMode['intents'] = [
  {
    keywords: ['fits me', 'right for me', 'kind of person', 'my type', 'compatible', 'match me', 'suited'],
    respond: (ctx) =>
      `Your map says what you are looking for: ${readMap(ctx)}. No map can tell you who will fit. It tells you what to ask about first.

Don’t shop for a feeling. When you meet someone, ask yourself less “do I feel butterflies?” and more “do we want the same life, and is this someone I respect?” Ask it early, and ask it again once you know them.`,
  },
  {
    keywords: ['look for first', 'prioritise', 'prioritize', 'what matters', 'most important', 'first thing'],
    respond: () =>
      `An order worth holding to:
• **Character & deen** first. Honesty, kindness, God-consciousness. Non-negotiable.
• **Direction & alignment** second. Same horizon on faith, family, children, where you’ll live.
• **Emotional availability** third. Can they show up, communicate, repair?
• **Attraction** fourth — it matters, and it is easy to mistake for more than it is.

Put the top first, and test attraction against it rather than the other way round.`,
  },
  {
    keywords: ['green flag', 'green flags', 'good sign', 'good signs', 'what to seek'],
    respond: () =>
      `The green flags worth chasing are quiet, not flashy:
• They’re consistent — the same person on a good day and a bad one.
• They move toward clarity: comfortable talking future, family, intention.
• They treat the powerless well — their parents, staff, strangers.
• They can disagree without cruelty, and apologise without ego.
• Their words and actions match over time.

Notice: none of these show up in a photo.`,
  },
  {
    keywords: ['alignment', 'attraction', 'chemistry', 'spark', 'butterflies'],
    respond: () =>
      `Attraction is real, and it matters. What it cannot tell you is whether your lives fit.

That — faith, family, money, children, pace — you find out by asking, not by feeling. So feel the spark, then ask, and choose on what you find out, with deen and character first.`,
  },
]

// ── Wise Auntie ──────────────────────────────────────────────────────────────
const auntie: GuidanceMode = {
  id: 'auntie',
  label: 'Wise Auntie',
  tagline: 'Warm, direct, culturally aware',
  description: 'The eedo who loves you enough to be direct.',
  glyph: 'seed',
  accent: 'gold',
  recommendedFor: 'woman',
  greeting: (ctx) =>
    `Kaalay, ${name(ctx) || 'my dear'}. Sit with your auntie a moment.

I love you too much to let you waste your time or your heart. Tell me what’s happening — the real thing, not the polished version. I won’t judge you.`,
  starters: [
    { label: 'Is he serious, or just passing time?', prompt: 'Auntie, is he serious about me or just passing time?' },
    { label: 'He only texts me late at night', prompt: 'He only texts me late at night. What does that mean?' },
    { label: 'How do I bring my family in?', prompt: 'How do I bring my family into this without scaring him off?' },
    { label: 'Am I settling, or too picky?', prompt: 'Am I settling for less, or am I being too picky?' },
  ],
  intents: [
    {
      keywords: ['serious', 'passing time', 'entertaining', 'playing', 'wasting', 'intentions', 'just talking'],
      respond: () =>
        `My dear, don’t confuse late-night texting with intention. A man who wants to marry you moves *toward* your family, not away from them. He talks about the future without sweating.

Watch his feet, not his mouth — does he show up consistently? Does he want to meet your people? If he keeps everything vague and “fun,” walaal, that vagueness *is* his answer. Ask him plainly. Asking is not too much.`,
    },
    {
      keywords: ['late', 'night', '2am', 'midnight', 'after dark', 'only texts', 'only when', 'booty'],
      respond: () =>
        `Hmm. Let your auntie be honest with you: texting only after midnight is not courting, whatever it feels like at midnight. Good intentions keep daytime hours.

You are not a secret. You are not a midnight habit. If he cannot text you at noon, plan to meet your family, and speak about marriage in daylight, that is your answer. Watch what he does next.`,
    },
    {
      keywords: ['family', 'wali', 'parents', 'mother', 'father', 'brother', 'scare him', 'tell my'],
      respond: () =>
        `That instinct is the right one. A man worth having *expects* your family.

Bring them in gently, once it’s real: “For me, this leads to my family — that’s just how I do things seriously.” Then watch his face. If it scares him off, walaal, you have learned early that he was not ready for your family, and you just saved yourself time. Your people protect you. Let them.`,
    },
    {
      keywords: ['settling', 'too picky', 'standards', 'unrealistic', 'expecting too much', 'should i lower'],
      respond: (ctx) => {
        const nn = ownNonNegotiables(ctx)
        const yours = nn.length
          ? `You already told me your non-negotiables: ${nn.join(', ')}. Hold that list like iron.`
          : `Standards are about *character* — honesty, kindness, deen, how he treats his mother. Hold those like iron; never lower them.`
        return `Listen to me. There is a difference between standards and a wish-list. ${yours}

The wish-list — the height, the salary, the perfect family — soften that. No one is complete. The question is never “is he perfect?” It is “is he good, and is he good *for me*?” Don’t settle on character. Don’t crucify a good man for not being a fantasy.`
      },
    },
    ...fit,
  ],
  fallback: () =>
    `Come, my dear, tell your auntie properly — what did he say, what did you feel, what are you afraid of? Give me the real story and I’ll tell you what I see, the way someone who loves you does.`,
}

// ── Big Brother ──────────────────────────────────────────────────────────────
const brother: GuidanceMode = {
  id: 'brother',
  label: 'Big Brother',
  tagline: 'Straight talk, brother to brother',
  description: 'The older brother who keeps it real and keeps you accountable.',
  glyph: 'people',
  accent: 'forest',
  recommendedFor: 'man',
  greeting: (ctx) =>
    `Alright, ${name(ctx) || 'akhi'}. Brother to brother, no fluff.

I’m not here to hype you up — I’m here to keep you honest and effective. You want to do this right, with respect and intention. Tell me where you’re at and I’ll give it to you straight.`,
  starters: [
    { label: 'How do I state my intention clearly?', prompt: 'How do I state my intention for marriage clearly without it being awkward?' },
    { label: 'I keep flirting in circles', prompt: 'I keep flirting in circles and not getting anywhere. Help.' },
    { label: 'What do I say to her wali?', prompt: 'What do I say to her father or brother when the time comes?' },
 { label: 'How do I stop wasting time?', prompt: 'How do I stop wasting time and move toward marriage?' },
  ],
  intents: [
    {
      keywords: ['flirting', 'in circles', 'going nowhere', 'banter', 'small talk', 'vague', 'dragging'],
      respond: () =>
        `Stop flirting in circles. State your intention clearly and respectfully — that’s strength.

Try: “I want to be upfront — I’m looking for marriage, and I’d like to get to know you for that. Is that what you want too?” That one sentence gets you an answer, and it is a respectful way to ask for one. Vagueness is a coward’s game, akhi. You’re not that.`,
    },
    {
      keywords: ['intention', 'desperate', 'awkward', 'too strong', 'scare her', 'come on strong'],
      respond: () =>
        `Intention and desperation are not the same thing. Desperation rushes *her*. Intention is just clear about *you*.

Say what you’re about — “I’m serious, and I’m taking my time to do it right” — then give her room to breathe. Don’t blow up her phone. Consistency over three weeks beats intensity on day two. A man who knows what he’s building doesn’t grovel; he invites.`,
    },
    {
      keywords: ['her father', 'her brother', 'her wali', 'guardian', 'her family', 'her dad', 'parents'],
      respond: () =>
        `This is where you become a man in their eyes. Come correct.

• Lead with honour: “I’ve come to you because I’m serious about her for marriage, and I want to do this the right way.”
• Be ready to speak plainly — your deen, your work, how you’ll provide and protect.
• Ask him: “What matters most to you in the man who marries her?” Respect goes a long way.
• Hide nothing you’d regret later. Honesty now is the foundation of everything.

You’re not asking to date her. You’re declaring serious, honourable intent. Stand tall in that.`,
    },
    {
      keywords: ['wasting time', 'stop wasting', 'how long', 'next step', 'move toward', 'lead', 'stuck', 'nikah', 'propose'],
      respond: (ctx) => {
        const tl = ctx.answers['timeline']
        const tlLine = tl === 'within-1'
          ? ' You set your own timeline at within a year — so act like a man who meant it.'
          : tl === '1-2'
            ? ' You told your map one to two years — that only happens if the months count.'
            : ''
        return `Time’s the one thing you can’t earn back, so lead.${tlLine} Leading isn’t pushing — it’s giving clarity at every step so nobody’s guessing.

• Get aligned on the big things first: deen, family, kids, where you’d live.
• Bring the families in once it’s real — don’t let it float for months.
• Name it out loud: “I see this going to marriage. I want to involve our families and take the next step.”
• Then act. Set the meeting. Talk to the wali. Drifting is the enemy — you beat it by deciding.`
      },
    },
    ...fit,
  ],
  fallback: () =>
    `Talk to me straight, akhi — what’s the actual situation? What did you say, what did she say, where’s it stuck? Give me the details and I’ll tell you the move.`,
}

// ── Therapist ────────────────────────────────────────────────────────────────
const therapist: GuidanceMode = {
  id: 'therapist',
  label: 'Therapist',
  tagline: 'Attachment, anxiety, regulation',
  description: 'A calm space to understand what’s happening inside you.',
  glyph: 'heart',
  accent: 'sky',
  greeting: (ctx) =>
    `Take a breath with me, ${name(ctx) || 'friend'}. You don’t have to perform here.

Here you can slow down and look at what is going on in you — the overthinking, the spirals, the pulling away — without being judged for it. What’s going on?`,
  starters: [
    { label: 'I can’t stop overthinking his replies', prompt: 'I can’t stop overthinking every reply he sends. Help me.' },
    { label: 'I think I’m anxiously attached', prompt: 'I think I have anxious attachment. What does that mean for me?' },
 { label: 'Why do I pull away when I like someone?', prompt: 'Why do I pull away or go cold when I like someone?' },
    { label: 'Help me calm a spiral', prompt: 'I’m spiralling right now. Help me calm down.' },
  ],
  intents: [
    {
      keywords: ['overthink', 'overthinking', 'spiral', 'spiralling', 'spiraling', 'cant stop', "can't stop", 'in my head', 'reading too much', 'analysing'],
      respond: (ctx) =>
        `Let’s slow it down together. Overthinking is usually your mind trying to protect you from not knowing — it is not a sign something is wrong.

Try separating *fact* from *story*. On one side: what happened (“he replied after four hours”). On the other: the story your mind added (“he’s losing interest”). Almost always, the facts are far calmer than the story.${(() => {
          const cs = ctx.answers['comm-safety']
          if (!Array.isArray(cs) || cs.length === 0) return ''
          const map: Record<string, string> = { consistency: 'consistency', directness: 'directness', gentleness: 'gentleness', reassurance: 'reassurance', space: 'respected space', 'follow-through': 'follow-through' }
          const names = cs.map((id) => map[String(id)]).filter(Boolean).slice(0, 2)
          return names.length ? ` And remember what you told your map: ${names.join(' and ')} are what make you feel safe. Measure this person against that — not against your anxiety.` : ''
        })()} You are not in charge of his feelings, only of how you act on yours.`,
    },
    {
      keywords: ['anxious', 'anxiously attached', 'attachment', 'reassurance', 'needy', 'clingy', 'fear of losing'],
      respond: (ctx) => {
        const lean = ctx.answers['attachment'] === 'anxious'
        const intro = lean
          ? `You named this in your map, so let’s honour it: your heart leans anxious. That isn’t a flaw — it’s a pattern that once kept you safe.`
          : `An anxious lean means closeness can trigger a fear of losing it — so you seek reassurance, and silence feels like danger.`
        return `${intro}

The aim is not to stop feeling anxious. It is to not *act* from it. When the wave comes: name it (“this is the fear, not the truth”), let it pass, and wait before responding. Reach for steadiness — your salah, a walk, a friend — instead of his phone. Over time the silence stops feeling like danger.`
      },
    },
    {
      keywords: ['pull away', 'pull back', 'go cold', 'avoidant', 'distance', 'shut down', 'walls', 'guarded', 'independent'],
      respond: () =>
        `Pulling away is protection, not cruelty. When someone gets close, part of you braces for being hurt or crowded, so you make distance to feel safe again.

The skill is to *notice the urge before you act on it*. When you feel the wall going up, try naming it instead of vanishing: “I’m feeling the need for space.” That one sentence keeps the connection alive while you breathe. The right person can hold your need for space without taking it as rejection — but they can only do that if you tell them, rather than disappear.`,
    },
    {
      keywords: ['calm', 'spiralling now', 'panic', 'anxiety', 'cant breathe', 'overwhelmed', 'right now', 'help me'],
      respond: () =>
        `Okay — right now, let’s just slow down. Nothing to fix this minute.

• Feel your feet on the floor. Look around and name five things you can see.
• Breathe out longer than you breathe in — four counts in, six counts out, a few times.
• Put the phone down. You don’t have to reply to anything in this state.

This passes. Nothing needs deciding while it is here. When it settles, we can think. Stay with me — what is happening right now?`,
    },
    {
      keywords: ['healing', 'past', 'heartbreak', 'ex', 'baggage', 'trauma', 'hurt before'],
      respond: () =>
        `Nobody arrives finished. Arriving *aware* is enough, and asking is part of it.

What matters is that your past doesn’t silently run the present. Notice when an old hurt is set off by a new person who has not earned that reaction. You can carry tenderness and still move forward, as long as you are honest about what is yours to carry. Be patient with yourself.`,
    },
  ],
  fallback: () =>
    `Whatever it is, friend, you can put it down here. Tell me what you’re feeling and what set it off, and we’ll make sense of it slowly.`,
}

// ── Islamic Values ───────────────────────────────────────────────────────────
const islamic: GuidanceMode = {
  id: 'islamic',
  label: 'Islamic Values',
  tagline: 'Intention, modesty, family, respect',
  description: 'Deen, dignity, and a halal path.',
  glyph: 'crescent',
  accent: 'forest',
  greeting: (ctx) =>
    `Bismillah. As-salaamu alaykum, ${addressed(ctx)}.

Let’s anchor this in what our deen teaches — that marriage is half of faith, built on intention, modesty, and mercy. I can help you walk this path with dignity. (For formal rulings, always return to a trusted scholar.) What’s on your heart?`,
  starters: [
    { label: 'How do we get to know each other halal?', prompt: 'How do two people get to know each other for marriage in a halal way?' },
    { label: 'How do I keep my limits while we talk?', prompt: 'How do I keep my limits while we’re getting to know each other?' },
    { label: 'What makes a marriage blessed?', prompt: 'What makes a marriage blessed in Islam?' },
    { label: 'How involved should family be?', prompt: 'How involved should family and the wali be in Islam?' },
  ],
  intents: [
    {
      keywords: ['halal', 'get to know', 'talking stage', 'allowed', 'permissible', 'is it ok', 'courting', 'how to'],
      respond: () =>
        `The beautiful thing about our path is that it protects the heart while it’s deciding. Getting to know someone for marriage is encouraged — the Prophet ﷺ told a man to *look* at the one he intended to marry.

A few anchors:
• Keep the intention clear: this is for marriage, not entertainment.
• Avoid khalwa — being alone in private. Meet in open settings, ideally with family aware.
• Keep conversation purposeful and respectful, not flirtatious or late-night secrecy.
• Involve the wali as it gets serious.

The point is dignity, not suspicion. You can be warm and still be honourable.`,
    },
    {
      keywords: ['boundaries', 'modesty', 'haram', 'too far', 'flirt', 'physical', 'hijab', 'lower gaze', 'guard'],
      respond: () =>
        `Limits are not coldness. They are adab — how you honour both of you before a contract binds you — and they protect what you are hoping to build.

Practically: keep conversation in daylight and with purpose, avoid being alone together, and don’t let things drift into the physical or the flirtatious. If you feel things slipping, that’s your signal to bring in family and move toward making it real — nikah — rather than lingering in a grey zone. Modesty here is a gift you give your future marriage, not a punishment.`,
    },
    {
      keywords: ['intention', 'niyyah', 'sincere', 'why marriage', 'blessed', 'barakah', 'baraka', 'sunnah'],
      respond: () =>
        `Everything begins with niyyah — “actions are but by intentions.” Ask yourself honestly: am I seeking this for the sake of Allah, for sakinah and a righteous home, or for ego, loneliness, or status?

A blessed marriage tends to be marked by: choosing for deen and character first (“choose the one of deen, may your hands be dusty”), kindness — “the best of you are best to their families” — gratitude, and keeping Allah at the centre. Purify the intention, make du’a, and pray istikhara. Barakah follows sincerity, not perfection.`,
    },
    {
      keywords: ['family', 'wali', 'guardian', 'parents', 'involve', 'her father', 'permission'],
      respond: () =>
        `Family and the wali aren’t bureaucracy — they’re a mercy and a protection, especially for the woman. A marriage built in the open, with families honoured, starts on solid ground.

For a sister, the wali’s involvement is part of the path and a safeguard of her rights. For a brother, approaching the family with respect is how you prove your seriousness. Bring them in as soon as it’s real. What’s done in the light, with the people who love you, carries barakah that secrecy never can.`,
    },
    {
      keywords: ['respect', 'character', 'how he treats', 'kindness', 'red flag', 'akhlaq'],
      respond: () =>
        `In our deen, character — akhlaq — is the truest measure. “The most complete of believers in faith are the best of them in character, and the best of you are those best to their wives.”

So look past charm to how they treat people: their parents, the waiter, those who can do nothing for them. Watch for honesty, gentleness, and God-consciousness in private, not just performance in public. Beauty and wealth fade; taqwa and good character are what you’ll lean on for a lifetime.`,
    },
  ],
  fallback: () =>
    `Tell me what you’re navigating, friend, and we’ll look at it through the lens of our deen — with intention, modesty, and mercy. (And for any ruling you need to be certain of, take it to a trusted scholar.)`,
}

export const modes: GuidanceMode[] = [
  auntie,
  brother,
  therapist,
  islamic,
]

export function getMode(id: ModeId): GuidanceMode {
  return modes.find((m) => m.id === id) ?? auntie
}

/** Default mode suggested for a given audience. */
export function defaultModeFor(gender?: Gender): ModeId {
  return gender === 'man' ? 'brother' : 'auntie'
}
