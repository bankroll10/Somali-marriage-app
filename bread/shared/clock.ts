/**
 * The one way the app asks what time it is. Production passes the system
 * clock; tests pass a clock they control, so a cutoff, a hold expiry or a
 * daylight-saving change can be pinned to the millisecond without faking
 * global timers.
 */
export interface Clock {
  /** Milliseconds since the epoch. */
  now(): number
}

export const systemClock: Clock = { now: () => Date.now() }

export interface FixedClock extends Clock {
  set(ms: number): void
  advance(ms: number): void
}

export function fixedClock(startMs: number): FixedClock {
  let t = startMs
  return {
    now: () => t,
    set: (ms) => {
      t = ms
    },
    advance: (ms) => {
      t += ms
    },
  }
}
