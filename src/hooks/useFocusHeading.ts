import { useEffect, type RefObject } from 'react'

/**
 * Moves focus to the first heading inside `within`, once, when this mounts.
 *
 * A sighted user sees a whole new screen at once; a keyboard or screen-reader
 * user is told nothing changed unless focus moves — it otherwise stays
 * wherever it was, on a now-unmounted element, defaulting to `<body>`
 * (docs/DESIGN.md). `tabIndex=-1` makes an otherwise inert heading a valid,
 * one-time focus target without adding it to the tab order, and is removed
 * again once focus leaves it.
 *
 * WHEN it runs is the point. Render it *inside* the `<Suspense>` boundary that
 * holds the screen, as a sibling of the screen: a boundary that suspends on its
 * first mount commits none of its children until the content is ready, so this
 * mounts — and its effect runs — exactly when the screen appears. The earlier
 * form was a hook in `App`, outside the boundary, keyed on the screen name; on
 * a cold load it ran while the lazy chunk was still in flight, found only the
 * blank fallback, and never ran again, so a keyboard user landed on `<body>`
 * (docs/DECISIONS.md Part 25). There is no timer and nothing to cancel:
 * `App` keys the wrapper by screen, so navigating away before a chunk lands
 * unmounts this unrun, and a late chunk can never focus an old screen.
 *
 * It runs once per screen, never again, so it cannot pull focus back after the
 * person starts to move through the screen — and if focus is already on
 * something inside the screen when it mounts, it leaves it there.
 */
export interface FocusHeadingOptions {
  /**
   * Only when focus has been lost — it is on `<body>` because the control that
   * had it was just removed. Used for a step inside a screen (the next
   * question, the result): the tap that answered the last one unmounted the
   * button that held focus, so focus has to be put somewhere, but a control
   * that survives the change (the header's Back) is where the person is, and
   * is left alone.
   */
  onlyIfLost?: boolean
}

export function useFocusHeading(within: RefObject<HTMLElement | null>, options: FocusHeadingOptions = {}) {
  const { onlyIfLost = false } = options
  useEffect(() => {
    const root = within.current
    if (!root) return
    const now = document.activeElement
    if (onlyIfLost) {
      if (now && now !== document.body) return
    } else if (now && now !== document.body && now !== root && root.contains(now)) return
    const heading = root.querySelector<HTMLElement>('h1, h2')
    if (!heading) return
    const hadTabIndex = heading.hasAttribute('tabindex')
    if (!hadTabIndex) heading.setAttribute('tabindex', '-1')
    heading.focus({ preventScroll: true })
    if (!hadTabIndex) {
      const clear = () => heading.removeAttribute('tabindex')
      heading.addEventListener('blur', clear, { once: true })
    }
  }, [within, onlyIfLost])
}

/** The hook as a component, for placing inside a Suspense boundary beside the screen it serves. */
export function FocusHeading({ within, ...options }: { within: RefObject<HTMLElement | null> } & FocusHeadingOptions) {
  useFocusHeading(within, options)
  return null
}
