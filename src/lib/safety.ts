import type { Gender } from '../types'
import { send } from './net'

/** The client half of netlify/functions/safety.ts. See that file for what this is and isn't. */
const ENDPOINT = '/.netlify/functions/safety'


export type ReportResult = 'sent' | 'not_found' | 'error'

/**
 * What withdraws a report: the pair, her side, and the id the server handed
 * back when she filed it. Nobody else is ever given that id — not the other
 * person, who holds the couple code and can name her side, and not the kept
 * map, whose snapshot anyone can forge. It lives on this phone, and forget me
 * sends it (src/lib/forget.ts, docs/SECURITY.md O1).
 */
export interface Receipt {
  code: string
  side: Gender
  id: string
}

const RECEIPTS_KEY = 'niyyah.reports.v1'

export function rememberedReceipts(): Receipt[] {
  try {
    const raw = JSON.parse(localStorage.getItem(RECEIPTS_KEY) ?? '[]') as unknown
    if (!Array.isArray(raw)) return []
    return raw.filter(
      (r): r is Receipt =>
        !!r && typeof r.code === 'string' && (r.side === 'woman' || r.side === 'man') && typeof r.id === 'string',
    )
  } catch {
    return []
  }
}

function keepReceipt(receipt: Receipt) {
  try {
    localStorage.setItem(RECEIPTS_KEY, JSON.stringify([...rememberedReceipts(), receipt]))
  } catch {
    /* storage refused — the report still reached the founder */
  }
}

/** Report a concern about whoever is on the other side of this couple code. */
export async function sendReport(code: string, side: Gender, reason: string, details?: string): Promise<ReportResult> {
  const res = await send(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, side, reason, details }),
  })
  if (!res) return 'error'
  if (res.status === 404) return 'not_found'
  if (!res.ok) return 'error'
  try {
    const { receipt } = (await res.json()) as { receipt?: unknown }
    if (typeof receipt === 'string') keepReceipt({ code, side, id: receipt })
  } catch {
    /* sent; only the receipt is missing, and the founder can still resolve it */
  }
  return 'sent'
}

/** Take one of her reports back. Already gone counts as done. */
export async function withdrawReport({ code, side, id }: Receipt): Promise<boolean> {
  const params = new URLSearchParams({ code, side, id })
  const res = await send(`${ENDPOINT}?${params}`, { method: 'DELETE' })
  return !!res && (res.ok || res.status === 404)
}
