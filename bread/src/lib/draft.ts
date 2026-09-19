import type { Qty } from '../../shared/types.ts'
import { zeroQty } from '../../shared/types.ts'

/**
 * What the customer had chosen, kept for this tab only, so a trip to Stripe's
 * page and Back — or a reload — lands them where they were. Quantities, the
 * day and the name; never the phone number.
 */
const KEY = 'bread-draft'

export interface Draft {
  qty: Qty
  date: string | null
  name: string
}

export function loadDraft(): Draft {
  const empty: Draft = { qty: zeroQty(), date: null, name: '' }
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return empty
    const d = JSON.parse(raw) as Partial<Draft>
    const qty = zeroQty()
    for (const id of Object.keys(qty) as (keyof Qty)[]) {
      const n = d.qty?.[id]
      if (Number.isInteger(n) && (n as number) >= 0 && (n as number) <= 20) qty[id] = n as number
    }
    return { qty, date: typeof d.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.date) ? d.date : null, name: typeof d.name === 'string' ? d.name.slice(0, 80) : '' }
  } catch {
    return empty
  }
}

export function saveDraft(d: Draft): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(d))
  } catch {
    /* private mode: nothing kept, nothing broken */
  }
}

export function clearDraft(): void {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
