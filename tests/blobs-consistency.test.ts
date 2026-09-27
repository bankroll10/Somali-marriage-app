import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { getStore } from '@netlify/blobs'
import { BlobsServer } from '@netlify/blobs/server'

/**
 * What the installed @netlify/blobs actually does with `consistency: 'strong'`
 * — run against the package's own local server, not a hand-written double
 * (docs/BATCH-01-PLAN.md D7).
 *
 * The introduction route opens its store strong, and /health's
 * `introductions` check reads it the same way (netlify/functions/health.ts).
 * Both rest on two facts about the SDK that no in-memory test store can
 * prove: that a strong read is served when the context carries an uncached
 * URL, and that it is refused — thrown, named `BlobsConsistencyError`, on a
 * HEAD as much as a GET — when the context lacks one. This pins both, so the
 * health check's failure branch and the route's 503 are what the SDK does,
 * not what a comment says it does. Production's own context cannot be read
 * from a test; that is the limit, and the health check is what reads it.
 */

const TOKEN = 'blobs-test-token'
const SITE = 'blobs-test-site'
let server: BlobsServer
let url: string
let directory: string

beforeAll(async () => {
  directory = mkdtempSync(join(tmpdir(), 'niyyah-blobs-'))
  server = new BlobsServer({ directory, token: TOKEN })
  const { port } = await server.start()
  url = `http://localhost:${port}`
})
afterAll(async () => {
  await server.stop()
  rmSync(directory, { recursive: true, force: true })
})

const open = (consistency: 'strong' | 'eventual', withUncached: boolean) =>
  getStore({ name: 'introductions', consistency, edgeURL: url, ...(withUncached ? { uncachedEdgeURL: url } : {}), token: TOKEN, siteID: SITE })

describe('@netlify/blobs strong consistency, as installed', () => {
  it('serves a strong read, and a strong HEAD of a missing key is null, when the context has an uncached URL', async () => {
    const store = open('strong', true)
    const { modified } = await store.setJSON('HJKMNPQR', { at: '2026-09-27' }, { onlyIfNew: true })
    expect(modified).toBe(true)
    expect(await store.get('HJKMNPQR', { type: 'json' })).toEqual({ at: '2026-09-27' })
    expect(await store.getMetadata('health-probe')).toBeNull()
    expect((await store.setJSON('HJKMNPQR', { at: 'x' }, { onlyIfNew: true })).modified).toBe(false)
    await store.delete('HJKMNPQR')
    expect(await store.getMetadata('HJKMNPQR')).toBeNull()
  })

  it('refuses every strong read by name when the context has no uncached URL — a HEAD included', async () => {
    const store = open('strong', false)
    await expect(store.getMetadata('health-probe')).rejects.toMatchObject({ name: 'BlobsConsistencyError' })
    await expect(store.get('health-probe')).rejects.toMatchObject({ name: 'BlobsConsistencyError' })
  })

  it('an eventual read needs no uncached URL, which is why the mode has to be asked for explicitly', async () => {
    const store = open('eventual', false)
    expect(await store.getMetadata('health-probe')).toBeNull()
  })
})
