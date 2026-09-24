import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { accessibleName } from './a11y'

/**
 * The real components, mounted in a DOM with no browser (happy-dom), and
 * driven the way a person drives them: by what a button says (docs/TESTING.md).
 * Files that use this start with `// @vitest-environment happy-dom`.
 */

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

export interface Mounted {
  root: Root
  container: HTMLElement
  /** Everything on screen, as text. */
  text(): string
  /** Wait until the screen stops changing — lazy screens, effects, fetches. */
  settle(): Promise<void>
  /** Wait until `check` holds — for what lands after the screen does, like a debounced save. */
  until(check: () => unknown, what?: string): Promise<void>
  /** Press the control whose accessible name matches. Fails, naming what is there, if none does. */
  press(name: string | RegExp): Promise<void>
  /** Whether a control with that name is on screen. */
  has(name: string | RegExp): boolean
  /** Type into the field whose label matches. */
  type(label: string | RegExp, value: string): Promise<void>
  unmount(): void
}

const matches = (name: string, want: string | RegExp) => (typeof want === 'string' ? name.includes(want) : want.test(name))

export async function mount(node: ReactNode): Promise<Mounted> {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  await act(async () => {
    root.render(node)
  })
  const controls = () => [...container.querySelectorAll('button, a[href], [role="button"], [role="radio"], [role="checkbox"], [role="switch"]')]
  const m: Mounted = {
    root,
    container,
    text: () => (container.textContent ?? '').replace(/\s+/g, ' '),
    async settle() {
      // Until the screen has words on it and has not changed for five ticks:
      // a lazy screen arrives a moment after the first render, and Suspense's
      // wordless fallback that is not changing yet is not settled.
      let last = ''
      let still = 0
      for (let i = 0; i < 200; i++) {
        await act(async () => {
          await new Promise((r) => setTimeout(r, 10))
        })
        const now = container.innerHTML
        still = now === last && m.text().trim() !== '' ? still + 1 : 0
        if (still >= 5) return
        last = now
      }
    },
    async until(check, what = String(check)) {
      for (let i = 0; i < 200; i++) {
        try {
          if (check()) return
        } catch {
          /* not yet */
        }
        await act(async () => {
          await new Promise((r) => setTimeout(r, 10))
        })
      }
      throw new Error(`never happened: ${what}`)
    },
    async press(name) {
      const el = controls().find((c) => matches(accessibleName(c), name)) as HTMLElement | undefined
      if (!el) {
        throw new Error(`nothing to press named ${String(name)}. On screen: ${controls().map((c) => JSON.stringify(accessibleName(c))).join(', ')}`)
      }
      await act(async () => {
        el.click()
      })
      await m.settle()
    },
    has(name) {
      return controls().some((c) => matches(accessibleName(c), name))
    },
    async type(label, value) {
      const el = [...container.querySelectorAll('input, textarea')].find((f) => matches(accessibleName(f), label)) as
        | HTMLInputElement
        | HTMLTextAreaElement
        | undefined
      if (!el) throw new Error(`no field labelled ${String(label)}`)
      const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
      await act(async () => {
        Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(el, value)
        el.dispatchEvent(new Event('input', { bubbles: true }))
      })
      await m.settle()
    },
    unmount() {
      act(() => root.unmount())
      container.remove()
    },
  }
  await m.settle()
  return m
}
