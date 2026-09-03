import type { CoupleState, ReadRecord, Stage, VouchState, WaitlistState } from '../types'

/**
 * The ladder — the only thing this product is allowed to measure.
 *
 * Every app in this category is judged on screen time, messages sent and
 * swipes, and every one of those numbers goes up when a person is stuck. A
 * marriage product that optimises them is optimising against its own purpose.
 *
 * So the measurement here is a ladder of rungs, and each rung is a claim about
 * a person's life rather than about their use of an app: they said what was
 * happening, they read someone, they worked through the eleven, they asked him
 * to do it too, they actually had the conversation, a family vouched, they are
 * deciding, they are married. Nothing in this vocabulary can be moved by
 * keeping someone on a screen for longer.
 *
 * The one number worth watching is `followed-through` per hundred `arrived`:
 * of the people who came here, how many had a conversation they were not going
 * to have. That is reach times magnitude, and it cannot be gamed by anything
 * that does not help a specific person say a specific hard thing.
 *
 * The order below is the order a serious person tends to move in, not a funnel
 * — someone can be counted in her city without ever taking a read, and the
 * readout counts each rung on its own rather than assuming she passed through
 * the ones above it.
 *
 * Pure: everything it needs is passed in, exactly like src/lib/ledger.ts, so
 * it can be tested without a browser and can never accidentally carry an
 * answer, a name, or a message off the device.
 */

export type RungId =
  | 'arrived'
  | 'situated'
  | 'mapped'
  | 'read'
  | 'eleven'
  | 'asked-him'
  | 'he-answered'
  | 'followed-through'
  | 'vouched'
  | 'counted'
  | 'deciding'
  | 'married'

/** The ladder, in order. The server validates against exactly this set. */
export const RUNG_IDS: RungId[] = [
  'arrived',
  'situated',
  'mapped',
  'read',
  'eleven',
  'asked-him',
  'he-answered',
  'followed-through',
  'vouched',
  'counted',
  'deciding',
  'married',
]

/**
 * Derived state only. There is deliberately no field here that could hold text
 * a person wrote — the type is the guarantee.
 */
export interface RungInput {
  situated: boolean
  completed: boolean
  stage: Stage
  read: ReadRecord | null
  beforeYes: ReadRecord | null
  couple: CoupleState | null
  vouch: VouchState | null
  waitlist: WaitlistState | null
  /** She confirmed she actually had one of the conversations. See lib/followup.ts. */
  followedThrough: boolean
}

export function rungsFrom(i: RungInput): RungId[] {
  const reached: Record<RungId, boolean> = {
    // Opening the app at all. The denominator, and the only rung that is free.
    arrived: true,
    situated: i.situated,
    mapped: i.completed,
    read: !!i.read,
    eleven: !!i.beforeYes,
    'asked-him': !!i.couple,
    'he-answered': !!i.couple?.answered,
    'followed-through': i.followedThrough,
    vouched: !!i.vouch,
    counted: !!i.waitlist,
    deciding: i.stage === 'deciding' || i.stage === 'married',
    married: i.stage === 'married',
  }
  return RUNG_IDS.filter((id) => reached[id])
}
