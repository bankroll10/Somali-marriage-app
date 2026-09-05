import type { Gender, Stage } from '../types'
import { speak, type Script } from './read'

/**
 * Bringing the families in.
 *
 * The Problemology audit ranked "I don't know how to bring this to my family
 * without an interrogation" fourth of eighteen, and "how do I tell my wali I
 * met him online" eighth. Both are the same problem: she knows what has to
 * happen and has no words for it. Nobody in this category gives her the words.
 * Family and elders give her the pressure; the apps give her nothing.
 *
 * Every script here is offered, never recommended. There is no state in the
 * app that decides she should end it, or that it is time to send his people.
 * She decides; we hand her the sentences.
 */

export interface FamilyScript {
  id: string
  title: string
  /** When this is the right conversation, in her words. */
  when: string
  /** Stages this is most likely to be needed in. Shown to everyone; sorted by fit. */
  stages: Stage[]
  /** Only for members of this gender, where the role has no mirror. */
  for?: Gender
  script: Script
}

const SCRIPTS: FamilyScript[] = [
  {
    id: 'tell-wali-online',
    title: 'Telling your wali you met him online',
    when: 'Before he hears it from someone else.',
    stages: ['talking', 'deciding'],
    for: 'woman',
    script: {
      why: 'He will find out. The only question is whether from you, first, with the whole picture — or from a cousin, sideways, with none of it.',
      words:
        'Aabo, I want to tell you about someone, and I want you to hear it from me first. I met him online — I know that isn’t how you would have chosen. He is serious, he wants to do this properly, and he has asked how to approach you. I’d like you to meet him, on your terms.',
      tells:
        'Say the last sentence — “on your terms” — and mean it. Your wali’s job is to protect you. Giving him the role, rather than presenting him with a decision, is what makes him an ally instead of an obstacle.',
    },
  },
  {
    id: 'first-with-hooyo',
    title: 'The first conversation with hooyo',
    when: 'Before the aunties have a version.',
    stages: ['talking', 'deciding'],
    script: {
      why: 'Your mother will have questions you can’t answer yet and opinions you didn’t ask for. Tell her before she has a version from someone else, and give her something to do.',
      words:
        'Hooyo, I’ve been getting to know someone, and I want you to know before anyone else does. It’s early, I haven’t decided anything, and I’m not asking you to. I’m telling you because I want you in this from the start — and because I’ll need you when it’s time for the families to meet.',
      tells:
        'Expect the questions to come fast, and to be about {his} family before they are about {him}. Answer what you know, say “I don’t know yet” to the rest, and let her keep the last sentence — the one about needing her — because it is true.',
    },
  },
  {
    id: 'send-his-people',
    title: 'Asking {him} to send {his} people',
    when: 'When talking has gone on long enough.',
    stages: ['talking', 'deciding'],
    for: 'woman',
    script: {
      why: 'In our culture this is the sentence that separates a man who is serious from one who is comfortable. It costs him something to send his family. That is the point.',
      words:
        'I think we’ve talked long enough to know what this is. I’d like you to send your people to my family. I’m not asking for a date — I’m asking for the step. If that feels too soon, tell me honestly, and tell me when wouldn’t be.',
      tells:
        'A serious man asks “when” and “who should I bring”. A man who says “let’s not rush” has just told you his timeline is not yours. Give him the second question — “when wouldn’t be” — so that his answer has to have a month in it.',
    },
  },
  {
    id: 'open-mahr-and-living',
    title: 'Opening mahr, and where you’d live',
    when: 'Before the families set it for you.',
    stages: ['deciding'],
    script: {
      why: 'If you don’t discuss these between you first, they will be decided in a room you’re not in. Having your own answer before the families meet is the difference between being consulted and being informed.',
      words:
        'Before our families sit down, I want us to have our own answers. What do you think is right for the mahr — and where do you see us living in the first year? I’d rather we walk in agreeing than find out at the table that we don’t.',
      tells:
        'You are listening for whether {he} sees this as “ours to decide first”. If {he} defers everything to the elders, you will be deferring for the rest of the marriage.',
    },
  },
  {
    id: 'end-it-kindly',
    title: 'Ending it kindly',
    when: 'When you know — and before you spend another month pretending you don’t.',
    stages: ['talking', 'deciding'],
    script: {
      why: 'Nobody teaches us how to end something halal that did not become a marriage. So people go quiet instead, and the other person spends months reading silence. You can do better than that, and it costs one hard message.',
      words:
        'I’ve thought about this carefully, and I don’t think we’re right for each other for marriage. I’m not going to go quiet on you — you deserve to hear it plainly. I have valued getting to know you, and I mean that. I’ll make dua for you.',
      tells:
        'Send it once, clearly, and then stop. Don’t explain twice; don’t answer a debate. Kindness here is clarity, not softness. Then tell one person you trust that you have done it, so that the community’s version of the story is yours.',
    },
  },
]

/** The scripts she can use, pronouns resolved, the ones for her stage first. */
export function familyScripts(memberGender: Gender = 'woman', stage?: Stage): FamilyScript[] {
  const fix = speak(memberGender)
  return SCRIPTS.filter((s) => !s.for || s.for === memberGender)
    .map((s) => ({
      ...s,
      title: fix(s.title),
      when: fix(s.when),
      script: { why: fix(s.script.why), words: fix(s.script.words), tells: fix(s.script.tells) },
    }))
    .sort((a, b) => Number(!!stage && b.stages.includes(stage)) - Number(!!stage && a.stages.includes(stage)))
}

/** One script by id, pronouns resolved — or undefined when it is not for this member. */
export function familyScript(id: string, memberGender: Gender = 'woman'): FamilyScript | undefined {
  return familyScripts(memberGender).find((s) => s.id === id)
}
