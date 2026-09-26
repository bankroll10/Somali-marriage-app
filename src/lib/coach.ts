import { getMode, ownNonNegotiables, type CoachContext, type CoachIntent } from '../data/coach'
import type { CoachMessage, ModeId } from '../types'

/**
 * The AI Guide engine — mode-aware, with two voices behind one call.
 *
 * `askCoach` tries the live guide first (netlify/functions/guide.ts, which
 * builds its own system prompt from netlify/shared/prompt.ts) and falls back
 * to the local intent matcher for every failure: not configured, offline, rate
 * limited, or a safety decline.
 *
 * The local matcher is therefore not scaffolding — it is the offline voice, and
 * the one that speaks whenever the live guide cannot: no ANTHROPIC_API_KEY, the
 * route unreachable, a cap met, a decline. The live guide is on in production
 * (netlify/functions/guide.ts, a decision recorded in docs/PRODUCT.md), and the
 * Trust screen says so — it names what is sent and offers "Keep the Guide on
 * this device", which answers offline and sends nothing. This comment used to
 * say the opposite of both (docs/DECISIONS.md).
 */

function normalize(s: string): string {
  return s.toLowerCase().replace(/[’']/g, "'")
}

/** Escape a keyword for use inside a RegExp. */
function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Does `message` contain `keyword` as whole words?
 *
 * Plain substring containment was matching 'ex' inside "next", 'night' inside
 * "tonight", 'past' inside "pasta" and 'hi' inside "think" — so a question
 * about next steps came back as a lecture about heartbreak, and a substantive
 * message got answered with a greeting. A confidently wrong answer damages
 * trust more than admitting the miss.
 */
function hasWords(message: string, keyword: string): boolean {
  return new RegExp(`(?:^|[^a-z0-9])${escapeRe(keyword)}(?:[^a-z0-9]|$)`, 'i').test(message)
}

/**
 * Words that mean this may not be a relationship question at all
 * (docs/SECURITY.md): a threat, force, a man or woman asking for money before the
 * families have met, someone holding pictures over her. Matched as whole
 * words, on her own phone; nothing is sent or kept because of it.
 */
const SAFETY_WORDS = [
  'threat', 'threats', 'threatened', 'threatening', 'threatens',
  'hit me', 'hits me', 'hurt me', 'hurts me', 'hurting me',
  'scared of him', 'scared of her', 'afraid of him', 'afraid of her',
  'forced', 'forcing me', 'force me',
  'blackmail', 'blackmailing', 'blackmailed',
  'nudes', 'pictures of me', 'photos of me', 'videos of me',
  'grabbed me', 'grabbed my', 'pushed me', 'shoved me', 'slapped me', 'slapped', 'choked me', 'kicked me',
  'send money', 'sent money', 'sent him money', 'sent her money', 'asked me for money', 'asking me for money', 'asks me for money',
  'help pay', 'pay for his ticket', 'pay for her ticket',
  'loan', 'crypto', 'bitcoin', 'gift card', 'gift cards', 'western union', 'invest',
  'stalking', 'following me', 'followed me',
  // Control and fear, not only threats and blows (docs/SECURITY.md, "Afraid to
  // raise it"). Kept to phrasings that say it: "won't let me see", not "won't
  // let me", which is also a man insisting on paying for dinner.
  // His or her hands on her phone — never her own ("I keep checking my phone").
  'checks my phone', 'goes through my phone', 'went through my phone behind',
  'reads my messages', 'checks my messages', 'goes through my messages',
  "won't let me see", 'wont let me see', "doesn't let me see", 'doesnt let me see', "won't let me go", 'wont let me go',
  'not allowed to see my', 'not allowed to go out',
  'takes my money', 'takes my salary', 'keeps my salary', 'my salary card', 'controls my money', 'controls the money',
  'shouts at me', 'yells at me', 'screams at me', 'shouting at me', 'yelling at me', 'screaming at me',
  'scared to tell him', 'scared to tell her', 'afraid to tell him', 'afraid to tell her',
  'scared to bring', 'afraid to bring', 'scared to raise', 'afraid to raise',
  'because of how he reacts', 'because of how she reacts', 'scared of how he', 'scared of how she', 'afraid of how he', 'afraid of how she',
  'walking on eggshells', 'on eggshells', 'punishes me',
  // A passport held, a status threatened, an exposure threatened: control by
  // what she stands to lose, not by a hand raised (docs/DECISIONS.md Part 16).
  'has my passport', 'keeps my passport', 'took my passport', 'take my passport',
  'get me deported', 'have me deported', 'report me to immigration', 'call immigration',
  'my visa depends', 'my papers depend', 'my status depends',
  'tell my family everything', 'tell everyone about', 'expose me', 'ruin my name', 'ruin my reputation',
  'show my family the', 'send the messages to my', 'send them to my father', 'post the photos', 'post my photos', 'post the pictures',
]

/**
 * Being made to marry. Force is the safety exception (docs/RESEARCH.md rows
 * 16 and 21), and it has its own answer because the people applying it are
 * usually the ones every other reply would send her to: "tell your mother"
 * is the wrong sentence when it is her mother. Phrasings that name the
 * marriage, so "not allowed to refuse it", asked about polygamy, is not this
 * (docs/DECISIONS.md Part 16).
 */
const FORCE_WORDS = [
  'make me marry', 'making me marry', 'marry me off', 'marrying me off', 'married off', 'against my will',
  'forced marriage', 'forced to marry', 'forcing me to marry', 'force me to marry', 'no choice but to marry',
  'not allowed to refuse him', 'not allowed to refuse the', 'not allowed to say no to him',
  "won't let me refuse", 'wont let me refuse', "won't let me say no", 'wont let me say no',
  'already agreed for me', 'agreed without asking me', 'made me agree',
]

export const FORCED_REPLY = `Being made to marry is not a family disagreement to manage, and it is not yours to carry alone. Your consent is yours to give, and a marriage needs it.

Tell one person outside the household today — an aunt, a teacher, a friend's mother, an imam you trust — exactly what has been said, and when. Not for advice yet. So that someone who is not deciding this knows.

If you are being taken somewhere, or you are in danger now, call the emergency number below. The helpline is free, and you do not have to give your name.

Nothing here decides what you do next. It only makes sure you are not the only one who knows.`

/**
 * Words that mean a life may be at risk (tests/guide-eval, the crisis cases).
 * Before a threat, before money, before anything about a courtship: this is
 * answered first, in every voice, and the crisis line renders beneath it.
 */
const CRISIS_WORDS = [
  'kill myself', 'killing myself', 'suicide', 'suicidal', 'end my life', 'ending my life', 'end it all',
  'want to die', 'wanna die', 'better off dead', 'no reason to live', 'not want to live', "don't want to live",
  'hurt myself', 'hurting myself', 'harm myself', 'harming myself', 'self harm', 'self-harm', 'cut myself', 'cutting myself',
]

/** The guide's own words that send someone to crisis help — the crisis line belongs under them. */
const CRISIS_HELP_WORDS = ['crisis line', 'ending your life', 'suicide', 'suicidal', 'hurting yourself']

/** Whether this message, hers or the guide's, should carry the crisis line beneath it. */
export function needsCrisisLine(message: string, from: 'user' | 'coach' = 'user'): boolean {
  const m = normalize(message)
  return (from === 'user' ? CRISIS_WORDS : CRISIS_HELP_WORDS).some((w) => hasWords(m, w))
}

/** The offline answer to any of those. No numbers: HelpLine puts the checked crisis line beneath it. */
export const CRISIS_REPLY = `I am really glad you told me. What you are feeling matters more than anything about a courtship, and you do not have to carry it alone.

If you might act on these thoughts, call your emergency number now. If you can, reach the crisis line below — it is free, and they are there for exactly this.

Then tell one person who loves you — a sister, a brother, a friend, your mother — what you told me, today. You deserve someone with you tonight.`

/**
 * Requests to use the guide against someone: guilt, deception, finding a
 * person who has left, getting into their accounts, hiding a marriage
 * (tests/guide-eval, the manipulation cases). The offline voice used to give
 * these the relationship framework, as if they were ordinary questions.
 */
const HARM_WORDS = [
  'feel guilty', 'guilty enough', 'make her feel', 'make him feel',
  'where she lives', 'where he lives', 'her address', 'his address', 'track her', 'track him', 'follow her', 'follow him',
  'into her instagram', 'into his instagram', 'her instagram account', 'his instagram account', 'her password', 'his password', 'hack',
  'without my wife', 'without my first wife', 'without her knowing', 'without him knowing',
  'think i earn', 'earn more than i do', 'lie to her family', 'lie to his family', 'make her family think', 'make his family think',
]

export const HARM_REPLY = `I won't help with that. Pressuring someone, deceiving them or their family, following them after they have stepped away, or hiding a marriage all break the trust a marriage has to stand on, and they can hurt people.

If what is underneath this is fear of losing someone, or a hard conversation you are avoiding, tell me that instead, and I will help you say it honestly.`

/**
 * Someone said no, and the asker wants a way round it: their family, their
 * father, persuasion. The live prompt refuses to help anyone pressure another
 * person (netlify/shared/prompt.ts); offline, "she said no but I want to talk
 * to her father" reached the Big Brother's words for meeting a father —
 * "Come correct. Stand tall in that." — with nothing to say that the no was
 * an answer (docs/DECISIONS.md Part 16). Not HARM_REPLY: this is not malice,
 * it is hurt, and it gets a plainer sentence.
 */
const NO_WORDS = [
  'she said no but', 'he said no but', 'turned me down', 'change her mind', 'change his mind',
  'convince her to', 'convince him to', 'persuade her to', 'persuade him to', "won't take no", 'wont take no',
  'go over her head', 'her father anyway', 'her family anyway', 'his family anyway', 'ask her father instead',
  'get her family to', 'get his family to', 'make her say yes', 'make him say yes',
]

export const NO_REPLY = `A no is an answer, and it is theirs to give. Going to their family to change it is going around them, not toward them — and a family's yes over their no is not a yes.

What you can do is hear it once, plainly, and let it stand. If it hurts, tell one person who knows you what happened. That is where the words belong now.

Try: "I heard you, and I respect it. I won't ask again. I wish you well." Then stop.`

/**
 * Custom asked about as religion (docs/DECISIONS.md Part 17). The principle is
 * said as the principle, the custom as custom, and the ruling goes to a
 * scholar. Offline, "the mahr should go to my father, is that Islamic?"
 * reached the Auntie's "Your people protect you. Let them."
 */
const MAHR_OWNER_RE = /\bmahr\b[^.?!]{0,40}\b(go(es)? to|to) (my|her|his|the) (father|dad|family|parents|uncle|brother)\b|\b(keep|take|hold) (my|her|the) mahr\b/

export const MAHR_OWNER_REPLY = `The mahr is the bride's: a gift to her, not a payment to her family. That principle is not in question. What your family expects around it is custom, and customs can be talked about.

If they have a worry — the cost of the wedding, a debt, how it looks — that is a separate conversation, and it can be had without the mahr changing hands. The details of what is agreed, and how, are a question for a scholar you trust.

Try: "I'd like the mahr to come to me, as it's meant to. If the family need help with the wedding, can we talk about that separately?"`

/** Qabiil asked about as religion: named as custom, the ruling handed on, never decided either way. */
const CLAN_RE = /\b(qabiil|clan|tribe)\b/
const AS_RELIGION_RE = /\b(islam|islamic|islamically|haram|halal|sunnah|deen|allowed|permitted|sin)\b/

export const CLAN_RELIGION_REPLY = `Qabiil is how our families have long organised themselves. Whether it has any place in a nikah is a question for a scholar you trust — not for your uncle, and not for me. Scholars discuss suitability between spouses in different ways, and none of that is the same thing as the family's comfort.

What you can do is keep the two apart when you talk to him.

Try: "Uncle, I hear that this matters to the family. Can we ask a scholar what the deen says, and then talk about what the family is worried about?"

Who you marry is still yours to choose, with your wali.`

/**
 * A question that asks for a ruling. The offline voice gives principles, not
 * rulings, and says where the ruling lives — every voice, not only the
 * Islamic one (tests/guide-eval, the religious cases).
 */
const RULING_WORDS = [
  'haram', 'halal', 'permissible', 'allowed in islam', 'in islam', 'a sin', 'sinful', 'fiqh', 'ruling',
  'polygamy', 'polygyny', 'istikhara', 'too far', 'is it okay', 'is it allowed', 'deferred',
  // Said the other ways a ruling is asked for (docs/DECISIONS.md Part 17).
  'permitted', 'forbidden', 'wajib', 'makruh', 'fard', 'is it sunnah',
  'need a wali', 'without a wali', 'without my wali', 'nikah valid', 'valid nikah',
  'is it islamic', 'is that islamic', 'islam says', 'islam requires', 'islamically',
]

/**
 * A difference between the two of them, said as one. Every voice used to
 * answer it with the courtship framework — "notice what it costs you … that is
 * part of the answer" — reading a disagreement as a verdict on him, or with
 * whatever its keywords happened to touch: "he wants to live with his mother
 * and I don't" got "a man worth having expects your family". One answer, in
 * any voice, that separates the kinds of difference and puts the kind in her
 * hands (docs/DECISIONS.md Part 8).
 */
const DIFFERENCE_WORDS = [
  'we disagree', "we don't agree", 'we dont agree', "don't agree on", 'dont agree on',
  'we see it differently', 'see it differently', 'compromise', 'meet in the middle', 'middle ground',
  'meet him halfway', 'meet her halfway', 'halfway', 'incompatible', 'not compatible', 'we are different on', "we're different on",
  'we worked out', 'keep reopening',
]

export const DIFFERENCE_REPLY = `Not agreeing is not a verdict on the two of you. Some differences get settled once. Some you live alongside, with an arrangement you both keep. And some are a line for one of you. Only you can say which this one is.

• If it is a line for you, you do not owe anyone a middle. Say it plainly, once, and listen for whether their answer is final too.
• If it is still open, start with what each of you could not live with, before anyone looks for a middle.
• If you have worked out how you live with it, say the arrangement back to each other in one sentence. If you both say it the same way, it is real.

Try: "We see this differently, and I don't want either of us to pretend we don't. Can we each say what we couldn't live with here, and what we could?"

Say that this week, and listen for whether they name theirs.`

/**
 * How the two of them argue, said as that — not what about. "We keep arguing"
 * used to be one of the difference words and got the answer about kinds of
 * difference: a message about how, answered as a message about what
 * (docs/DECISIONS.md Part 9). This is also the answer married Home promises
 * when it opens "the guide, in the voice built for repair".
 *
 * No labels — not "stonewalling", not "contempt" — only what happened, and
 * what to do. Mockery and fear are named as how she is being treated, and
 * sent to a person; threats and control never reach here (SAFETY_WORDS).
 */
const PROCESS_WORDS = [
  'we keep arguing', 'keep arguing', 'we argue', 'we argued', 'we keep fighting', 'keep fighting', 'we fight', 'we fought',
  'we had a fight', 'had a big fight', 'we had an argument', 'had an argument', 'had a big argument', 'after an argument',
  'after the argument', 'after a fight', 'after the fight', 'we made up', 'how we argue', 'how we fight',
  'silent treatment', 'silent for days', 'not speaking to me', 'stopped speaking to me',
  'mocks me', 'makes fun of me', 'puts me down', 'belittles me', 'calls me stupid', 'rolls his eyes', 'rolls her eyes',
  'shout at each other', 'we shout', 'we both shout',
]

export const PROCESS_REPLY = `How the two of you argue is a different question from what you argue about, and often the more useful one. Three things are worth knowing:

• Does it come back? A pause is fine. What matters is that one of you returns to it, and the other lets them.
• Can either of you stop without it being a punishment? "I need a break" is not the same as days of silence.
• Does anyone come away mocked, put down or afraid? That is not an argument style. It is how you are being treated, and it is worth telling one person who knows you.

If you said something you regret, start the repair yourself, without a "but": "I didn't like how I spoke earlier. Can we start that again?"

Try: "Can we agree that when it gets heated, either of us can say 'let's stop and pick this up tomorrow' — and then we both do?"

Agree that one rule this week.`

/**
 * Pressure from her own family to marry — the weekly questions, the cousin
 * back home, "say yes quickly". The women's chip that says exactly this ("My
 * family is pushing me about marriage") matched only `family` in the auntie's
 * intent and was answered with "A man worth having expects your family. Bring
 * them in gently": advice to involve the family, given to someone reporting
 * pressure from it. A man's "my parents want me to marry my cousin" reached
 * "This is where you become a man in their eyes" (docs/DECISIONS.md Part 10).
 * One answer, in any voice, after safety and harm: force is a safety matter
 * (SAFETY_WORDS); pressure short of force is answered here.
 */
const PRESSURE_WORDS = [
  // Family pressure, said as that. Not a bare "pushing me": "he keeps pushing
  // to meet alone" is him, and a boundary, not this.
  'family is pushing', 'family keeps pushing', 'parents are pushing', 'parents keep pushing', 'mother is pushing', 'mother keeps pushing',
  'hooyo is pushing', 'hooyo keeps pushing', 'pushing me to marry', 'pushing me to get married', 'pushing me to say yes',
  'pressure from my family', 'pressure from my parents', 'family pressure', 'pressuring me to marry', 'under pressure to marry',
  'keep asking when', 'keeps asking when', 'asks me every week', 'ask me every week', "won't stop asking", 'wont stop asking',
  'want me to marry', 'wants me to marry', 'expect me to marry', 'expects me to marry', 'expect me to say yes', 'say yes quickly',
  'bring someone home', 'when will you get married', 'when are you getting married', 'not getting any younger',
  // Reputation and the clock, said the way they are said (Part 16). Not "too
  // old to" or "getting old": a parent's age is neither.
  'what will people say', 'people will talk', 'embarrass the family', 'embarrass my family',
  'shame on the family', 'shame the family', 'shame my family', 'ceeb',
  'at my age', 'running out of time', 'left on the shelf', 'everyone my age is married', 'all my friends are married',
]

export const PRESSURE_REPLY = `The questions can be love that has not learned to speak softly. That does not make them lighter, or yours to answer on their clock.

You can honour your family and the decision can still be yours. The pace is yours even when the questions are not.

• Ask plainly for what you need — time, or to be asked differently. Parents asked for a part can often give it.
• If it is a particular person they want, your consent is yours to give. Saying so once, calmly, is not disrespect.
• If it has gone past questions — if you are being made to, or afraid to say no — that is not pressure to manage. Tell one person you trust today; in danger, the emergency number is below.

Try: "I know you want this for me, and I want it too. Please trust me to choose who, and when. Can we agree you'll ask me once a month, and I'll tell you where I am?"

Say it to the one who asks most, this week.`

/**
 * The follow-up's "It went differently" asks whether she got to say it, then
 * sends the guide a fixed sentence: said it, or could not (both carry "went
 * differently"; src/components/home/FollowUp.tsx). Offline they had no
 * answer of their own: most fell to the framework, and "his family in your
 * home" was routed to "a man worth having expects your family". Differently
 * can mean it went badly, it settled something, or it was not safe; the answer
 * starts by telling those apart.
 */
const WENT_DIFFERENTLY_WORDS = ['went differently', 'it went differently']

export const WENT_DIFFERENTLY_REPLY = `Differently can mean a few things, so start with which one it was.

• It went badly, but it can come back. Leave it a day, then return to it, more slowly.
• It settled something you did not expect: a plain answer, even one you did not want. That is still an answer, and it is yours to weigh.
• It did not feel safe to raise. Then it is not a conversation to try again alone. Tell one person who knows you what happened, today, and if you are ever in danger, the emergency number is below.

Try: "I didn't like how that went. Can we try it again, more slowly, tomorrow?"

Pick the one that fits, and do that this week.`

/**
 * Decision support, never a decision (docs/GUIDE-EVAL.md, the invariants).
 *
 * Asked to decide — "should I marry him", "is she the one", "just tell me
 * what to do" — every voice used to reach the framework, which opened "I'll
 * tell you what I see" and ended "that is part of the answer": a verdict
 * promised, then implied. "My family says yes but I don't know" reached "A
 * man worth having expects your family"; "two years… leaving feels like
 * wasting it" reached "that vagueness is his answer". These answer in any
 * voice, after safety, harm and the fixed replies above: the decision goes
 * back to her, with something to decide with.
 */
function otherOf(ctx: CoachContext): { he: string; him: string } {
  return ctx.identity.gender === 'man' ? { he: 'she', him: 'her' } : { he: 'he', him: 'him' }
}

const DECIDE_WORDS = [
  'should i marry', 'should we marry', 'should we get married', 'should i say yes', 'should i accept', 'should i leave',
  'should i end', 'should i stay', 'should i break', 'should i walk away', 'should i give up on',
  'should i propose', 'should i go through with', 'should i just say yes', 'should i just accept', 'should i just marry',
  'is he the one', 'is she the one', 'is he right for me', 'is she right for me',
  'tell me what to do', 'what would you do', 'decide for me', 'make the decision for me', 'yes or no',
]

/**
 * Her own non-negotiables as a question about him: what has she seen of them,
 * herself? Quoted, never wielded (invariant 5). With none named, she is asked
 * to name three, so there is still something to hold him against.
 */
function seenOfOwnList(ctx: CoachContext): string {
  const { him } = otherOf(ctx)
  const nn = ownNonNegotiables(ctx)
  return nn.length
    ? `You told your map what you won't give up: ${nn.join(', ')}. What have you seen of those from ${him} yourself?`
    : `Name three things you would never give up. What have you seen of them from ${him} yourself?`
}

export function decideReply(ctx: CoachContext): string {
  const { him } = otherOf(ctx)
  const nn = ownNonNegotiables(ctx)
  const values = nn.length
    ? `You told your map what you won't give up: ${nn.join(', ')}. Hold what you have seen against those, not against how you feel tonight.`
    : `If you haven't named what you won't give up, name three now, before anything else.`
  return `That is yours to decide, and I won't take it from you. What I can do is help you see it clearly.

Split what you know from what you are guessing:
• What have you seen ${him} do, and heard ${him} say, yourself?
• What are you hoping, or afraid, that means?
• What don't you know yet, and could you find it out by asking?

${values}

Yes, no and "not yet" are all real answers. So is asking for more time.

Write one sentence, just for you: what would you need to know, or see, to be sure? That is the next thing to ask for.`
}

const INTENT_WORDS = [
  'does he love me', 'does she love me', 'do you think he loves', 'do you think she loves',
  'is he serious', 'is she serious', 'if he is serious', 'if she is serious', 'is he really serious', 'is she really serious',
  'what does he really mean', 'what does she really mean', 'what does he mean by', 'what does she mean by',
  'what is he thinking', 'what is she thinking', 'how does he feel', 'how does she feel', 'does he like me', 'does she like me',
  'is he playing', 'is she playing', 'does he want to marry me', 'does she want to marry me', 'does he really want', 'does she really want',
]

export function intentReply(ctx: CoachContext): string {
  const { he, him } = otherOf(ctx)
  return `Nobody can see inside another person — not me, and not you from here. What you can see is what ${he} does and says, over time.

• What have you seen yourself? Not what you were told, and not only how it felt.
• What do you hope, or fear, it means? Keep that separate.
• What haven't you asked ${him}? Most of what we guess about someone, we could ask.

Niyyah's read asks about what ${he} has done, not what ${he} feels, if you want to set it down.

Try: "I don't want to guess what you're thinking about us. Can you tell me where you see this going, and when?"

Ask it in person, when you are both calm, and listen to the whole answer.`
}

const TIME_WORDS = [
  'wasting it', 'waste it', 'wasted it', 'a waste of', 'all this time', 'all these years', 'too far in', 'invested so much',
  'for two years', 'for three years', 'for four years', 'for five years', 'for years', 'years together',
  'invested years', 'years into this', 'years into it', 'so many years', 'after everything',
]
/** Years said as a number, or as "two years in" (docs/DECISIONS.md Part 14). */
const TIME_RE =
  /\b(for|after) (\d+|two|three|four|five|six|seven|eight|nine|ten|a few|several) years\b|\b(\d+|two|three|four|five|six|seven|eight|nine|ten|a few|several) years (together\b|in(?=\s*($|[.,!?;:]|and\b|now\b|already\b|but\b|so\b)))/

export const TIME_REPLY = `That time is real: the conversations, the hope, what you have given. It is not wasted whichever way you go. It is how you know what you know now.

But time already spent is not, by itself, a reason to stay or to go. The only question is from here.

• What have these years shown you, plainly?
• What is still unanswered, and have you asked it?
• Knowing everything you know today, would you begin this?

That last one is yours alone. Write your answer down, for yourself, before you talk to anyone about it.`

/**
 * Someone else's yes: her family's, her mother's, "everyone's", an imam's or a
 * matchmaker's. Their approval is real information (docs/RESEARCH.md L7), so
 * it is never waved away; it is what they have seen, and it sits beside what
 * she has seen, never in its place (docs/DECISIONS.md Part 14). "My mother
 * loves him" used to miss this and reach the auntie's "Your people protect
 * you. Let them."
 */
const FAMILY_YES_WORDS = [
  'family says yes', 'family said yes', 'family say yes', 'parents say yes', 'parents said yes', 'everyone says yes',
  'my family likes him', 'my family likes her', 'my family loves him', 'my family loves her',
  'my parents like him', 'my parents like her', 'my family approves', 'my parents approve', 'everyone likes him', 'everyone likes her',
]
const WHO_ELSE = String.raw`(my (mother|mum|mom|father|dad|parents|family|sisters?|brothers?|friends|aunt|aunts|aunties|auntie|uncle|uncles)|hooyo|aabo|everyone|everybody|people|the (imam|sheikh|matchmaker))`
const OTHERS_YES_RE = [
  new RegExp(String.raw`\b${WHO_ELSE} (really |all |just )?(loves?|likes?|adores?|approves? of) (him|her)\b`),
  new RegExp(
    String.raw`\b${WHO_ELSE} (all )?(says?|said|thinks?) (he|she)('s| is) (perfect|so good|great|amazing|lovely|a catch|the one|right for me|good for me|a (good|great) (man|woman|match|catch|one))\b`,
  ),
]

export function familyYesReply(ctx: CoachContext): string {
  const { him } = otherOf(ctx)
  return `Their yes matters, and it is not yours. Both can be true at once: they can be glad about ${him}, and you can still want to be sure for yourself.

Your consent is yours to give, and "I don't know yet" is an honest answer, not a problem to hide.

• What have they seen of ${him} that you haven't, and what have you seen that they haven't?
• What would you need to know, or see, to be sure?
• Is there something you haven't asked ${him} yet?

Try: "I'm glad you like ${him}. Tell me what you've seen in ${him}. I want to hear it, and I need a little time to be sure for myself."

Say it to whoever is asking most, this week.`
}

/**
 * A reason that is not about him, standing in for what she has seen
 * (docs/DECISIONS.md Part 14): a prayer followed by an event, a wedding
 * already in motion, a clock, a count, one quality. Each is real, and each is
 * taken seriously; none is weighed for her, and none is named as an error.
 * Every answer ends by handing the decision back with something she has seen
 * to decide with.
 */

/** Istikhara followed by something that happened, a feeling, or a question of whether to marry. */
const PRAYER_RE = /\b(istikhara|prayed on it|prayed about it)\b/
const AFTER_PRAYER_RE =
  /\b(then|after|afterwards|since|next day|the next|sign|signs|dream|dreamt|dreamed|answer|answered|means|meant|happened|feel|felt|feeling|easy|smooth|fell apart|went wrong)\b/

export function signReply(ctx: CoachContext): string {
  const { him } = otherOf(ctx)
  return `What istikhara means, and how it is answered, is for a scholar or imam you trust. I won't read what happened, or what you feel, as a yes or a no. Istikhara and asking good counsel go together, and so does what you have seen yourself.

• Leaving aside what happened after, what have you seen ${him} do, and heard ${him} say?
• ${seenOfOwnList(ctx)}
• Who knows you both well enough to ask for counsel this week?

The decision is still yours, made with all of that. Ask that one person, and tell them what you have seen, not only what happened.`
}

/** A wedding, a date, families or people who already know: things in motion, and what stopping would cost. */
const MOMENTUM_WORDS = [
  'wedding planning', 'planning the wedding', 'planning our wedding', 'planning my wedding', 'wedding is booked', 'hall is booked',
  'booked the hall', 'booked a hall', 'already booked', 'invitations', 'the date is set', 'set the date', 'set a date',
  'nikah date', 'wedding date', 'already told everyone', 'everyone knows', 'families have met', 'families already met',
  'families have already met', 'mahr is agreed', 'agreed the mahr', 'too late to back out', "can't back out", 'cant back out',
  'too late to stop', 'too late to change', 'too late now', 'what will people say', 'what would people say', 'embarrass my family',
  'shame my family', 'bring shame', 'lose face', 'the deposit', 'already paid for',
]

export function momentumReply(ctx: CoachContext): string {
  const { him } = otherOf(ctx)
  return `A date, a hall, families who have met, people who know: those are real, and so is what it would cost to change them. They are also not reasons about ${him}.

• If nothing had been booked or announced, what would you do next?
• Is there something you haven't asked ${him} yet? There is still time before the nikah.
• If you want to slow down, who is the one person who would help you say so?

Slowing down, or stopping, is allowed at every point before the nikah, and it is yours to decide. A cost you can name is not the same as a reason.

Try: "Before anything more is booked, I want us to sit down and talk through what we haven't yet. Can we do that this week?"

Say it to ${him}, in person, this week.`
}

/** Her own clock, or how few people seem to fit. Family's "not getting any younger" is pressure, above. */
const CLOCK_WORDS = [
  'at my age', 'my age', 'running out of time', 'getting older', "i'm getting old", 'i am getting old', 'biological clock', 'my clock',
  'hard to find', 'no good men', 'no good women', 'no good somali', 'not many good', 'few good men', 'few good women',
  "won't find better", 'wont find better', "won't find anyone", 'wont find anyone', "won't find someone", 'wont find someone',
  'last chance', 'better than nothing', 'might not get another', 'may not get another', 'slim pickings',
]
const CLOCK_RE = /\b(almost|nearly|turning|about to turn|over|past|already) (2[5-9]|3\d|4\d|thirty|forty)\b(?! ?(days|weeks|months|years|hours|minutes|messages|times|%))/

export function clockReply(ctx: CoachContext): string {
  const nobody = (who: string) =>
    `The clock is real, and so is the worry that the room is small. Nobody can promise you ${who}, and I won't pretend to.`
  if (ctx.stage === 'preparing' || ctx.stage === 'married') {
    const nn = ownNonNegotiables(ctx)
    const list = nn.length
      ? `You told your map what you won't give up: ${nn.join(', ')}. Those are yours, and the pace can change without them changing.`
      : `If you haven't named what you won't give up, name three now, while nobody is in front of you.`
    return `${nobody('someone')}

What a clock can fairly change is how fast you move. What it shouldn't change, without you noticing, is what you would accept.

${list}

• Is the clock asking you to move faster, or to want less?
• What would you need to see in someone before you said yes?

Which it is, is yours to say. Write it down tonight.`
  }
  const { him } = otherOf(ctx)
  return `${nobody('someone else')}

What a clock can fairly change is how fast you decide. What it shouldn't change, without you noticing, is what you would accept.

• Set the clock aside for a minute: what have you seen ${him} do, and heard ${him} say?
• ${seenOfOwnList(ctx)}
• If you decide sooner, what is the one thing you would still want to ask first?

Which one the clock is changing, the pace or the list, is yours to say. Write it down tonight, then ask that one thing.`
}

/** A count of what is agreed or covered: "nine of eleven", "all but two". */
const COUNT_WORDS = ['most of the boxes', 'most boxes', 'all but one', 'all but two', 'most of the eleven', 'most of my list', 'most of the list']
const NUMBER = String.raw`(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|most)`
const COUNT_RE = [
  new RegExp(String.raw`\b(checked|ticked|ticks|checks|agree on|agreed on|done|had|covered|passed|got) ${NUMBER} (of|out of) (the )?${NUMBER}\b`),
  new RegExp(String.raw`\b${NUMBER} (of|out of) (the )?${NUMBER} (boxes|things|conversations|topics|questions)\b`),
]

export function countReply(ctx: CoachContext): string {
  const { him } = otherOf(ctx)
  const nn = ownNonNegotiables(ctx)
  const line = nn.length
    ? `You told your map you won't give up ${nn.join(', ')}. Is any of what's left touching those?`
    : `Is any of what's left a line for you?`
  return `A count tells you how much ground you've covered. It can't tell you whether what's left is small.

• Which are left, still open or not yet talked about? Is there anything in them you haven't asked ${him}?
• ${line}
• The ones you agree on: could you each say what you agreed, and would it come out the same?

One open conversation can outweigh all the rest, or be one you can live with. Only you can say which.

Try: "There are still a couple of things we haven't talked through, and I'd rather know them now than after the nikah. Can we start this week?"

Say it in person, when you are both calm.`
}

/** One quality standing for the whole person: success, looks, a family's name, a list complete on paper. */
const ONE_THING_WORDS = [
  "he's successful", 'he is successful', "she's successful", 'she is successful', "he's rich", 'he is rich', "she's rich",
  'has a good job', 'has a great job', 'makes good money', 'earns well', 'earns a lot',
  "she's beautiful", 'she is beautiful', "she's so beautiful", "she's gorgeous", 'she is gorgeous', "she's pretty", 'she is pretty',
  "he's handsome", 'he is handsome', "he's so handsome", "he's gorgeous", 'he is gorgeous', 'good looking', 'good-looking',
  'perfect on paper', 'good on paper', 'great on paper', 'right on paper', 'on paper he', 'on paper she',
  'ticks all the boxes', 'ticks every box', 'checks all the boxes', 'checks every box', 'ticks all my boxes', 'checks all my boxes',
  'from a good family', 'comes from a good family',
]

export function oneThingReply(ctx: CoachContext): string {
  const { he, him } = otherOf(ctx)
  const outside =
    ctx.identity.gender === 'man'
      ? 'If your brother told you this about the woman he was about to marry, what would you ask him?'
      : 'If your sister told you this about the man she was about to marry, what would you ask her?'
  return `That is real, and it counts for something. It is also one thing about ${him}, and it can't answer the rest for you.

• What does it tell you about how ${he} would be to live with, and what doesn't it?
• ${seenOfOwnList(ctx)}
• ${outside}

Whether it is enough is yours to weigh. Ask ${him} the thing you would want to know first, this week.`
}

/**
 * She is done: thanks, a plan, or "not tonight". A guide that is good at its
 * job lets her go (invariants 8 and 11). Only a short message with no
 * question in it, so a thank-you before a real question is still answered.
 */
const STOP_WORDS = ["don't want to talk about this", 'dont want to talk about this', 'not tonight', 'enough for tonight', 'goodnight', 'good night', "i'm done for", 'im done for']
const THANKS_WORDS = [
  'thank you', 'thanks', 'that helps', 'that helped', 'jazakallah', 'jazak allah', 'i know what to do', "i know what i'm going to",
  'i know what i will', "i'll talk to", 'i will talk to', "i'll tell him", "i'll tell her", "i'm going to talk to", 'i am going to talk to',
]
export const CLOSE_REPLY = `Then go and say it. I'm glad it helped. You don't need to come back here first; the next step is yours.`
export const STOP_REPLY = `Then we stop here. Nothing needs deciding tonight; it will still be there tomorrow, and so will you.`

const DEFERENCE = `For the ruling itself, take it to a scholar or imam you trust. A guide can share principles; a ruling is theirs to give.`

/** The guide's own words that point at real-world help — the numbers belong under them. */
const HELP_WORDS = ['emergency', 'helpline', 'in danger', 'real-world help']

/** Whether this message, hers or the guide's, should carry the help line beneath it. */
export function needsHelpLine(message: string, from: 'user' | 'coach' = 'user'): boolean {
  const m = normalize(message)
  return (from === 'user' ? [...SAFETY_WORDS, ...FORCE_WORDS] : HELP_WORDS).some((w) => hasWords(m, w))
}

/**
 * The offline answer to any of those, in every voice. The live guide gets the
 * same rules in its prompt (netlify/shared/prompt.ts); this is the floor for
 * when it cannot be reached or declines — which is exactly when a message like
 * this is most likely to be declined. No numbers in the text: HelpLine puts the
 * checked ones for where she lives beneath it (src/data/help.ts).
 */
export const SAFETY_REPLY = `What you have described is more than a question about a courtship, and it deserves more than an app.

If you are in danger now, call the emergency number below. Then tell one person you trust — a sister, a friend, an older woman or man who knows you — exactly what you told me. Today.

If money is being asked for, send nothing more until your families have met. That is the shape scams take, however real the person feels.

If someone is holding pictures or messages over you: do not pay, do not send more, keep what they sent, and tell someone.

If someone checks your phone, keeps your money, decides who you see, shouts at you, or you are careful what you raise because of how they react: that is not a disagreement to work out. Tell that one person, as it is.

The helpline below is free, and you do not have to give your name.`

function scoreIntent(intent: CoachIntent, message: string): number {
  const m = normalize(message)
  let score = 0
  for (const kw of intent.keywords) {
    const k = normalize(kw)
    if (hasWords(m, k)) score += 1 + k.split(' ').length * 0.5
  }
  return score
}

/**
 * The answer for anything the keyword engine can't place — which, offline, is
 * most real questions.
 *
 * It opens in the mode's own voice (that invitation is what `fallback` was
 * written for) and then gives the frame that genuinely applies to almost any
 * relationship situation. Two things this fixes: the frame used to be
 * byte-identical in all five modes, so asking the Therapist and the Wise Auntie
 * the same thing returned the same words — obvious the moment two people
 * compare screens; and the alternative for short questions was a bare "tell me
 * more" with no follow-ups, which dead-ended the thread.
 *
 * Live Claude replaces this entirely when it answers. This is the floor.
 */
function frameworkAnswer(ctx: CoachContext, modeId: ModeId): string {
  return `${getMode(modeId).fallback(ctx)}

While you do, three things help in almost any situation:

• **Separate what you've seen from what it means.** What was said or done is one thing; what you hope or fear it means is another.
• **Hold it against what matters to you.** Your non-negotiables, not how tonight feels.
• **Notice what it costs you.** If you have to shrink, over-explain, or keep managing your own worry, name that to yourself first.

Put your situation against those three.`
}

/**
 * How long to wait on the live guide before falling back to the local voice.
 *
 * Measured, not guessed: real replies land in 4-8s, with the occasional slow
 * one. This was 12s, which measurement showed was cutting off genuine answers
 * — a fallback that fires on a working call is worse than no fallback, because
 * the member gets the lesser voice and nothing looks broken. Wide enough now
 * to let a slow success through, still bounded so a hung function can never
 * become an open-ended typing indicator on a shared screen.
 */
/**
 * The answers the guide's prompt reads (netlify/shared/prompt.ts
 * `sanitiseContext`), and nothing else. Every other answer stays on the phone.
 */
const GUIDE_ANSWERS = [
  'timeline',
  'practice',
  'faith-role',
  'family-role',
  'children',
  'attachment',
  'dealbreakers',
  'hardest-part',
] as const

const LIVE_GUIDE_TIMEOUT_MS = 20_000

/**
 * What sits under a reply.
 *
 * These used to be three questions — "Is this a red flag?", "How do I bring
 * this up gently?" — chosen so that "the conversation never dead-ends". That is
 * the design goal of a chat product, and the wrong one here: a guide that is
 * good at its job ends conversations, because the member goes and says the
 * thing. So what sits under a reply now closes it. `commit` writes the words
 * down as a follow-up Home will ask about in a few days; `close` is permission
 * to stop; `ask` appears only when the guide genuinely lacks a fact.
 */
export type Closer =
  | { kind: 'commit'; words: string; label: string }
  | { kind: 'close'; label: string }
  | { kind: 'ask'; text: string; label: string }

export interface CoachReply {
  text: string
  closers: Closer[]
  /**
   * True when this came from the guide itself rather than the offline voice.
   *
   * The caller needs it for two reasons the caller cannot work out alone. A
   * reply that streamed real words and then lost the connection must not have
   * those words replaced by the canned framework — she watched a tailored
   * answer being typed and then saw it vanish. And a fallback must not cost
   * one of her replies: the comment at the charge site says it already does
   * not, and until now it did (docs/DESIGN.md).
   */
  live: boolean
}

const CLOSE: Closer = { kind: 'close', label: 'That’s enough for tonight' }

/**
 * The words inside a reply's "Try:" line, if it has one — the same shape the
 * chat renders as a script card. Nothing else in the answer counts as words
 * to say, so nothing else can become a commitment.
 */
export function scriptIn(text: string): string | null {
  const block = text.split(/\n\n+/).find((b) => /^Try:/i.test(b.trim()))
  if (!block) return null
  const body = block.trim().replace(/^Try:\s*/i, '')
  const match = body.match(/^[“"]([\s\S]*?)[”"]/)
  const words = (match ? match[1] : body).trim()
  return words.length > 0 ? words : null
}

/** Closers for a reply: a commitment when there are words to commit to, and permission to stop. */
export function closersFor(text: string, extra: Closer[] = []): Closer[] {
  const words = scriptIn(text)
  return [
    ...(words ? [{ kind: 'commit' as const, words, label: 'I’ll say this — ask me in three days' }] : []),
    ...extra,
    CLOSE,
  ]
}

/**
 * Ask the live guide, if one is switched on.
 *
 * Returns null for every failure — not configured, rate limited, offline, a
 * safety decline — so the caller falls back to the local voice. A member in the
 * middle of a hard night should never see an error where an answer was.
 */
async function askLiveGuide(
  message: string,
  ctx: CoachContext,
  modeId: ModeId,
  history: CoachMessage[],
  onChunk?: (soFar: string) => void,
): Promise<string | null> {
  // The deadline is on the FIRST word, not on the whole answer.
  //
  // A guide reply streams for as long as it needs to; that is not a stall, it
  // is someone talking. What must never happen is unbounded silence, so the
  // clock runs until the first byte arrives and is cleared the moment it does.
  // Timing the whole response instead would cut off long answers precisely
  // when they were going well.
  const abort = new AbortController()
  let waiting: ReturnType<typeof setTimeout> | undefined = setTimeout(
    () => abort.abort(),
    LIVE_GUIDE_TIMEOUT_MS,
  )
  const stopWaiting = () => {
    if (waiting !== undefined) {
      clearTimeout(waiting)
      waiting = undefined
    }
  }

  try {
    const res = await fetch('/.netlify/functions/guide', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: abort.signal,
      // The mode and the map, never the prompt. The persona, the frame and
      // the grounding rules are built on the server from these — see
      // netlify/shared/prompt.ts for why this is not a thing the browser gets
      // to decide.
      body: JSON.stringify({
        mode: modeId,
        context: {
          // Only what netlify/shared/prompt.ts reads — never her name, and
          // never an answer in her own words. The whole identity and every
          // answer used to go, and the server threw most of it away
          // (docs/PRIVACY.md, C4).
          identity: { gender: ctx.identity.gender, scene: ctx.identity.scene },
          answers: Object.fromEntries(GUIDE_ANSWERS.filter((k) => k in ctx.answers).map((k) => [k, ctx.answers[k]])),
          stage: ctx.stage,
          readNote: ctx.readNote,
          beforeYesNote: ctx.beforeYesNote,
        },
        message,
        // From her first message on. What comes before it is the voice's
        // greeting, which carries her first name — and a conversation the
        // model is handed should open with her, not with itself.
        history: fromFirstMessage(history).map((m) => ({ role: m.role, text: m.text })),
      }),
    })
    if (!res.ok || !res.body) return null

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let text = ''
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      const piece = decoder.decode(value, { stream: true })
      if (!piece) continue
      stopWaiting()
      text += piece
      onChunk?.(text)
    }
    text += decoder.decode()
    return text.trim() || null
  } catch {
    return null
  } finally {
    stopWaiting()
  }
}

/** The thread from her first message on; nothing if she has not written yet. */
export function fromFirstMessage(history: CoachMessage[]): CoachMessage[] {
  const first = history.findIndex((m) => m.role === 'user')
  return first === -1 ? [] : history.slice(first)
}

export async function askCoach(
  message: string,
  ctx: CoachContext,
  modeId: ModeId,
  history: CoachMessage[] = [],
  /** Called with the answer so far as it streams, so the UI can show it live. */
  onChunk?: (soFar: string) => void,
): Promise<CoachReply> {
  // The live guide first, unless she has asked us to stay on the device. Its
  // own latency is the considered pause, so there is no artificial wait here.
  if (!ctx.onDeviceOnly) {
    const live = await askLiveGuide(message, ctx, modeId, history, onChunk)
    if (live) return { text: live, closers: needsCrisisLine(message) ? [] : closersFor(live), live: true }
  }

  // A short, considered pause — a guide thinks before speaking.
  await new Promise((r) => setTimeout(r, 700 + Math.random() * 500))
  return localReply(message, ctx, modeId)
}

/**
 * The offline voice's answer, with no network and no pause — what a member
 * gets whenever the live guide cannot answer. Pure, so the Guide's evaluation
 * suite can grade every case against it (tests/guide-eval.test.ts).
 */
export function localReply(message: string, ctx: CoachContext, modeId: ModeId): CoachReply {
  // A life first, then harm to her, then harm she is asked to do — before any
  // voice's own intents. A threat is not a question about texting late at
  // night, whichever voice she opened.
  // No closers under a crisis: "That's enough for tonight" is the wrong
  // invitation to someone who may be at risk (docs/GUIDE-EVAL.md).
  if (needsCrisisLine(message)) return { text: CRISIS_REPLY, closers: [], live: false }
  // Being made to marry has its own answer: the people doing it are usually
  // the ones SAFETY_REPLY's "tell a sister, an older woman" would name.
  if (FORCE_WORDS.some((w) => hasWords(normalize(message), w))) return { text: FORCED_REPLY, closers: closersFor(FORCED_REPLY), live: false }
  if (needsHelpLine(message)) return { text: SAFETY_REPLY, closers: closersFor(SAFETY_REPLY), live: false }
  if (HARM_WORDS.some((w) => hasWords(normalize(message), w))) return { text: HARM_REPLY, closers: closersFor(HARM_REPLY), live: false }
  // A no someone wants a way around: before any voice's words for a father.
  if (NO_WORDS.some((w) => hasWords(normalize(message), w))) return { text: NO_REPLY, closers: closersFor(NO_REPLY), live: false }
  // Custom asked about as religion: the principle, the custom named as custom,
  // and the ruling handed on (Part 17).
  if (MAHR_OWNER_RE.test(normalize(message))) return { text: MAHR_OWNER_REPLY, closers: closersFor(MAHR_OWNER_REPLY), live: false }
  if (CLAN_RE.test(normalize(message)) && AS_RELIGION_RE.test(normalize(message)))
    return { text: CLAN_RELIGION_REPLY, closers: closersFor(CLAN_RELIGION_REPLY), live: false }
  // Then how it went, then how they argue, then what about — each before any
  // voice's own intents, whichever voice she opened.
  const m = normalize(message)
  const fixed = (text: string): CoachReply => ({ text, closers: closersFor(text), live: false })
  const reply = PRESSURE_WORDS.some((w) => hasWords(m, w))
    ? fixed(PRESSURE_REPLY)
    : WENT_DIFFERENTLY_WORDS.some((w) => hasWords(m, w))
      ? fixed(WENT_DIFFERENTLY_REPLY)
      : PROCESS_WORDS.some((w) => hasWords(m, w))
        ? fixed(PROCESS_REPLY)
        : DIFFERENCE_WORDS.some((w) => hasWords(m, w))
          ? fixed(DIFFERENCE_REPLY)
          : decisionReply(message, m, ctx) ?? voiceReply(message, ctx, modeId)
  // Principles, never rulings, and the ruling's owner named. "Too far in" is
  // years spent, not a question about how far is too far.
  const asked = m.replace(/\btoo far (in|gone|along)\b/g, '')
  if (RULING_WORDS.some((w) => hasWords(asked, w)) && !/\b(scholar|imam)\b/i.test(reply.text)) {
    const text = `${reply.text}\n\n${DEFERENCE}`
    return { ...reply, text, closers: closersFor(text) }
  }
  return reply
}

/**
 * Decision support, in any voice: a reason standing in for what she has seen
 * (a prayer and what followed, a wedding in motion, someone else's yes, time
 * spent, the clock, a count, one quality), being asked to decide or to read a
 * mind; or she is done. Null when none of those is what she said.
 */
function decisionReply(message: string, m: string, ctx: CoachContext): CoachReply | null {
  const fixed = (text: string): CoachReply => ({ text, closers: closersFor(text), live: false })
  const any = (words: string[]) => words.some((w) => hasWords(m, w))
  // A reason that is not about him, most particular first (docs/DECISIONS.md
  // Part 14); then being asked to decide, or to read a mind.
  if (PRAYER_RE.test(m) && (AFTER_PRAYER_RE.test(m) || any(DECIDE_WORDS))) return fixed(signReply(ctx))
  if (any(MOMENTUM_WORDS)) return fixed(momentumReply(ctx))
  if (any(FAMILY_YES_WORDS) || OTHERS_YES_RE.some((re) => re.test(m))) return fixed(familyYesReply(ctx))
  if (any(TIME_WORDS) || TIME_RE.test(m)) return fixed(TIME_REPLY)
  if (any(CLOCK_WORDS) || CLOCK_RE.test(m)) return fixed(clockReply(ctx))
  if (any(COUNT_WORDS) || COUNT_RE.some((re) => re.test(m))) return fixed(countReply(ctx))
  if (any(ONE_THING_WORDS)) return fixed(oneThingReply(ctx))
  if (any(DECIDE_WORDS)) return fixed(decideReply(ctx))
  if (any(INTENT_WORDS)) return fixed(intentReply(ctx))
  const done = !message.includes('?') && message.trim().length <= 100
  if (done && any(STOP_WORDS)) return fixed(STOP_REPLY)
  if (done && any(THANKS_WORDS)) return fixed(CLOSE_REPLY)
  return null
}

/** The voice's own answer: its intents, or the framework. */
function voiceReply(message: string, ctx: CoachContext, modeId: ModeId): CoachReply {
  const mode = getMode(modeId)

  let best: CoachIntent | null = null
  let bestScore = 0
  for (const intent of mode.intents) {
    const score = scoreIntent(intent, message)
    if (score > bestScore) {
      bestScore = score
      best = intent
    }
  }
  if (best && bestScore > 0) {
    const text = best.respond(ctx)
    return { text, closers: closersFor(text), live: false }
  }

  // Every unmatched question gets the framework, whatever its length.
  //
  // This used to require more than 70 characters, so short real questions —
  // "How do I know if he's serious?", and every one of the app's own suggestion
  // chips — fell through to `mode.fallback`, a canned "tell me more" that then
  // dead-ended with no follow-ups at all. The framework is a genuine answer and
  // the fallback is not; there was never a reason a short question deserved the
  // worse one. Each mode's `fallback` line now opens the framework answer, so
  // its warmth is kept and it can no longer be the whole reply.
  // The one place an ask is honest: the guide could not place the question,
  // so it genuinely needs the specific part before it can hand over words.
  const text = frameworkAnswer(ctx, modeId)
  return {
    text,
    closers: closersFor(text, [{ kind: 'ask', text: 'Here’s the specific part…', label: 'Here’s the specific part…' }]),
    live: false,
  }
}

