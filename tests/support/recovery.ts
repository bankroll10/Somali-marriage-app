/**
 * Reading the recovery keys out of a fake phone's storage (docs/DECISIONS.md Part 35).
 *
 * `niyyah.forget.recovery.v1.<kind>.<CODE>` = "1" is the only thing the new build
 * writes for an unfinished forget. `niyyah.forget.pending.v1` is the older builds'
 * record, which the new build only reads.
 */
export const LEGACY = 'niyyah.forget.pending.v1'
export const RECOVERY = 'niyyah.forget.recovery.v1'

export type Kind = 'maps' | 'installs' | 'pairs' | 'intros'
export const KINDS: Kind[] = ['maps', 'installs', 'pairs', 'intros']
export type ByKind = Record<Kind, string[]>

export const recoveryKey = (kind: Kind, code: string) => `${RECOVERY}.${kind}.${code}`

/** Every recovery key in a storage map, sorted. */
export const recoveryKeys = (storage: Map<string, string>): string[] => [...storage.keys()].filter((k) => k.startsWith(`${RECOVERY}.`)).sort()

/** The recovery keys, as codes by kind (each list sorted). */
export function recoveryOf(storage: Map<string, string>): ByKind {
  const out: ByKind = { maps: [], installs: [], pairs: [], intros: [] }
  for (const k of recoveryKeys(storage)) {
    const [kind, code] = [k.slice(RECOVERY.length + 1).split('.')[0] as Kind, k.slice(RECOVERY.length + 1).split('.').slice(1).join('.')]
    out[kind].push(code)
  }
  return out
}

/** The recovery keys and their values, exactly: what an older build must leave byte for byte. */
export const recoverySnapshot = (storage: Map<string, string>): Record<string, string> =>
  Object.fromEntries(recoveryKeys(storage).map((k) => [k, storage.get(k)!]))

/** Just one kind's codes. */
export const recoveryCodes = (storage: Map<string, string>, kind: Kind): string[] => recoveryOf(storage)[kind]
