import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
import { poolConfig } from '../netlify/lib/db/client.ts'

/**
 * These assert what `pg` actually resolves, not what we hand it. The two
 * differ: ConnectionParameters does `Object.assign({}, config, parse(
 * config.connectionString))`, so an `ssl` option passed next to a
 * connection string carrying `sslmode` is discarded. The app used to pass
 * `{ rejectUnauthorized: false }` that way and it never took effect — which
 * was lucky rather than correct, and is exactly the kind of thing that
 * should fail a test instead of being discovered in a log.
 */
// Reached through require because @types/pg does not export this internal path.
const ConnectionParameters = createRequire(import.meta.url)('pg/lib/connection-parameters.js') as new (c: unknown) => { ssl: unknown }
const resolved = (url: string) => new ConnectionParameters(poolConfig(url)).ssl

const NEON = 'postgresql://u:p@ep-green-pond.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require'

describe('database SSL', () => {
  it('verifies the certificate of a managed Postgres', () => {
    // `{}` is TLS with Node's defaults, and Node verifies by default. The one
    // shape that would silently accept an impostor is rejectUnauthorized:false.
    expect(resolved(NEON)).toEqual({})
    expect(resolved(NEON)).not.toMatchObject({ rejectUnauthorized: false })
  })

  it('states verify-full outright rather than relying on what require means today', () => {
    // pg 9 / pg-connection-string 3 redefine `require` as "encrypt, don't
    // check who answered". This must not quietly follow it down.
    expect(new URL(poolConfig(NEON).connectionString!).searchParams.get('sslmode')).toBe('verify-full')
  })

  it('keeps every other part of the connection string', () => {
    const out = new URL(poolConfig(NEON).connectionString!)
    expect(out.host).toBe('ep-green-pond.c-7.us-east-2.aws.neon.tech')
    expect(out.pathname).toBe('/neondb')
    expect(out.username).toBe('u')
    expect(out.searchParams.get('channel_binding')).toBe('require')
  })

  it('leaves TLS off for a local Postgres, which does not speak it', () => {
    for (const url of ['postgresql://u:p@localhost:5432/db', 'postgres://127.0.0.1/db']) {
      expect(resolved(url), url).toBe(false)
    }
  })
})
