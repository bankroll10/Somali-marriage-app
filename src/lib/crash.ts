import { send } from './net'

/**
 * Must match netlify/shared/vocab.ts CRASH_EVENTS.
 *
 * The one thing a phone tells the server about the app failing on it: that it
 * crashed (`crash`), or that a screen's code never arrived (`chunk`). No
 * stack, no screen, no code, no install id — a day's total is all the founder
 * ever sees (netlify/functions/health.ts, docs/OPS.md). Without it, a deploy
 * that crashes on every phone would be invisible until someone wrote in.
 */
export const CRASH_EVENTS = ['crash', 'chunk'] as const
export type CrashEvent = (typeof CRASH_EVENTS)[number]

let told = false

/** Say so, once per page load, and never wait on it or mind if it fails. */
export function reportCrash(event: CrashEvent): void {
  if (told) return
  told = true
  void send('/.netlify/functions/health', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event }),
  }).catch(() => {})
}

/** Tests load a new page by resetting this. */
export function resetCrashReport(): void {
  told = false
}
