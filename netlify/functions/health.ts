import { getStore } from '@netlify/blobs'
import { readJson } from '../shared/body'
import { day } from '../shared/day'
import { isFounder, notFounder } from '../shared/founder'
import { overHourlyCap, rateLimited } from '../shared/limit'
import { failed, lastRun, note, probe, readDays } from '../shared/ops'
import { CRASH_EVENTS, URGENT_REASONS } from '../shared/vocab'

/**
 * How the service is, in one read — the founder's smoke alarm (docs/OPS.md).
 *
 * `GET`, behind the founder key, answers the nine questions a founder running
 * this alone needs answered quickly: is storage answering, are functions
 * failing, is Claude failing, is spend abnormal, are caps refusing, are safety
 * reports waiting, did the backup happen, is the sweep running, is the app
 * crashing on phones. (Is the app up, and did the deploy land, are answered
 * from outside — .github/workflows/watch.yml and deployed.yml — because a
 * function cannot see its own site go down.) It costs nothing: no call to
 * Claude, only counts. `.github/workflows/watch.yml` reads it every three
 * hours and renders it as the dashboard.
 *
 * Every number here is about the service. Nothing is about a person: no
 * code, id, city, report text or time finer than a day is read into the
 * reply, and the counts it reads were only ever totals (shared/ops.ts).
 *
 * `POST {event: 'crash' | 'chunk'}` is the one thing a phone says about the
 * app failing on it (src/lib/crash.ts): that it happened. Capped, and counted
 * as a day's total.
 */

export type State = 'ok' | 'warn' | 'fail'

/**
 * When a failing check should email the founder (watch.yml): `now` on the next
 * run, `daily` only in the 09:00 run, `weekly` only in Monday's. So an old
 * report does not send eight emails a day, and a broken key does not wait.
 */
export type Cadence = 'now' | 'daily' | 'weekly'

export interface Check {
  id: string
  question: string
  state: State
  cadence: Cadence
  summary: string
  numbers: Record<string, number | string | boolean | null>
}

/** The rates guide.ts's own arithmetic uses, per million tokens: an estimate, labelled as one. */
export const USD_PER_M_IN = 5
export const USD_PER_M_OUT = 25
const DEFAULT_COST_ALERT_USD = 20
const DEFAULT_CLIENT_CAP = 60
const MAX_BODY = 256

type Days = Record<string, Record<string, number>>

const sum = (counts: Record<string, number>, prefix: string, except: string[] = []) =>
  Object.entries(counts)
    .filter(([k]) => k.startsWith(prefix) && !except.includes(k))
    .reduce((n, [, v]) => n + v, 0)

const byPrefix = (counts: Record<string, number>, prefix: string) =>
  Object.fromEntries(
    Object.entries(counts)
      .filter(([k]) => k.startsWith(prefix))
      .map(([k, v]) => [k.slice(prefix.length), v]),
  )

const usd = (counts: Record<string, number>) =>
  ((counts['claude.in'] ?? 0) * USD_PER_M_IN + (counts['claude.out'] ?? 0) * USD_PER_M_OUT) / 1_000_000

const round2 = (n: number) => Math.round(n * 100) / 100

const daysSince = (d: string, today: string) => Math.round((Date.parse(today) - Date.parse(d)) / 86_400_000)

/** When the counts themselves cannot be read: every check that needs them says so. */
function unread(id: string, question: string): Check {
  return { id, question, state: 'fail', cadence: 'now', summary: 'The operations counts could not be read — storage is failing.', numbers: {} }
}

export function countChecks(days: Days, today: string, env: { costAlert: number }): Check[] {
  const list = Object.keys(days).sort().reverse()
  const t = days[today] ?? {}
  const y = days[list[1]] ?? {}

  // Functions failing?
  const failsToday = sum(t, 'fail.')
  const failsYesterday = sum(y, 'fail.')
  const functions: Check = {
    id: 'functions',
    question: 'Are functions failing?',
    state: failsToday >= 5 || (failsToday > 0 && failsYesterday > 0) ? 'fail' : failsToday > 0 ? 'warn' : 'ok',
    cadence: 'now',
    summary:
      failsToday === 0
        ? 'No server errors today.'
        : `${failsToday} server error${failsToday === 1 ? '' : 's'} today (${failsYesterday} yesterday). The Netlify function log has the lines, prefixed [niyyah] <route>.`,
    numbers: { today: failsToday, yesterday: failsYesterday, ...byPrefix(t, 'fail.') },
  }

  // Claude failing? Judged from what the guide itself counted: this route
  // never reads the model's key (tests/durable.test.ts keeps the live model
  // in two files), so a missing key shows as the guide's `not_configured`.
  const calls = sum(t, 'claude.', ['claude.in', 'claude.out'])
  const ok = t['claude.ok'] ?? 0
  const bad = calls - ok
  const auth = t['claude.auth'] ?? 0
  const claude: Check = {
    id: 'claude',
    question: 'Is Claude failing?',
    state: auth > 0 ? 'fail' : (t['claude.not_configured'] ?? 0) > 0 || (bad >= 3 && bad / Math.max(calls, 1) >= 0.1) ? 'warn' : 'ok',
    cadence: 'now',
    summary:
      auth > 0
        ? 'Anthropic is refusing the API key. Every member is on the offline voice until it is replaced.'
        : (t['claude.not_configured'] ?? 0) > 0
          ? 'No Anthropic key is set, so the guide is answering with its offline voice.'
          : calls === 0
            ? 'No guide calls today.'
            : `${ok} of ${calls} guide calls answered today.`,
    numbers: { calls, ...byPrefix(t, 'claude.') },
  }

  // Costs abnormal?
  const week = list.slice(1, 8).map((d) => usd(days[d] ?? {}))
  const average = week.length ? week.reduce((a, b) => a + b, 0) / week.length : 0
  const spend = usd(t)
  const cost: Check = {
    id: 'cost',
    question: 'Are costs abnormal?',
    state: spend >= env.costAlert ? 'fail' : spend > 2 && spend > 3 * average ? 'warn' : 'ok',
    cadence: 'now',
    summary: `About $${round2(spend).toFixed(2)} on the guide today, against $${round2(average).toFixed(2)} a day this past week (an estimate from tokens; the Anthropic console has the bill).`,
    numbers: { todayUsd: round2(spend), yesterdayUsd: round2(usd(y)), weekAverageUsd: round2(average), alertUsd: env.costAlert, tokensIn: t['claude.in'] ?? 0, tokensOut: t['claude.out'] ?? 0 },
  }

  // Rate limits being hit?
  const caps = byPrefix(t, 'cap.')
  const refused = Object.values(caps).reduce((a, b) => a + b, 0)
  const limits: Check = {
    id: 'limits',
    question: 'Are rate limits being hit?',
    state: (caps['guide-d'] ?? 0) > 0 ? 'fail' : refused > 0 ? 'warn' : 'ok',
    cadence: 'now',
    summary:
      refused === 0
        ? 'No cap has refused anything today.'
        : (caps['guide-d'] ?? 0) > 0
          ? 'The guide’s daily cap is reached: members get the offline voice until midnight UTC. A launch day, or someone looping it — docs/OPS.md says which to check.'
          : `Caps refused ${refused} call${refused === 1 ? '' : 's'} today: ${Object.entries(caps).map(([k, v]) => `${k} ${v}`).join(', ')}.`,
    numbers: { refused, ...caps },
  }

  // The app crashing on phones?
  const crashes = (t['client.crash'] ?? 0) + (t['client.chunk'] ?? 0)
  const client: Check = {
    id: 'client',
    question: 'Is the app breaking on phones?',
    state: crashes >= 3 ? 'warn' : 'ok',
    cadence: 'now',
    summary: crashes === 0 ? 'No phone has reported a crash today.' : `${crashes} crash${crashes === 1 ? '' : 'es'} reported by phones today.`,
    numbers: { crash: t['client.crash'] ?? 0, chunk: t['client.chunk'] ?? 0 },
  }

  return [functions, claude, cost, limits, client]
}

/** The open safety queue, as counts only: never a report, a code or a word of what was written. */
export async function safetyChecks(today: string): Promise<Check[]> {
  const store = getStore('reports')
  const { blobs } = await store.list()
  let open = 0
  let urgent = 0
  let oldest: string | null = null
  for (const { key } of blobs) {
    if (key.startsWith('resolved/')) continue
    const r = (await store.get(key, { type: 'json' })) as { reason?: string; at?: string } | null
    if (!r) continue
    open += 1
    if (r.reason && URGENT_REASONS.has(r.reason)) urgent += 1
    const d = typeof r.at === 'string' ? r.at.slice(0, 10) : null
    if (d && (!oldest || d < oldest)) oldest = d
  }
  const age = oldest ? daysSince(oldest, today) : 0
  return [
    {
      id: 'safety-urgent',
      question: 'Is a report waiting that cannot wait?',
      state: urgent > 0 ? 'fail' : 'ok',
      cadence: 'daily',
      summary: urgent > 0 ? `${urgent} open report${urgent === 1 ? '' : 's'} of threats or explicit messages. Read /safety today.` : 'No urgent report is open.',
      numbers: { urgent },
    },
    {
      id: 'safety',
      question: 'Are safety reports waiting?',
      state: open > 0 ? (age > 7 ? 'fail' : 'warn') : 'ok',
      // Monday's run fails on anything open — Trust promises a weekly read.
      cadence: 'weekly',
      summary: open === 0 ? 'No report is open.' : `${open} open report${open === 1 ? '' : 's'}; the oldest is ${age} day${age === 1 ? '' : 's'} old.`,
      numbers: { open, urgent, oldestDays: oldest ? age : null },
    },
  ]
}

export async function clockChecks(today: string): Promise<Check[]> {
  const [backup, swept] = await Promise.all([lastRun('export'), lastRun('sweep')])
  const since = backup ? daysSince(backup.day, today) : null
  const sweptSince = swept ? daysSince(swept.day, today) : null
  const sweepErrors = typeof swept?.errors === 'number' ? swept.errors : 0
  return [
    {
      id: 'backup',
      question: 'Did the backup fail?',
      state: since === null || since > 35 ? 'fail' : since > 31 ? 'warn' : 'ok',
      cadence: 'weekly',
      summary:
        since === null
          ? 'No backup has ever been taken from this site. docs/OPS.md has the one command.'
          : `The last backup was taken ${since} day${since === 1 ? '' : 's'} ago.`,
      numbers: { lastBackup: backup?.day ?? null, daysSince: since },
    },
    {
      id: 'sweep',
      question: 'Is the weekly sweep running?',
      state: sweptSince === null || sweptSince > 8 ? 'fail' : sweepErrors > 0 ? 'warn' : 'ok',
      cadence: 'weekly',
      summary:
        sweptSince === null
          ? 'The sweep has not run since this check existed. It runs on Sundays.'
          : `The sweep last ran ${sweptSince} day${sweptSince === 1 ? '' : 's'} ago, with ${sweepErrors} error${sweepErrors === 1 ? '' : 's'}.`,
      numbers: { lastSweep: swept?.day ?? null, daysSince: sweptSince, errors: sweepErrors },
    },
  ]
}

const WORST: State[] = ['ok', 'warn', 'fail']

export default async function handler(req: Request) {
  if (req.method === 'POST') {
    // A phone saying the app broke on it, and nothing else.
    const body = await readJson<{ event?: unknown }>(req, MAX_BODY)
    if (body instanceof Response) return body
    const event = typeof body.event === 'string' ? body.event : ''
    if (!CRASH_EVENTS.has(event)) return Response.json({ error: 'bad_event' }, { status: 400 })
    if (await overHourlyCap('health', DEFAULT_CLIENT_CAP)) return rateLimited()
    await note(`client.${event}`)
    return new Response(null, { status: 204 })
  }
  if (req.method !== 'GET') return Response.json({ error: 'GET or POST only' }, { status: 405 })
  if (!isFounder(req)) return notFounder()

  const today = day()
  const checks: Check[] = []

  // Storage, right now: a write, a read and a delete.
  try {
    const ms = await probe()
    checks.push({
      id: 'storage',
      question: 'Are storage calls failing?',
      state: ms > 2000 ? 'warn' : 'ok',
      cadence: 'now',
      summary: `Storage answered a write, a read and a delete in ${ms} ms.`,
      numbers: { ms },
    })
  } catch (err) {
    await failed('health', 'storage probe failed', err)
    checks.push({ id: 'storage', question: 'Are storage calls failing?', state: 'fail', cadence: 'now', summary: 'Storage did not answer a write, a read and a delete.', numbers: {} })
  }

  let days: Days = {}
  try {
    days = await readDays(8)
    checks.push(
      ...countChecks(days, today, {
        costAlert: Number(process.env.OPS_COST_ALERT_USD) || DEFAULT_COST_ALERT_USD,
      }),
    )
  } catch {
    for (const [id, q] of [
      ['functions', 'Are functions failing?'],
      ['claude', 'Is Claude failing?'],
      ['cost', 'Are costs abnormal?'],
      ['limits', 'Are rate limits being hit?'],
      ['client', 'Is the app breaking on phones?'],
    ]) checks.push(unread(id, q))
  }

  try {
    checks.push(...(await safetyChecks(today)))
  } catch {
    checks.push({ id: 'safety', question: 'Are safety reports waiting?', state: 'fail', cadence: 'now', summary: 'The safety queue could not be read.', numbers: {} })
  }

  try {
    checks.push(...(await clockChecks(today)))
  } catch {
    checks.push(unread('backup', 'Did the backup fail?'), unread('sweep', 'Is the weekly sweep running?'))
  }

  const status = checks.reduce<State>((w, c) => (WORST.indexOf(c.state) > WORST.indexOf(w) ? c.state : w), 'ok')
  // Seven days of totals, for a trend by eye. The eighth was only for yesterday's average.
  const week = Object.fromEntries(Object.entries(days).sort(([a], [b]) => (a < b ? 1 : -1)).slice(0, 7))
  return Response.json({ at: today, status, checks, days: week }, { headers: { 'Cache-Control': 'no-store' } })
}
