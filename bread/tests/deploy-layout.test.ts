import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PRODUCTS } from '../shared/config.ts'
import { loadMigrations } from '../netlify/lib/db/migrate.ts'
import { freshDb } from './db.ts'

/**
 * Netlify bundles every file in netlify/functions as a function. Tests and
 * helpers live elsewhere for that reason; this keeps it so.
 *
 * Migrations deliberately do NOT live under netlify/database/migrations —
 * that path triggers Netlify's own auto-provisioned database, which this
 * account's plan doesn't have (a deploy with that directory present fails
 * with "database feature not available for this account"). They live in
 * db/migrations instead and are applied by hand with `npm run db:migrate`.
 */
describe('deploy layout', () => {
  it('netlify/functions holds only handlers', () => {
    const offenders = readdirSync(join(process.cwd(), 'netlify/functions')).filter((n) => /(\.test\.|\.spec\.|\.md$|^_)/.test(n))
    expect(offenders).toEqual([])
  })
  it('every endpoint the app calls exists', () => {
    for (const fn of ['availability', 'checkout', 'cancel', 'order', 'stripe-webhook', 'reconcile-stale', 'admin', 'admin-session', 'health']) {
      expect(existsSync(join(process.cwd(), `netlify/functions/${fn}.ts`)), fn).toBe(true)
    }
  })
  it('migrations do not live where Netlify would try to auto-provision a database from them', () => {
    expect(existsSync(join(process.cwd(), 'netlify/database'))).toBe(false)
  })
  it('migrations follow the directory convention our own runner expects', () => {
    const names = loadMigrations().map((m) => m.name)
    expect(names.length).toBeGreaterThan(0)
    for (const name of names) expect(name).toMatch(/^\d+_[a-z0-9-]+$/)
    expect(names).toEqual([...names].sort())
  })
  it('a build with no database skips migrating, but a production build refuses to ship', () => {
    const run = (env: Record<string, string>) =>
      spawnSync(process.execPath, ['--experimental-strip-types', 'scripts/migrate.ts'], {
        cwd: process.cwd(),
        encoding: 'utf8',
        env: { ...process.env, DATABASE_URL: undefined, CONTEXT: undefined, ...env } as NodeJS.ProcessEnv,
      })

    // A fresh site, a preview deploy or a local build: nothing to migrate against, still builds.
    const preview = run({ CONTEXT: 'deploy-preview' })
    expect(preview.status).toBe(0)
    expect(preview.stdout).toContain('skipping database migrations')

    // Production without a database migrates nothing and would answer 503 on every request.
    // That must fail the build rather than deploy green. (Netlify hides "secret" variables
    // from the build, which is exactly what this caught on the live site.)
    const production = run({ CONTEXT: 'production' })
    expect(production.status).toBe(1)
    expect(production.stderr).toContain('DATABASE_URL is not set in this production build')
  })
  it('the products the site displays are the products the database sells', async () => {
    const { db } = await freshDb()
    const rows = (await db.query<{ id: string; name: string; blurb: string; price_cents: number; daily_capacity: number }>('SELECT id, name, blurb, price_cents, daily_capacity FROM products WHERE active ORDER BY sort_order')).rows
    expect(rows).toEqual(PRODUCTS.map((p) => ({ id: p.id, name: p.name, blurb: p.blurb, price_cents: p.priceCents, daily_capacity: p.capacityPerDay })))
  })
})
