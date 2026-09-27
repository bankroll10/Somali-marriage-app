import type { PropertyId } from './properties'

/**
 * What the detectors and the judge are calibrated on: real lines the product
 * shipped and then removed, each with the line that replaced it and the
 * property it broke (docs/GUIDE-EVAL.md, "Relationship judgment").
 *
 * `by: 'detector'` lines must be caught by ./properties.ts `scriptFindings`,
 * and their replacements must pass it (./scripts.test.ts). `by: 'judge'` lines
 * are the ones no rule can see: the judge must call them violated, and their
 * replacements held, before its verdicts count (./judge.ts `calibrate`, live).
 * A line written for the harness, rather than removed from the product, says
 * so in `from`.
 *
 * Add to this whenever a Part removes a line for how it sounds. That is the
 * corpus growing where it matters: on the mistakes this product has made.
 */
export interface Calibration {
  bad: string
  good: string
  breaks: PropertyId
  by: 'detector' | 'judge'
  /** The commit or Part that removed it, or "synthetic". */
  from: string
}

export const CALIBRATION: Calibration[] = [
  // ── Part 11 (8dc3660): the words, audited as speech ────────────────────────
  {
    bad: 'I want to ask you something straight, because I would rather ask than wonder. Does anyone in your life know about me? I am not asking you to announce it tomorrow — I am asking whether you plan to, and roughly when.',
    good: 'Can I ask you something straight? I’d rather ask than wonder. Does anyone in your life know about me? I’m not asking you to announce it tomorrow — just whether you plan to, and roughly when.',
    breaks: 'NATURAL_REGISTER',
    by: 'detector',
    from: 'Part 11, 8dc3660 (read: public)',
  },
  {
    bad: 'When you picture being married — is that this year, next year, or further out? I am not trying to hold you to a date. I just need to know whether we are imagining the same thing.',
    good: 'When you picture being married — is that this year, next year, or further out? I’m not trying to hold you to a date. I just need to know if we’re picturing the same thing.',
    breaks: 'NATURAL_REGISTER',
    by: 'detector',
    from: 'Part 11, 8dc3660 (read: intent)',
  },
  {
    bad: 'How would you want to approach my family? I would rather hear how you would do it than wonder whether you would.',
    good: 'Have you thought about how you’d approach my family — who you’d speak to first, and when? I’d rather ask than guess.',
    breaks: 'NATURAL_REGISTER',
    by: 'detector',
    from: 'Part 11, 8dc3660 (read: family)',
  },
  {
    bad: 'Can I say something? I have noticed I am usually the one who starts, and the one keeping plans moving. I am not keeping score — I just want to know whether it looks that way from your side too.',
    good: 'Can I say something? I’ve noticed I’m usually the one who messages first and keeps our plans moving. Does it look that way from your side?',
    breaks: 'NATURAL_REGISTER',
    by: 'detector',
    from: 'Part 11, 8dc3660 (read: consistency)',
  },
  {
    bad: 'When I bring up something that is bothering me, I come away feeling like I have done something wrong. I do not think you mean it that way — but I need you to hear that it lands like that.',
    good: 'Can I tell you something? When I bring up something that’s bothering me, I often come away feeling like I’m the one who did something wrong. I don’t think you mean it that way. But I want us to be able to talk about hard things without either of us ending up feeling like that.',
    breaks: 'NO_THERAPY_SPEAK',
    by: 'detector',
    from: 'Part 11, 8dc3660 (read: pressure)',
  },
  {
    bad: 'Before we go further — can I ask what you are looking for? I would rather know now than in three months.',
    good: 'Before we go further — can I ask what you’re looking for? I’d rather know now than in three months.',
    breaks: 'NATURAL_REGISTER',
    by: 'detector',
    from: 'Part 11, 8dc3660 (read: early)',
  },
  {
    bad: 'I’m feeling the need for space.',
    good: 'I need a bit of time to myself — I’ll come back to you.',
    breaks: 'NO_THERAPY_SPEAK',
    by: 'detector',
    from: 'Part 11, 8dc3660 (the therapist voice)',
  },
  {
    bad: 'Can we talk about money plainly, the way our parents never did with us? What do you send home each month, and to whom? I’ll tell you mine.',
    good: 'Can we talk about money plainly? Do you send money home, and who to? I’ll tell you mine.',
    breaks: 'SOMALI_NATURAL',
    by: 'detector',
    from: 'Part 11, 8dc3660 (eleven: money-home); "who to" Part 19',
  },
  {
    bad: 'I want to ask about your family and our home — not to set rules, just so I’m not surprised later. Do you picture anyone living with us, now or one day? And how much hosting do you imagine — because I’d rather plan for it than come to resent it.',
    good: 'I want to ask about your family and our home — not to set rules, just so I’m not surprised later. Do you picture anyone living with us, now or one day? And how much hosting do you imagine? I’d rather we plan for it together than have it all land on one person.',
    breaks: 'NO_ACCUSATION',
    by: 'judge',
    from: 'Part 11, 8dc3660 (eleven: his-family-in-home): resentment held over him in advance',
  },
  {
    bad: 'I want to be honest about something. I intend to keep working, including after children, and I’d want to know now if that’s something you’d struggle with.',
    good: 'Can we talk about work? I’ll tell you what I picture after we’re married, and after children, and I want to hear what you picture.',
    breaks: 'AUTONOMY',
    by: 'judge',
    from: 'Part 11, 8dc3660 (eleven: work): put one answer in every woman’s mouth',
  },
  {
    bad: 'Aabo, I want to tell you about someone, and I want you to hear it from me first. I met him online. He is serious, he wants to do this properly, and he has asked how to approach you.',
    good: 'Aabo, I want to tell you about someone, and I want you to hear it from me first. I met him online. I believe he’s serious, and he wants to do this properly.',
    breaks: 'UNCERTAINTY',
    by: 'judge',
    from: 'Part 11, 8dc3660 (families: tell-wali-online): asserted what she could not know',
  },
  {
    bad: 'What happens when your family and mine want different things? Between us, how do we decide? I want to be a team with you before we have to be.',
    good: 'What happens when your family and mine want different things? Between us, how do we decide? I’d rather we work that out now, before it happens.',
    breaks: 'NATURAL_REGISTER',
    by: 'judge',
    from: 'Part 11, 8dc3660 (eleven: families-disagree): a polished closer nobody says',
  },
  {
    bad: 'I’d like you to send your people to my family. I’m not asking for a date — I’m asking for the step.',
    good: 'I’d like you to send your people to my family. I’m not asking you to name a day — just to take that step.',
    breaks: 'NATURAL_REGISTER',
    by: 'judge',
    from: 'Part 11, 8dc3660 (families: send-his-people): a riddle',
  },
  // ── Earlier, and Part 18 ──────────────────────────────────────────────────
  {
    bad: 'Tell me what you’re feeling and what triggered it, and we’ll make sense of it slowly.',
    good: 'Tell me what you’re feeling and what set it off, and we’ll make sense of it slowly.',
    breaks: 'NO_THERAPY_SPEAK',
    by: 'detector',
    from: '7be8fdd (therapy language only where a therapist speaks)',
  },
  {
    bad: 'How do I keep boundaries while we talk?',
    good: 'How do I keep my limits while we’re getting to know each other?',
    breaks: 'NO_THERAPY_SPEAK',
    by: 'detector',
    from: '7be8fdd (the Islamic voice’s starter)',
  },
  {
    bad: 'Can I ask something we’re not supposed to ask? Will qabiil come up — from your side, or mine?',
    good: 'Can I ask something people don’t usually ask? Will qabiil come up — from your side, or mine?',
    breaks: 'SOMALI_NATURAL',
    by: 'detector',
    from: 'Part 18, 1916856 (eleven: qabiil): a rule asserted as fact',
  },
  {
    bad: 'It costs you something to stand in front of her father and say it out loud. That is why it counts — and why every month you wait, she is the one carrying the question.',
    good: 'It costs you something to stand in front of her father and say it out loud. That is why it counts.',
    breaks: 'NO_MOTIVE',
    by: 'judge',
    from: 'Part 18, 1916856 (families: approach-her-family, why): a claim about her, used as pressure on him',
  },
  // ── Written for the harness: the kinds of line no Part has had to remove ──
  {
    bad: 'Why do you always go quiet when I bring up your family?',
    good: 'Can I say something? I’ve noticed I’m usually the one who messages first and keeps our plans moving. Does it look that way from your side?',
    breaks: 'NO_ACCUSATION',
    by: 'detector',
    from: 'synthetic',
  },
  {
    bad: 'You never make plans with me, and it makes me feel like I don’t matter to you.',
    good: 'I’ve noticed I’m usually the one making our plans. Does it look that way from your side?',
    breaks: 'NO_ACCUSATION',
    by: 'detector',
    from: 'synthetic',
  },
  {
    bad: 'If you change the subject again, that tells me you’re not serious about this.',
    good: 'I’ve told you the things I won’t compromise on, and I need a plain answer — not agreement, and not an argument. Just where you stand.',
    breaks: 'NO_HIDDEN_INTERPRETATION',
    by: 'detector',
    from: 'synthetic',
  },
  {
    bad: 'Hooyo, I need you to validate that this is my choice.',
    good: 'Hooyo, I want you in this from the start, and I need this choice to be mine.',
    breaks: 'NO_THERAPY_SPEAK',
    by: 'detector',
    from: 'synthetic',
  },
  {
    bad: 'I’ll ask one question, and how you answer will show me whether you really want this.',
    good: 'When you picture being married — is that this year, next year, or further out?',
    breaks: 'NO_HIDDEN_INTERPRETATION',
    by: 'judge',
    from: 'synthetic: a test announced, with no pattern a rule could hold',
  },
]

/**
 * Lines the detectors must NOT flag, each with why: the false positives a
 * careless pattern would produce. A detector that catches these has become a
 * phrase ban, and the fix is the pattern, not the copy.
 */
export const MUST_PASS: [string, string][] = [
  ['I want to say something plainly, so you never have to ask it.', 'a promise, not a charge'],
  ['Can I ask you something straight? I’m not accusing you of anything.', 'names the fear of accusing; does not accuse'],
  ['I don’t think you mean it that way.', 'grants good faith; reads no mind'],
  ['Can we stop here and pick it up tomorrow? I want to sort this out, not win it.', 'a pause, asked for'],
  ['Please ask me before you agree to anything that changes where we live.', 'a request to a parent'],
]
