import { PICKUP_END_HOUR, PICKUP_PREFERRED_AFTER_HOUR, PICKUP_START_HOUR, PRODUCTS } from '../../shared/config.ts'
import type { Qty } from '../../shared/types.ts'

export const hour12 = (h: number) => `${h > 12 ? h - 12 : h} ${h >= 12 ? 'PM' : 'AM'}`

export const PICKUP_WINDOW = `${hour12(PICKUP_START_HOUR)}–${hour12(PICKUP_END_HOUR)}`
export const PICKUP_PREFERRED = `best after ${hour12(PICKUP_PREFERRED_AFTER_HOUR)}`

/** "2 sourdough · 1 banana bread" */
export function describeQty(qty: Qty, style: 'short' | 'long' = 'long'): string {
  const parts = PRODUCTS.filter((p) => qty[p.id] > 0).map((p) =>
    style === 'short' ? `${qty[p.id]} ${p.short}` : `${qty[p.id]} ${p.name.toLowerCase()}`,
  )
  return parts.join(' · ')
}
