/**
 * The version every stored record carries.
 *
 * Five record shapes were already told apart by heuristics — a key's segment
 * count, whether a field is present, the length of a date — and the backup
 * stamped `version: 2` on its wrapper while the records inside it carried
 * nothing, which docs/SECURITY.md called exactly backwards. It deferred the fix to
 * "the next shape change", because retrofitting a version onto records that
 * exist is a migration in itself.
 *
 * It is being done now for one reason: **there are no records.** Zero members,
 * three test rows, all the founder's own. The migration that made this
 * expensive costs nothing today and will never cost nothing again — the first
 * real member makes it a migration. So every member record written from here
 * on carries `v`, and the day a shape changes, the reader branches on a number
 * instead of a guess, and docs/OPS.md's move to a real database is a
 * transcription rather than an archaeology (docs/PRODUCT.md).
 *
 * What is stamped: a record about a member — her kept map, her ladder record,
 * a report and its resolved stub, a pair's sheets. What is not: a counter
 * (`limits`, a bare number) and a tally (`tallies/joint`, which has no
 * members in it).
 *
 * The stamp is applied as the last thing before a write — after any spread of
 * an older record — so a record rewritten at a later version carries that
 * version and not the one it was born with. It sits at the top level only:
 * `facts` inside a ladder record is rebuilt field by field and would drop it.
 *
 * The client versions differently, and on purpose: localStorage is keyed
 * `niyyah.intake.v1` and migrates by defaulting each field on read
 * (src/lib/storage.ts). That store has one owner and one reader; these stores
 * have a founder, a backup and a database in their future.
 */

export const RECORD_VERSION = 1

export interface Versioned {
  /** The shape this record was written in. See RECORD_VERSION. */
  v: number
}

/** The record, as it will be written — versioned, always last. */
export function stamp<T extends object>(record: T): T & Versioned {
  return { ...record, v: RECORD_VERSION }
}
