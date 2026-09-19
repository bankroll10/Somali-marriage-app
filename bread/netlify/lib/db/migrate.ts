import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Db } from './client.ts'

/**
 * Applies db/migrations/<n>_<slug>/migration.sql in order, recording each in
 * schema_migrations. Nothing applies these automatically — Netlify's own
 * auto-provisioned database (which would have applied a
 * netlify/database/migrations directory on every deploy) isn't available on
 * this account's plan, so the database is a regular externally-hosted
 * Postgres and `npm run db:migrate` is run by hand, once per new migration.
 * This runner is also what the tests apply to PGlite. Production functions
 * never import it.
 */

export const MIGRATIONS_DIR = fileURLToPath(new URL('../../../db/migrations/', import.meta.url))

export interface Migration {
  name: string
  sql: string
}

export function loadMigrations(dir = MIGRATIONS_DIR): Migration[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^\d+_[a-z0-9-]+$/.test(d.name))
    .map((d) => d.name)
    .sort()
    .map((name) => ({ name, sql: readFileSync(join(dir, name, 'migration.sql'), 'utf8') }))
}

export async function applyMigrations(db: Db, migrations = loadMigrations()): Promise<string[]> {
  await db.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())')
  const applied = new Set((await db.query<{ name: string }>('SELECT name FROM schema_migrations')).rows.map((r) => r.name))
  const ran: string[] = []
  for (const m of migrations) {
    if (applied.has(m.name)) continue
    await db.transaction(async (tx) => {
      await tx.query(m.sql)
      await tx.query('INSERT INTO schema_migrations (name) VALUES ($1)', [m.name])
    })
    ran.push(m.name)
  }
  return ran
}
