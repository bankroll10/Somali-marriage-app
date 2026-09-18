import Stripe from 'stripe'
import { env } from './http.ts'

let client: Stripe | undefined

/** null when no key is configured — the site then says so instead of failing mid-checkout. */
export function stripe(): Stripe | null {
  const key = env.stripeSecret
  if (!key) return null
  if (!client) client = new Stripe(key)
  return client
}

/** Tests replace the client. */
export function useStripeClient(c: Stripe | undefined) {
  client = c
}
