import { useState } from 'react'
import type { AdminResponse, ClearPracticeResult, GoLiveProbe, GoLiveStatus, GoLiveWebhook } from '../../../shared/types.ts'
import { ApiError, goLive } from '../../lib/api.ts'
import { Button, Field, Notice, Page, Spinner, Title, inputClass } from '../ui.tsx'

type Step<T> = { state: 'idle' } | { state: 'running' } | { state: 'done'; result: T } | { state: 'error'; message: string }

const OFFLINE = 'No connection, or the site could not reach Stripe. Nothing changed — try again.'

/**
 * Everything before the switch, from a phone. Each step runs on the site
 * itself — the one place that can always reach Stripe — with Biz's staged
 * live key. Nothing here takes a payment, and nothing here turns live
 * payments on: that is one Netlify variable, explained at the bottom.
 */
export default function GoLive({ token, ops, onBack, onSessionEnded }: { token: string; ops: AdminResponse['ops']; onBack: () => void; onSessionEnded: () => void }) {
  const [status, setStatus] = useState<Step<GoLiveStatus>>({ state: 'idle' })
  const [probe, setProbe] = useState<Step<GoLiveProbe>>({ state: 'idle' })
  const [hook, setHook] = useState<Step<GoLiveWebhook>>({ state: 'idle' })
  const [clear, setClear] = useState<Step<ClearPracticeResult>>({ state: 'idle' })
  const [typed, setTyped] = useState('')
  const [copied, setCopied] = useState(false)

  async function run<T>(set: (s: Step<T>) => void, fn: () => Promise<T>) {
    set({ state: 'running' })
    try {
      set({ state: 'done', result: await fn() })
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'offline'
      if (code === 'unauthorized' || code === 'session_expired') return onSessionEnded()
      set({
        state: 'error',
        message:
          code === 'live_key_not_staged'
            ? "Biz's live key isn't on the site yet."
            : code === 'live_sales_present'
              ? 'There are real (live) sales in the database, so nothing was cleared. This step is only for the practice orders before launch.'
              : code === 'confirm_required'
                ? 'Type CLEAR first.'
                : OFFLINE,
      })
    }
  }

  const tick = (ok: boolean) => (ok ? '✓' : '✗')
  const secretSaved = ops.liveWebhookSecretStaged
  const webhookExists = status.state === 'done' && status.result.webhookExists

  return (
    <Page width="max-w-2xl">
      <div className="mb-4 flex items-start justify-between gap-3">
        <Title kicker="Fresh Bread" sub="Everything before real payments are switched on. Nothing on this page takes a payment.">
          Going live
        </Title>
        <Button variant="ghost" className="shrink-0" onClick={onBack}>
          ← Orders
        </Button>
      </div>

      <section className="mb-6 rounded-2xl border border-line bg-white p-4 text-[14px] text-cocoa">
        <p className="mb-2 font-semibold">Where things stand</p>
        <ul className="space-y-1">
          <li>
            {tick(ops.liveKeyStaged)} Biz's live key {ops.liveKeyStaged ? 'is on the site' : 'is not on the site yet'}
          </li>
          <li>
            {tick(secretSaved)} Live webhook secret {secretSaved ? 'is saved in Netlify' : 'not saved yet (step 3)'}
          </li>
          <li>
            {ops.mode === 'live' ? '● LIVE — real payments' : '○ Test mode — practice payments only'}
          </li>
        </ul>
      </section>

      {!ops.liveKeyStaged ? (
        <Notice tone="warn">Biz's live key isn't on the site yet, so none of the steps below can run.</Notice>
      ) : (
        <ol className="space-y-6">
          {/* 1 */}
          <li className="rounded-2xl border border-line bg-white p-4">
            <h2 className="text-[17px] font-semibold text-cocoa">1. Check Biz's Stripe account</h2>
            <p className="mt-1 text-[14px] text-cocoa-soft">Asks Stripe whether her account can really take a card payment and pay it out to her bank. Reads only.</p>
            <Button className="mt-3" disabled={status.state === 'running'} onClick={() => run(setStatus, () => goLive.status(token))}>
              {status.state === 'running' ? 'Asking Stripe…' : status.state === 'done' ? 'Check again' : 'Check now'}
            </Button>
            {status.state === 'running' && <Spinner label="Asking Stripe…" />}
            {status.state === 'error' && <Notice tone="error" className="mt-3">{status.message}</Notice>}
            {status.state === 'done' && (
              <ul className="mt-3 space-y-1.5 text-[14px]">
                {status.result.checks.map((c) => (
                  <li key={c.name} className={c.ok ? 'text-cocoa' : 'text-berry'}>
                    <span className="font-semibold">{tick(c.ok)} {c.name}</span>
                    <span className="block pl-5 text-[13px] text-cocoa-soft">{c.detail}</span>
                  </li>
                ))}
                {!status.result.webhookExists && <li className="pt-1 text-[13px] text-cocoa-soft">The webhook rows fail until step 3 — that's expected.</li>}
                {status.result.errors.map((e) => (
                  <li key={e.message} className="text-[13px] text-berry">Stripe said: {e.message}</li>
                ))}
              </ul>
            )}
          </li>

          {/* 2 */}
          <li className="rounded-2xl border border-line bg-white p-4">
            <h2 className="text-[17px] font-semibold text-cocoa">2. Test the checkout</h2>
            <p className="mt-1 text-[14px] text-cocoa-soft">
              Makes the same payment page a customer gets, then cancels it immediately. <b>Charges nothing</b> — nobody can pay a cancelled page. It proves Biz's key can
              do what a real order needs. Best done before step 3.
            </p>
            {webhookExists && probe.state === 'idle' && (
              <Notice tone="info" className="mt-3">
                The webhook already exists, so Stripe will show one failed delivery for this test until the switch. Harmless.
              </Notice>
            )}
            <Button className="mt-3" disabled={probe.state === 'running'} onClick={() => run(setProbe, () => goLive.probe(token))}>
              {probe.state === 'running' ? 'Testing…' : probe.state === 'done' ? 'Test again' : 'Run the test'}
            </Button>
            {probe.state === 'error' && <Notice tone="error" className="mt-3">{probe.message}</Notice>}
            {probe.state === 'done' &&
              (probe.result.ok ? (
                <Notice tone="ok" className="mt-3">
                  ✓ Stripe accepted it{probe.result.livemode ? ' in live mode' : ' (test mode — this key is not live)'} and it was cancelled straight away.
                </Notice>
              ) : (
                <Notice tone="error" className="mt-3">
                  ✗ Stripe refused when {probe.result.step === 'create' ? 'making' : 'cancelling'} it: {probe.result.message}
                  {probe.result.type === 'StripePermissionError' && ' — the key is missing a permission. Biz needs "Checkout Sessions: Write" on it.'}
                </Notice>
              ))}
          </li>

          {/* 3 */}
          <li className="rounded-2xl border border-line bg-white p-4">
            <h2 className="text-[17px] font-semibold text-cocoa">3. Create the live webhook</h2>
            <p className="mt-1 text-[14px] text-cocoa-soft">
              Sets up how Stripe tells the site a payment went through, with every event it needs. Safe to press twice — it never makes a second one.
            </p>
            <Button className="mt-3" disabled={hook.state === 'running'} onClick={() => run(setHook, () => goLive.webhook(token))}>
              {hook.state === 'running' ? 'Setting up…' : 'Create webhook'}
            </Button>
            {hook.state === 'error' && <Notice tone="error" className="mt-3">{hook.message}</Notice>}
            {hook.state === 'done' && !hook.result.ok && <Notice tone="error" className="mt-3">✗ Stripe refused: {hook.result.message}</Notice>}
            {hook.state === 'done' && hook.result.ok && hook.result.action === 'created' && (
              <div className="mt-3 rounded-xl border border-crust/40 bg-crust/5 p-3">
                <p className="text-[14px] font-semibold text-cocoa">Save this now — Stripe will never show it again.</p>
                <code className="mt-2 block break-all rounded-lg bg-white p-2 font-mono text-[13px] text-cocoa">{hook.result.secret}</code>
                <Button
                  variant="secondary"
                  className="mt-2"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(hook.result.ok && hook.result.action === 'created' ? hook.result.secret : '')
                      setCopied(true)
                    } catch {
                      setCopied(false)
                    }
                  }}
                >
                  {copied ? 'Copied ✓' : 'Copy'}
                </Button>
                <ol className="mt-3 list-decimal space-y-1 pl-5 text-[14px] text-cocoa">
                  <li>app.netlify.com → bread-pickup → Site configuration → Environment variables</li>
                  <li>Add a variable → Key: <code className="font-mono">STRIPE_LIVE_WEBHOOK_SECRET</code> → paste → Create</li>
                  <li>Don't save it anywhere else. Nothing on the site changes until the switch.</li>
                </ol>
              </div>
            )}
            {hook.state === 'done' && hook.result.ok && hook.result.action === 'updated' && (
              <Notice tone="ok" className="mt-3">
                ✓ It already existed and was missing {hook.result.added.join(', ')} — added. Its secret is unchanged{secretSaved ? ' and already saved.' : '; if it isn’t in Netlify, roll it in Stripe → Developers → Webhooks.'}
              </Notice>
            )}
            {hook.state === 'done' && hook.result.ok && hook.result.action === 'unchanged' && (
              <Notice tone="ok" className="mt-3">
                ✓ Already set up with every event.{secretSaved ? ' Its secret is saved.' : ' If its secret isn’t in Netlify yet, roll it in Stripe → Developers → Webhooks → this endpoint → Roll secret.'}
              </Notice>
            )}
          </li>

          {/* 4 */}
          <li className="rounded-2xl border border-line bg-white p-4">
            <h2 className="text-[17px] font-semibold text-cocoa">4. Clear the practice orders</h2>
            <p className="mt-1 text-[14px] text-cocoa-soft">
              Deletes every test order so each day opens with its full bread. Keeps prices, amounts and blocked days. Refuses if any real sale exists. Do this right before the switch.
            </p>
            <div className="mt-3 max-w-xs">
              <Field label="Type CLEAR to confirm">{(a) => <input {...a} className={inputClass} value={typed} onChange={(e) => setTyped(e.target.value)} autoCapitalize="characters" />}</Field>
            </div>
            <Button variant="danger" className="mt-3" disabled={typed !== 'CLEAR' || clear.state === 'running'} onClick={() => run(setClear, () => goLive.clearPractice(token))}>
              {clear.state === 'running' ? 'Clearing…' : 'Clear practice orders'}
            </Button>
            {clear.state === 'error' && <Notice tone="error" className="mt-3">{clear.message}</Notice>}
            {clear.state === 'done' && (
              <Notice tone="ok" className="mt-3">
                ✓ Removed {clear.result.before.orders} practice order{clear.result.before.orders === 1 ? '' : 's'}. Every day is back to its full amount.
              </Notice>
            )}
          </li>

          {/* 5 */}
          <li className="rounded-2xl border border-cocoa/30 bg-cream-2 p-4">
            <h2 className="text-[17px] font-semibold text-cocoa">5. The switch — only when Biz says go</h2>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-[14px] text-cocoa">
              <li>app.netlify.com → bread-pickup → Site configuration → Environment variables</li>
              <li>Add a variable → Key: <code className="font-mono">STRIPE_MODE</code> → Value: <code className="font-mono">live</code> → Create</li>
              <li>Deploys → Trigger deploy → Deploy site. About a minute.</li>
              <li>Come back here: the TEST MODE notice is gone and this page says LIVE.</li>
            </ol>
            <p className="mt-3 text-[14px] text-cocoa">
              <b>To undo:</b> delete <code className="font-mono">STRIPE_MODE</code> and trigger a deploy again. Both sets of keys stay where they are.
            </p>
            {ops.mode !== 'live' && !(ops.liveKeyStaged && secretSaved) && (
              <p className="mt-2 text-[13px] text-cocoa-soft">Not ready to switch yet: {!secretSaved ? 'the webhook secret isn’t saved (a saved secret shows ✓ after the next deploy).' : 'the live key is missing.'}</p>
            )}
          </li>
        </ol>
      )}
    </Page>
  )
}
