/**
 * What a couple sheet leaves behind when it goes, so a report can still reach
 * the founder.
 *
 * A report names a pair by its couple code, and it was accepted only while the
 * sheet existed (netlify/functions/safety.ts). But the sheet is not hers to
 * keep: both people hold the code, and either can delete it — so the man she
 * means to report could make every report she tried a 404 with one request,
 * and her screen said "Didn't send — try again" (docs/SECURITY.md, harassment).
 * Forget me took it too, and the sweep takes every sheet at ninety days —
 * which is about when someone who was frightened decides to say so.
 *
 * So a sheet that goes leaves `gone/<code>`: the day its reporting window
 * closes, and nothing else. No side, no answer, no creator, nothing that says
 * who either of them was. `GET /couple` still answers 404 — it reads the sheet,
 * never this. The weekly sweep takes it when its own window ends.
 *
 * Not stamped with a record version (netlify/shared/record.ts): it is not a
 * record about anyone, only a date under a key.
 *
 * Shared, not a function — see netlify/shared/founder.ts for why this lives
 * beside `netlify/functions` rather than in it.
 */

import { day } from './day'

const DAY_MS = 24 * 60 * 60 * 1000
/** How long a report can still be made after the sheet is gone. */
export const REPORT_WINDOW_MS = 90 * DAY_MS

const GONE = 'gone/'

/** The key a retired sheet leaves behind. */
export const goneKey = (code: string) => `${GONE}${code}`

/** True for the keys this module writes, so a sweep can tell them apart. */
export const isGone = (key: string) => key.startsWith(GONE)

interface Couples {
  getMetadata(key: string): Promise<unknown>
  get(key: string, opts: { type: 'json' }): Promise<unknown>
  setJSON(key: string, value: unknown): Promise<unknown>
  delete(key: string): Promise<void>
}

/**
 * Delete the sheet and leave its window behind — only if there was a sheet.
 * A forged snapshot can name any code (netlify/functions/keep.ts); a code that
 * never held a sheet must not become one a report can be made against.
 * `from` is when the window opens: now, or the day an expired sheet ran out.
 */
export async function retire(couples: Couples, code: string, from = Date.now()): Promise<boolean> {
  if (!(await couples.get(code, { type: 'json' }))) return false
  // A day, never the moment (netlify/shared/day.ts): this was the one date in
  // any store still written to the millisecond. The day after the ninetieth,
  // since a bare day reads as its midnight, so the window is never shorter.
  await couples.setJSON(goneKey(code), { expiresAt: day(from + REPORT_WINDOW_MS + DAY_MS) })
  await couples.delete(code)
  return true
}

/** Whether a report can be made against this code: a sheet, or a window still open. */
export async function reportable(couples: Couples, code: string, now = Date.now()): Promise<boolean> {
  if (await couples.getMetadata(code)) return true
  const gone = (await couples.get(goneKey(code), { type: 'json' })) as { expiresAt?: unknown } | null
  return !!gone && typeof gone.expiresAt === 'string' && Date.parse(gone.expiresAt) >= now
}
