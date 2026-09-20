import { useEffect, type RefObject } from 'react'

/**
 * Moves focus to the first heading inside `ref` whenever `dep` changes.
 *
 * A sighted user sees a whole new screen — or a whole new phase of one — at
 * once; a keyboard or screen-reader user is told nothing changed unless focus
 * moves. It otherwise stays wherever it was, on a now-unmounted element,
 * defaulting to `<body>` (docs/ACCESS.md). `tabIndex=-1` makes an otherwise
 * inert heading a valid, one-time focus target without adding it to the tab
 * order, and is removed again once focus leaves it.
 *
 * Used at the app's own screen-swap (`App.tsx`, keyed on `n.screen`) and
 * locally wherever a component swaps its own full "screen" — a set of
 * mutually exclusive phases with their own `<h1>` each — without going
 * through that top-level swap (`Vouch.tsx`, keyed on `phase`).
 */
export function useFocusHeading(ref: RefObject<HTMLElement | null>, dep: unknown) {
  useEffect(() => {
    const heading = ref.current?.querySelector<HTMLElement>('h1, h2')
    if (!heading) return
    const hadTabIndex = heading.hasAttribute('tabindex')
    if (!hadTabIndex) heading.setAttribute('tabindex', '-1')
    heading.focus({ preventScroll: true })
    if (!hadTabIndex) {
      const clear = () => heading.removeAttribute('tabindex')
      heading.addEventListener('blur', clear, { once: true })
    }
  }, [dep, ref])
}
