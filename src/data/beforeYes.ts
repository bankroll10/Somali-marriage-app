import type { Gender } from '../types'
import { speak, type ReadOption, type Script } from './read'

/**
 * Before you say yes.
 *
 * The Need audit named it: "we discovered too late that…". The things that
 * actually break Somali marriages are almost never the things the apps ask
 * about. They are where you'll live and whether his mother is in the house,
 * money sent home, whether she keeps working, what "practising" means on a
 * Tuesday, qabiil at somebody's table, a second wife. They get found out after
 * the families are involved, when saying no has become expensive.
 *
 * This is the list, asked early, about the real man she is already talking to.
 * It does not score him. It does not score the relationship. It records, for
 * each conversation, whether the two of them have had it — and then hands her
 * the words to open the one that matters most this week.
 *
 * Same rules as the Read. Every question is about what has been SAID between
 * them, never about how she feels. We never state a position of our own on any
 * topic — qabiil and a second wife included. And every path ends in words.
 */

export type YesState = 'agree' | 'differ' | 'not-talked' | 'unknown'

/** The four states, shared by every topic. Weight is only used for ordering. */
export const STATES: (ReadOption & { id: YesState })[] = [
  { id: 'agree', label: 'We’ve talked, and we agree', weight: 1, note: 'you have talked about {topic}, and you agree' },
  {
    id: 'differ',
    label: 'We’ve talked, and we don’t agree',
    weight: 0.1,
    note: 'you have talked about {topic}, and you don’t agree',
  },
  { id: 'not-talked', label: 'We haven’t talked about it', weight: 0.35, note: 'you have not talked about {topic}' },
  {
    id: 'unknown',
    label: 'I don’t know my own answer yet',
    hint: 'Honest, and more common than the other three.',
    weight: 0.25,
    note: 'you don’t yet know your own answer on {topic}',
  },
]

/**
 * Her own side, read from her map where the map already knows it. Shown under
 * the question so she is not asked to have an opinion she has already given.
 */
export interface YourSide {
  question: 'children' | 'family-role' | 'practice'
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
  script: Script
  yourSide?: YourSide
}

const TOPICS: Topic[] = [
  {
    id: 'live',
    label: 'Where you’d live',
    prompt: 'Where you’d live — which city, and whether with {his} mother, near her, or on your own.',
    consequence: 0.95,
    why: 'In our families this is rarely a two-person decision, and it is the one most often assumed rather than asked. One of you pictures {his} mother’s house; the other pictures a front door of your own. Two people can agree on everything else and still come apart on that in the first year.',
    script: {
      why: 'Nothing else on this list survives getting this one wrong, and nobody asks it until the lease is signed.',
      words:
        'Can I ask you something practical? When you picture us married — where are we living? Which city, and are we with your family, near them, or on our own? I’m not asking for a promise. I want to know what you’ve been picturing.',
      tells:
        'Listen for whether {he} has pictured it at all. “Wherever you want” sounds generous and is usually an answer {he} has not thought about. A specific answer you don’t like is worth more than a vague one you do.',
    },
  },
  {
    id: 'his-family-in-home',
    label: '{His} family in your home',
    prompt: '{His} family in your home — how much hosting, and whether a sister or {his} mother might live with you one day.',
    consequence: 0.8,
    why: 'Hosting is honour in our culture, and it is also labour, and the labour lands on the wife. The difference between a family that visits and a family that moves in is one nobody names until the suitcase is in the hallway.',
    script: {
      why: 'You are not setting a rule. You are finding out whether {he} has pictured you in that house, or only {his} mother.',
      words:
        'I want to ask about your family and our home — not to set rules, just so I’m not surprised later. Do you picture anyone living with us, now or one day? And how much hosting do you imagine — because I’d rather plan for it than come to resent it.',
      tells:
        'Someone who has thought about you as well as {his} mother will answer both halves. Someone who only hears the first half as an insult to {his} mother has just told you where {he} would stand when it comes up for real.',
    },
  },
  {
    id: 'work',
    label: 'Whether you’d work',
    prompt: 'Work — whether you’d keep working after marriage and after children, and what {he} assumes about home.',
    consequence: 0.75,
    why: 'Most of our men will say “of course” and mean it — until the first baby, when what they actually assumed surfaces. The question is not whether {he} minds you working. It is what {he} pictures happening at home while you do.',
    script: {
      why: '“Of course” is the start of the answer, not the end of it.',
      words:
        'I want to be honest about something. I intend to keep working, including after children, and I’d want to know now if that’s something you’d struggle with — not in general, but in practice: who does what at home when we’re both working?',
      tells:
        'Ask the second half — who does what at home — and watch whether {he} has an answer or a joke. The joke is the answer.',
    },
  },
  {
    id: 'money-home',
    label: 'Money sent home',
    prompt: 'Money — who pays for what, and what each of you sends home to family every month.',
    consequence: 0.85,
    why: 'Nearly every Somali household sends money home, and nearly every couple discovers the other’s obligations after marriage instead of before. It is not about generosity. It is two families’ expectations landing on one income, unspoken.',
    script: {
      why: 'Our parents never talked about money with us, which is exactly why you have to talk about it with {him}.',
      words:
        'Can we talk about money plainly, the way our parents never did with us? What do you send home each month, and to whom? I’ll tell you mine. And once we’re married — do we decide that together, or is each of ours separate?',
      tells:
        'You are not looking for a number. You are looking for whether {he} will say it out loud, and whether “together” comes easily or makes {him} defensive. Someone who can name {his} obligations can be planned around. Someone who won’t, can’t.',
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
        'When you think about children — how many, and how soon after we’re married? And what matters to you about raising them — Somali at home, dugsi, what they’d call your mother? I want to hear what you actually picture, not what sounds right.',
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
    why: 'Two people can both say “deen comes first” and mean completely different Tuesdays. One means fajr together; the other means Eid and Ramadan. And what {he} expects of you — hijab, mixed gatherings, music in the house — is something {he} has an opinion on, whether or not {he} has said it.',
    script: {
      why: 'An expectation {he} “assumed you’d know” is exactly the one that becomes a fight in year two.',
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
    why: 'The wedding is where two families’ expectations meet in public, with money attached. Couples who never talked about it end up carrying a debt, or a resentment, that was never theirs.',
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
    why: 'Most of us say it doesn’t matter to us, and most of us are telling the truth about ourselves. The question was never about you two. It is whether either family will raise it — and whether {he} will stand next to you when they do.',
    script: {
      why: 'You are not asking whether it matters to {him}. You are asking what happens if it matters to someone at {his} table.',
      words:
        'Can I ask something we’re not supposed to ask? Will qabiil come up — from your side, or mine? I’m not asking whether it matters to you. I’m asking what happens if it matters to someone in your family.',
      tells:
        '“It doesn’t matter to me” is the beginning. What you want to hear is what {he} would do if it mattered to {his} uncle. Someone who has never thought about that has never had to stand up for anyone.',
    },
  },
  {
    id: 'going-back',
    label: 'Going back',
    prompt: 'Going back — whether {he} plans to move back one day, or spend long stretches away, and whether you would go.',
    consequence: 0.65,
    why: '“One day I’ll go back” is something many of our men say and mean, and the wives find out what “one day” means when the ticket is booked. Whether you go with {him}, stay, or split the year is a marriage-shaped decision.',
    script: {
      why: 'You need to know whether you are in {his} picture, and where.',
      words:
        'Do you see yourself moving back one day — or spending months at a time there? I’m not asking you to decide now. I’m asking what you actually picture, because I need to know if I’m in that picture, and where.',
      tells: 'Listen for whether you appear in the answer. “We’d figure it out” means you are not yet in the picture.',
    },
  },
  {
    id: 'second-wife',
    label: 'A second wife',
    prompt: 'A second wife — what {he} believes about it for {his} own life, and what {he} has said to you plainly.',
    consequence: 0.9,
    why: 'It is asked far less often than it should be, because asking feels like an accusation. It isn’t. It is one of the few questions where the answer decides the shape of the rest of your life, and where “it is permitted” and “I would” are very different sentences.',
    script: {
      why: 'This is the question people are most afraid to ask and most relieved to have asked.',
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
    why: 'Every Somali marriage has two families in it, and at some point they will want different things. The marriage that survives is the one where the two of you decided, before it happened, that you are a team first.',
    script: {
      why: 'The word you are listening for is “we”.',
      words:
        'What happens when your family and mine want different things — about the wedding, about where we live, about anything? Between us, how do we decide? I want to be a team with you before we have to be.',
      tells:
        'If the answer is about keeping {his} mother happy, or keeping yours quiet, the team is not yet {him} and you. That is fixable — but only if you both know it.',
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
export const OWN_ANSWER_FIRST: Script = {
  why: 'You can’t ask for an answer you don’t have yourself. That is not a failing — it is the most common state on this list, and the most fixable.',
  words:
    'Before I raise this with you, I’m working out what I actually want here. Give me a week. Then I’ll tell you plainly, and I’ll want the same back.',
  tells:
    'Write your own answer down before you ask for {his}. Otherwise {his} becomes yours by default, and you find out in year three that it never was.',
}

/** When every conversation has been had and agreed — the rarest result, and still not the end. */
export const ALL_AGREED: Script = {
  why: 'Agreement from six months ago is a memory, not a contract. Closer to the day, the answers move.',
  words:
    'Can we go back over the things we agreed on, now that it’s closer? Not because I doubt you — because I want to make sure we still mean the same things by them.',
  tells: 'Watch for which answers have changed. The ones that have are the ones to talk about; the ones that haven’t are the ground you are standing on.',
}

function resolve(topic: Topic, fix: (t: string) => string): Topic {
  return {
    ...topic,
    label: fix(topic.label),
    prompt: fix(topic.prompt),
    why: fix(topic.why),
    script: { why: fix(topic.script.why), words: fix(topic.script.words), tells: fix(topic.script.tells) },
  }
}

/** The topics, with pronouns resolved for who she is reading. */
export function beforeYesTopics(memberGender: Gender = 'woman'): Topic[] {
  const fix = speak(memberGender)
  return TOPICS.map((t) => resolve(t, fix))
}

export function ownAnswerFirst(memberGender: Gender = 'woman'): Script {
  const fix = speak(memberGender)
  return { why: fix(OWN_ANSWER_FIRST.why), words: fix(OWN_ANSWER_FIRST.words), tells: fix(OWN_ANSWER_FIRST.tells) }
}

export const BEFORE_YES_COUNT = TOPICS.length
