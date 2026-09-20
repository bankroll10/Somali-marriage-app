import type { Gender } from '../types'
import { send } from './net'

/** The client half of netlify/functions/safety.ts. See that file for what this is and isn't. */
const ENDPOINT = '/.netlify/functions/safety'


export type ReportResult = 'sent' | 'not_found' | 'error'

/** Report a concern about whoever is on the other side of this couple code. */
export async function sendReport(code: string, side: Gender, reason: string, details?: string): Promise<ReportResult> {
  const res = await send(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, side, reason, details }),
  })
  if (!res) return 'error'
  if (res.status === 404) return 'not_found'
  return res.ok ? 'sent' : 'error'
}
