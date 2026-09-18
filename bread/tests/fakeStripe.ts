import type Stripe from 'stripe'

/**
 * Just enough of Stripe to drive checkout, the webhook and the confirmation
 * page. Sessions are remembered so a test can "pay" one and replay the event.
 */
export function fakeStripe(opts: { failCreate?: boolean } = {}) {
  const sessions = new Map<string, Stripe.Checkout.Session>()
  let n = 0
  const created: Stripe.Checkout.SessionCreateParams[] = []
  const api = {
    created,
    sessions,
    checkout: {
      sessions: {
        create: async (params: Stripe.Checkout.SessionCreateParams) => {
          if (opts.failCreate) throw new Error('stripe down')
          created.push(params)
          const id = `cs_test_${++n}`
          const session = {
            id,
            object: 'checkout.session',
            url: `https://checkout.stripe.com/c/pay/${id}`,
            payment_status: 'unpaid',
            status: 'open',
            metadata: params.metadata ?? {},
            amount_total: (params.line_items ?? []).reduce((s, li) => s + (li.price_data?.unit_amount ?? 0) * (li.quantity ?? 0), 0),
            created: Math.floor(Date.now() / 1000),
            customer_details: null,
          } as unknown as Stripe.Checkout.Session
          sessions.set(id, session)
          return session
        },
        retrieve: async (id: string) => {
          const s = sessions.get(id)
          if (!s) throw new Error('no such session')
          return s
        },
        expire: async (id: string) => {
          const s = sessions.get(id)
          if (!s || s.status !== 'open') throw new Error('cannot expire')
          Object.assign(s, { status: 'expired' })
          return s
        },
      },
    },
    webhooks: {
      constructEventAsync: async (body: string, signature: string, secret: string) => {
        if (signature !== `sig:${secret}`) throw new Error('bad signature')
        return JSON.parse(body) as Stripe.Event
      },
    },
    /** Test helper: the customer paid. */
    pay(id: string, email = 'customer@example.com') {
      const s = sessions.get(id)!
      Object.assign(s, { payment_status: 'paid', status: 'complete', customer_details: { email } })
      return s
    },
    event(type: string, id: string): string {
      return JSON.stringify({ id: `evt_${id}_${type}`, type, data: { object: sessions.get(id) } })
    },
  }
  return api
}
