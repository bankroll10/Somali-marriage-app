/**
 * The eleven conversations — the content, and nothing else.
 *
 * Split out of beforeYes.ts on 2026-09-17 so that the build can load it: the
 * printable guide at /guides/before-you-say-yes is written from these words at
 * build time by vite.config.ts, which is typechecked under tsconfig.node.json
 * and cannot follow an import into src/data/read.ts. So this file has no
 * runtime imports and defines the one shape it needs. Everything that reads
 * the eleven inside the app still goes through beforeYes.ts, which re-exports
 * all of this unchanged.
 *
 * Every string here is written to one reader about the person they are
 * talking to, in pronoun tokens — {he}, {his}, {him} — resolved by
 * src/data/read.ts `speak()` for a woman or a man, and by the guide's neutral
 * voice for a couple reading together.
 *
 * Where the conversation itself changes side — who keeps working, who would
 * take a second wife, whose family moves in — a token swap produces a
 * different question, not the same one asked the other way round. A man
 * reading a woman was handed "A second wife — what she believes about it for
 * her own life" and a script asking her whether she would want one. Those
 * topics carry a `man` variant, merged by `beforeYesTopics` the way read.ts
 * merges its own. The base strings are the woman's, and the printed guide
 * reads them through its neutral voice, so they must also hold for a couple
 * reading together — no sentence here names a side by role (docs/DESIGN.md).
 */

/** A script: why this is the question, the words, and how to read the answer. Mirrors `Script` in read.ts. */
export interface ElevenScript {
  /** Why this is the question that matters right now. */
  why: string
  /** Word for word. */
  words: string
  /** How to read whatever comes back. */
  tells: string
}

/**
 * Her own side, read from her map where the map already knows it. Shown under
 * the question so she is not asked to have an opinion she has already given.
 */
export interface YourSide {
  question: 'children' | 'family-role' | 'practice' | 'household' | 'work' | 'money-home'
  lines: Record<string, string>
}

export interface Topic {
  id: string
  /** As it appears in lists. */
  label: string
  /** The conversation, named, with what it actually covers. */
  prompt: string
  /** 0–1. How much rides on this one. Decides which gap gets the words. */
  consequence: number
  /** Why this one is found out too late, specifically in our families. */
  why: string
  script: ElevenScript
  yourSide?: YourSide
  /** A man's version, where the woman's would ask the wrong question the other way round. */
  man?: { label?: string; prompt?: string; why?: string; script?: Partial<ElevenScript> }
}

export const TOPICS: Topic[] = [
  {
    id: 'live',
    label: 'Where you’d live',
    prompt: 'Where you’d live — which city, and whether with {his} mother, near her, or on your own.',
    consequence: 0.95,
    why: 'This is rarely decided by two people alone, and it is easy to assume rather than ask. One of you pictures a house with family in it; the other pictures a front door of your own. Two people can agree on everything else and find out only once the lease is signed that they pictured different homes.',
    script: {
      why: 'Where you live decides who is in your home every day, and it is easy not to ask until the lease is signed.',
      words:
        'Can I ask you something practical? When you picture us married — where are we living? Which city, and are we with your family, near them, or on our own? I’m not asking for a promise. I want to know what you’ve been picturing.',
      tells:
        'Listen for whether {he} has pictured it at all. “Wherever you want” sounds generous and names no city: ask which one. A specific answer you don’t like is worth more than a vague one you do.',
    },
    yourSide: {
      question: 'household',
      lines: {
        'with-family': 'You told your map you picture living with family — one household.',
        'near-family': 'You told your map you picture your own place, close to family.',
        separate: 'You told your map you picture your own place — your own city, if it comes to it.',
 flexible: 'You told your map you are flexible on where you’d live.',
      },
    },
  },
  {
    id: 'his-family-in-home',
    label: '{His} family in your home',
    prompt: '{His} family in your home — how much hosting, and whether a sister or {his} mother might live with you one day.',
    consequence: 0.8,
    why: 'Hosting is honour, and it is also labour, and somebody carries it. The difference between a family that visits and a family that moves in is easy to leave unnamed until the suitcase is in the hallway.',
    man: {
      label: 'Your family in your home',
      prompt: 'Your family in your home — how much hosting, and whether your mother or a sister might live with you one day.',
      script: {
        why: 'You are not asking permission. You are finding out whether she has pictured your family in that house, or only agreed to the idea of them.',
        words:
          'I want to ask about my family and our home, so nothing surprises you later. Would you be alright with someone from my side living with us one day? And how much hosting feels right to you — I’d rather we plan for it than have you come to resent it.',
        tells:
          'Listen for whether she has pictured it, or only agreed to it. A quick yes with nothing behind it is the answer that comes back in year two. Answer the same questions yourself, out loud, before you leave the subject.',
      },
    },
    script: {
      why: 'You are not setting a rule. You are finding out whether {he} has pictured you in that house, or only {his} mother.',
      words:
        'I want to ask about your family and our home — not to set rules, just so I’m not surprised later. Do you picture anyone living with us, now or one day? And how much hosting do you imagine — because I’d rather plan for it than come to resent it.',
      tells:
        'Listen for whether {he} answers both halves — who lives with you, and how it would be for you. If {he} hears only the first half, as an insult to {his} mother, you have seen how {he} hears it when it is raised. Say the second half again, plainly.',
    },
  },
  {
    id: 'work',
    label: 'Whether you’d work',
    prompt: 'Work — whether you’d keep working after marriage and after children, and what {he} assumes about home.',
    consequence: 0.75,
    why: '“Of course” is easy to say before the first baby, when what each of you assumed about home surfaces. The question is not whether one of you minds the other working. It is what each of you pictures happening at home while you both do.',
    man: {
      prompt: 'Work — whether she’d keep working after marriage and after children, and what you each assume about home.',
      script: {
        why: 'Her “of course” and yours are both the start of the answer, not the end of it.',
        words:
          'I want to be honest about something. I’d like to know what you picture about work after we’re married and after children — and I’ll tell you what I picture at home. Not in general, in practice: who does what when we’re both working?',
        tells:
          'Ask the second half — who does what at home — and answer it yourself first, plainly. If your own answer is a joke, that is the answer she will hear.',
      },
    },
    script: {
      why: '“Of course” is the start of the answer, not the end of it.',
      words:
        'I want to be honest about something. I intend to keep working, including after children, and I’d want to know now if that’s something you’d struggle with — not in general, but in practice: who does what at home when we’re both working?',
      tells:
        'Ask the second half — who does what at home — and watch whether {he} has an answer or a joke. The joke is the answer.',
    },
    yourSide: {
      question: 'work',
      lines: {
        both: 'You told your map you both keep working.',
        seasons: 'You told your map it changes with children — in seasons.',
        'one-home': 'You told your map you picture one of you at home.',
        unsure: 'You told your map you haven’t decided about work.',
      },
    },
  },
  {
    id: 'money-home',
    label: 'Money sent home',
    prompt: 'Money — who pays for what, and what each of you sends home to family every month.',
    consequence: 0.85,
    why: 'Money sent home is easy to leave unsaid until after the wedding. It is not about generosity. It is two families’ expectations landing on one income, unspoken.',
    script: {
      why: 'If nobody talked about money with you growing up, that is a reason to talk about it with {him}, not a reason to skip it.',
      words:
        'Can we talk about money plainly, the way our parents never did with us? What do you send home each month, and to whom? I’ll tell you mine. And once we’re married — do we decide that together, or is each of ours separate?',
      tells:
        'You are not looking for a number. You are looking for whether {he} will say it out loud, and whether “together” comes easily or makes {him} defensive. Someone who can name {his} obligations can be planned around. Someone who won’t, can’t.',
    },
    yourSide: {
      question: 'money-home',
      lines: {
        expected: 'You told your map money home is expected — every month, from both of you.',
        some: 'You told your map some, when you can.',
        little: 'You told your map little or none.',
        unsure: 'You told your map you haven’t thought about money home yet.',
      },
    },
  },
  {
    id: 'children',
    label: 'Children',
    prompt: 'Children — how many, how soon, and whether they’d speak Somali at home and go to dugsi.',
    consequence: 0.9,
    why: '“Inshallah, when Allah wills” covers a wide range of very different lives. How soon, how many, Somali in the house, dugsi on Saturdays — these are decisions, and they get made whether or not you make them together.',
    script: {
      why: 'Vagueness here is not romance. It is a decision being left to whoever pushes hardest later.',
      words:
 'When you think about children — how many, and how soon after we’re married? And what matters to you about raising them — Somali at home, dugsi, what they’d call your mother? I want to hear what you picture, not what sounds right.',
      tells: 'Listen for whether {he} has pictures or only phrases. Pictures can be talked about. Phrases cannot.',
    },
    yourSide: {
      question: 'children',
      lines: {
        want: 'You told your map you want children.',
        open: 'You told your map you are open to children.',
        unsure: 'You told your map you are unsure about children.',
        no: 'You told your map you don’t want children.',
      },
    },
  },
  {
    id: 'deen-daily',
    label: 'Deen, day to day',
    prompt: 'Deen, day to day — prayer at home, what “practising” means on an ordinary Tuesday, and what {he} expects of you.',
    consequence: 0.85,
    why: 'Two people can both say “deen comes first” and mean completely different Tuesdays. One means fajr together; the other means Eid and Ramadan. And what each of you expects of the other — at home, in company, in what comes into the house — is something you each have an opinion on, whether or not you have said it.',
    man: {
      prompt: 'Deen, day to day — prayer at home, what “practising” means on an ordinary Tuesday, and what you each expect of the other.',
      script: {
        why: 'An expectation you assumed she would know is the one that becomes a fight in year two — and the same is true of hers.',
        words:
          'We both say deen matters. Can I ask what that looks like for you on a normal day — prayer, and what you’d want in the house and not in it? And I’ll say what I’d expect, including anything I might have assumed you’d know.',
        tells: 'Say your half first, and say it plainly. Then note whether her answer is specific, and whether it is about the two of you rather than a list for you.',
      },
    },
    script: {
      why: 'An expectation {he} “assumed you’d know” is one you never got to agree to.',
      words:
        'We both say deen matters. Can I ask what that looks like for you on a normal day — prayer, and the things you’d want in the house and not in it? And is there anything you’d expect of me that you haven’t said, because you assumed I’d know?',
      tells: 'The second question is the real one. Note whether the answer is specific, and whether it is about {him} as much as about you.',
    },
    yourSide: {
      question: 'practice',
      lines: {
        devout: 'You described your own practice to your map as devout.',
        consistent: 'You described your own practice to your map as consistent.',
        returning: 'You told your map you are returning to your practice.',
        cultural: 'You told your map the faith is home for you, and the practice is uneven.',
      },
    },
  },
  {
    id: 'aroos-mahr',
    label: 'The aroos and the mahr',
    prompt: 'The aroos and the mahr — how big a wedding, who pays, and what your two families will expect.',
    consequence: 0.6,
    why: 'The wedding is where two families’ expectations meet in public, with money attached. Leave it unsaid and you can end up carrying a debt, or a resentment, that was never yours.',
    script: {
      why: 'Better to hear it from each other than to hear a number through someone else.',
      words:
        'I want to talk about the wedding before our families do — what you imagine, what’s realistic, and what you think each of our families will expect. And the mahr: I’d rather we discuss it between us first than hear a figure through somebody else.',
      tells:
        'Watch whether {he} treats it as something you two decide, or something that will be decided for you both. Either can work. You just need to know which one you are marrying into.',
    },
  },
  {
    id: 'qabiil',
    label: 'Qabiil',
    prompt: 'Qabiil — whether either of your families will make it a question, and what the two of you have said to each other about it.',
    consequence: 0.7,
    why: '“It doesn’t matter to me” can be true of both of you and still not settle it. The question was never only about you two. It is whether either family will raise it — and whether {he} will stand next to you when they do.',
    script: {
      why: 'You are not asking whether it matters to {him}. You are asking what happens if it matters to someone at {his} table.',
      words:
        'Can I ask something we’re not supposed to ask? Will qabiil come up — from your side, or mine? I’m not asking whether it matters to you. I’m asking what happens if it matters to someone in your family.',
      tells:
        '“It doesn’t matter to me” is the beginning. What you want to hear is what {he} would do if it mattered to {his} uncle. If {he} has no answer yet, that is the answer for now: ask {him} to think about it, and ask again.',
    },
  },
  {
    id: 'going-back',
    label: 'Going back',
    prompt: 'Going back — whether {he} plans to move back one day, or spend long stretches away, and whether you would go.',
    consequence: 0.65,
    why: '“One day I’ll go back” can be said, and meant, for years, and the other person finds out what “one day” means when the ticket is booked. Whether you go together, one of you stays, or you split the year is a marriage-shaped decision.',
    script: {
      why: 'You need to know whether you are in {his} picture, and where.',
      words:
 'Do you see yourself moving back one day — or spending months at a time there? I’m not asking you to decide now. I’m asking what you picture, because I need to know if I’m in that picture, and where.',
      tells: 'Listen for whether you appear in the answer. “We’d figure it out” means you are not yet in the picture.',
    },
  },
  {
    id: 'second-wife',
    label: 'A second wife',
    prompt: 'A second wife — what {he} believes about it for {his} own life, and what {he} has said to you plainly.',
    consequence: 0.9,
    why: 'It is easy not to ask, because asking feels like an accusation. It isn’t. It is one of the few questions where the answer shapes the rest of a life, and where “it is permitted” and “I would” are very different sentences.',
    man: {
      prompt: 'A second wife — what you believe about it for your own life, and whether you have said it to her plainly.',
      script: {
        why: 'She is more afraid to ask this than you are to answer it. Say it before she has to.',
        words:
          'I want to say something plainly, so you never have to ask it. Here is what I believe about a second wife — not what is permitted, but what I want for my own life. I’d rather you hear it from me now than wonder.',
        tells:
          'You are not listening for her reaction. You are checking that what you said was a sentence and not a lecture. If you found yourself explaining what is permitted, you have not answered yet.',
      },
    },
    script: {
      why: 'It is hard to ask, which is why it is worth asking plainly, once.',
      words:
        'I want to ask you something straight, and I’m not accusing you of anything. What do you believe about a second wife — not whether it’s permitted, but whether you’d ever want that for your own life? I need to hear it from you, in your words.',
      tells:
        'You are listening for a plain sentence. A lecture on what is permitted is a way of not answering. A plain “no” and a plain “I might” are both answers you can build on. Only the lecture isn’t.',
    },
  },
  {
    id: 'families-disagree',
    label: 'When the families disagree',
    prompt: 'When the families disagree — whose side, and how it gets settled between the two of you.',
    consequence: 0.8,
    why: 'Two families will want different things at some point. Decide, before it happens, that the two of you are a team first.',
    script: {
      why: 'The word you are listening for is “we”.',
      words:
        'What happens when your family and mine want different things — about the wedding, about where we live, about anything? Between us, how do we decide? I want to be a team with you before we have to be.',
      tells:
        'If the answer is about keeping one mother happy and the other quiet, the team is not yet the two of you. That is fixable — but only if you both know it.',
    },
    yourSide: {
      question: 'family-role',
      lines: {
        central: 'You told your map you want family central to this.',
        guided: 'You told your map you want family to guide, not decide.',
        informed: 'You told your map you want family informed, with the decision yours.',
        private: 'You told your map you would keep this mostly private from family.',
      },
    },
  },
]

/**
 * When she does not know her own answer, the words are for herself first.
 * Handing her a question for {him} would make {his} answer hers by default.
 */
export const OWN_ANSWER_FIRST: ElevenScript = {
  why: 'You can’t ask for an answer you don’t have yourself. That is not a failing — it is the most fixable state on this list.',
  words:
 'Before I raise this with you, I’m working out what I want here. Give me a week. Then I’ll tell you plainly, and I’ll want the same back.',
  tells:
    'Write your own answer down before you ask for {his}. Otherwise {his} becomes yours by default, and you find out later that it never was.',
}

/** When every conversation has been had and agreed — the rarest result, and still not the end. */
export const ALL_AGREED: ElevenScript = {
  why: 'Agreement from six months ago is a memory, not a contract. Closer to the day, answers can move.',
  words:
    'Can we go back over the things we agreed on, now that it’s closer? Not because I doubt you — because I want to make sure we still mean the same things by them.',
  tells: 'Watch for which answers have changed. The ones that have are the ones to talk about; the ones that haven’t are the ground you are standing on.',
}
