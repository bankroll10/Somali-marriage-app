import type { ModeId } from '../types'

/**
 * The category's point of view, made structural.
 *
 * Every app in this space is built around one moment — the match — and quietly
 * assumes you'll leave after it. That makes success and churn the same event,
 * which is why they all optimise for keeping you single a little longer.
 *
 * Niyyah takes the opposite position: finding someone is the *middle* of the
 * story. The product follows a person from preparing, through getting to know
 * someone, through deciding with their families, into marriage itself — and
 * changes what it offers at each stage. Nobody built for matching can copy this
 * without giving up their business model.
 */
export type Stage = 'preparing' | 'talking' | 'deciding' | 'married'

export interface StageDef {
  id: Stage
  /** How the user names this stage to themselves. */
  label: string
  /** The stage as she would say it, when asked what is happening right now. */
  situation: string
  /**
   * The one line she hears on choosing it — the sentence test. Each is
   * something no alternative in the category would think to say. {he}/{his}
   * tokens resolve for who she is reading.
   */
  arrival: string
  /** The one thing that actually matters right now. Never a checklist. */
  focus: string
  /** The voice that leads at this stage. */
  mode: ModeId
  /** What the guide acknowledges it knows, woven into its greeting. */
  guideLine: string
  /** The honest invitation to move on — only ever offered, never assumed. */
  next?: { id: Stage; prompt: string }
}

export const stages: StageDef[] = [
  {
    id: 'preparing',
    label: 'Preparing',
    situation: 'I’m not talking to anyone — I want to get ready',
    arrival: 'Then this is about you before it’s about anyone else. Two minutes, and you’ll know where you stand.',
    focus:
      'Becoming clear about what you actually need — and becoming someone worth choosing. Everything after this is easier when this part is honest.',
    mode: 'brother',
    guideLine: 'You’re in the preparing stage — this is about you before it’s about anyone else.',
    next: {
      id: 'talking',
      prompt: 'I’ve started getting to know someone',
    },
  },
  {
    id: 'talking',
    label: 'Getting to know someone',
    situation: 'I’m talking to someone, and I can’t tell what it means yet',
    arrival: 'Then the question isn’t whether you’re ready. It’s whether {he} is.',
    focus:
      'Watch behaviour, not words — consistency, family, follow-through. And bring your people in early, while it’s still easy to walk away.',
    mode: 'auntie',
    guideLine:
      'You’re getting to know someone right now — I’ll keep that in mind, and I won’t rush you.',
    next: {
      id: 'deciding',
      prompt: 'We’re deciding whether to marry',
    },
  },
  {
    id: 'deciding',
    label: 'Deciding together',
    situation: 'We’re deciding — families, mahr, where we’d live',
    arrival: 'Then the families are about to be involved. Before they are, there are eleven conversations most of us have too late.',
    focus:
      'The unromantic conversations are the ones that protect you: money, where you’ll live, in-laws, children, and what you each do when it gets hard. Istikhara, then move.',
    mode: 'islamic',
    guideLine:
      'You’re at the deciding stage — the questions get more practical here, and that’s a good sign.',
    next: {
      id: 'married',
      prompt: 'We’re married, alhamdulillah',
    },
  },
  {
    id: 'married',
    label: 'Married',
    situation: 'We’re married, alhamdulillah',
    arrival: 'Then we’re not looking for anyone. We’re building what you already chose.',
    focus:
      'The work changes shape, it doesn’t end. Repair after arguments, protect your two-person team from everyone’s opinions, and keep choosing each other on ordinary Tuesdays.',
    mode: 'therapist',
    guideLine:
      'You’re married now — so we’re not looking for anyone. We’re building what you already chose.',
  },
]

export function getStage(id: Stage | undefined): StageDef {
  return stages.find((s) => s.id === id) ?? stages[0]
}
