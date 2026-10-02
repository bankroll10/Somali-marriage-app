import { vi } from 'vitest'
import { resetForgetMirror } from '../../src/lib/forget'
import { resetIntroMirror } from '../../src/lib/introduce'
import { reloaded } from '../../src/lib/storage'

/**
 * A phone (docs/TESTING.md).
 *
 * Everything a member keeps on her side lives in `localStorage`. Two phones
 * are two storages: `onPhone(p)` makes `p`'s the one the app code sees, so a
 * test can keep a map on one phone and restore it on another, or hand a link
 * to a stranger's.
 */
export class Phone {
  readonly storage = new Map<string, string>()
  readonly name: string
  /** Keys this phone's storage refuses to write — private browsing, or a full disk, for the keys that match. */
  refusing: RegExp | null = null
  constructor(name: string) {
    this.name = name
  }

  /** Make every write to a matching key throw, as a browser that is not saving does. */
  refuse(keys: RegExp | null): void {
    this.refusing = keys
  }

  /** What this phone holds, as keys. */
  keys(): string[] {
    return [...this.storage.keys()].sort()
  }
}

function storageOf(phone: Phone): Storage {
  const m = phone.storage
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (phone.refusing?.test(k)) throw new DOMException('QuotaExceededError', 'QuotaExceededError')
      m.set(k, String(v))
    },
    removeItem: (k: string) => void m.delete(k),
    clear: () => m.clear(),
    key: (i: number) => [...m.keys()][i] ?? null,
    get length() {
      return m.size
    },
  }
}

/** Make `phone` the one the app code reads and writes. */
export function onPhone(phone: Phone): Phone {
  vi.stubGlobal('localStorage', storageOf(phone))
  return phone
}

/**
 * What a reload resets that a phone keeps: the page's own memory. A test
 * reloads by unmounting and mounting again in the same page, so anything a
 * real reload would clear is cleared here.
 */
export function reload(): void {
  reloaded()
  resetIntroMirror()
  resetForgetMirror()
}

/**
 * The phone's share sheet, recording what was handed to it. A link a member
 * sends is the only way the other phone learns anything, so a journey that
 * crosses phones carries exactly what was shared — never a code read out of
 * storage.
 */
export function shareSheet(): { sent: { text?: string; url?: string }[] } {
  const sent: { text?: string; url?: string }[] = []
  Object.defineProperty(navigator, 'share', {
    configurable: true,
    value: async (data: { text?: string; url?: string }) => void sent.push(data),
  })
  return { sent }
}
