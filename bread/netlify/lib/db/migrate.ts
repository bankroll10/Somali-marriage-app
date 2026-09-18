import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Db } from './client.ts'

/**
 * Applies netlify/database/migrations/<n>_<slug>/migration.sql in order,
 * recording each in schema_migrations. Netlify does this itself on deploy;
 * this runner exists for the tests (PGlite) and for `npm run db:migrate`
 * against a Postgres that is not Netlify DB. Production functions never
 * import it.
 */

export const MIGRATIONS_DIR = fileURLToPath(new URL('../../database/migrations/', import.meta.url))

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
