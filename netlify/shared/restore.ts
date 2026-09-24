import type { getStore } from '@netlify/blobs'
import { CODE } from './code'

/**
 * Putting a backup back (docs/OPS.md).
 *
 * `/export` has returned the learning record since 2026-09-10, and until
 * 2026-09-24 nothing could load it back: docs/PRIVACY.md said so in as many
 * words. A backup nobody has restored is a hope, not a backup. This is the
 * other half, and tests/recovery.test.ts restores one on every PR.
 *
 * What it puts back is exactly what the backup holds, and the rules are the
 * cautious ones, because it runs against the live store on the worst day:
 *
 *  - **Progress records and the joint tally.** A version-2 backup also holds
 *    the door's counts, from before the door was removed; they are ignored.
 *  - **Never over something newer.** Every write is `onlyIfNew` unless
 *    `overwrite` is asked for by name. A record that is already there — a
 *    member who came back since the loss, the store only partly lost — stays.
 *  - **A dry run unless told otherwise.** Without `write` it says what it
 *    would do and writes nothing.
 *  - **Only what the backup format allows.** A key that is not an install
 *    code, or a record without its rungs, is refused, not written.
 */

type Store = ReturnType<typeof getStore>
export type Open = (name: string) => Store

export interface RestoreReport {
  /** True only when something was actually written. */
  wrote: boolean
  progress: { restored: number; alreadyThere: number; refused: number }
  joint: 'restored' | 'already-there' | 'none-in-backup'
}

export class NotABackup extends Error {}

interface BackupShape {
  version: number
  progress: Record<string, unknown>
  joint: unknown
}

function shape(backup: unknown): BackupShape {
  const b = backup as Partial<BackupShape> | null
  if (!b || typeof b !== 'object') throw new NotABackup('not a backup file')
  if (b.version !== 2 && b.version !== 3) throw new NotABackup(`backup version ${String(b.version)} — this restores versions 2 and 3`)
  if (!b.progress || typeof b.progress !== 'object') throw new NotABackup('no progress records')
  return { version: b.version, progress: b.progress, joint: b.joint ?? null }
}

const isRecord = (r: unknown): r is { first: Record<string, string> } =>
  !!r && typeof r === 'object' && !!(r as { first?: unknown }).first && typeof (r as { first?: unknown }).first === 'object'

export async function restore(backup: unknown, open: Open, opts: { write?: boolean; overwrite?: boolean } = {}): Promise<RestoreReport> {
  const b = shape(backup)
  const write = !!opts.write
  const report: RestoreReport = {
    wrote: false,
    progress: { restored: 0, alreadyThere: 0, refused: 0 },
    joint: 'none-in-backup',
  }

  const progress = open('progress')
  for (const [key, record] of Object.entries(b.progress)) {
    if (!CODE.test(key) || !isRecord(record)) {
      report.progress.refused += 1
      continue
    }
    const there = opts.overwrite ? false : !!(await progress.getMetadata(key))
    if (there) {
      report.progress.alreadyThere += 1
      continue
    }
    if (write) {
      const done = opts.overwrite ? await progress.setJSON(key, record) : await progress.setJSON(key, record, { onlyIfNew: true })
      // Lost a race with a member writing her own record: hers is newer.
      if (!done.modified) {
        report.progress.alreadyThere += 1
        continue
      }
      report.wrote = true
    }
    report.progress.restored += 1
  }

  if (b.joint && typeof b.joint === 'object') {
    const tallies = open('tallies')
    const there = !opts.overwrite && !!(await tallies.getMetadata('joint'))
    if (there) report.joint = 'already-there'
    else {
      if (write) {
        const done = opts.overwrite ? await tallies.setJSON('joint', b.joint) : await tallies.setJSON('joint', b.joint, { onlyIfNew: true })
        report.joint = done.modified ? 'restored' : 'already-there'
        if (done.modified) report.wrote = true
      } else report.joint = 'restored'
    }
  }

  return report
}
