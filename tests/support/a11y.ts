/**
 * An accessibility audit of what React actually rendered (docs/TESTING.md).
 *
 * The suite used to check accessibility by searching the .tsx source for
 * `aria-label` and `role="group"`: a test that passes when the attribute is
 * written on an element that never renders, and fails when a correct
 * component is refactored. This reads the DOM instead. It is not axe — axe
 * needs layout, which a DOM without a browser does not have — but it checks
 * the things that decide whether a screen-reader user can use a screen at all,
 * and it checks them on every screen it is handed.
 */

const INTERACTIVE = 'button, a[href], [role="button"], [role="link"], [role="checkbox"], [role="radio"], [role="switch"], [role="tab"]'
const FIELDS = 'input:not([type="hidden"]), select, textarea'
const CHECKABLE = new Set(['radio', 'checkbox', 'switch', 'menuitemcheckbox', 'menuitemradio'])

function textOf(el: Element): string {
  return (el.textContent ?? '').replace(/\s+/g, ' ').trim()
}

/** The accessible name, by the rules that matter here: aria-labelledby, aria-label, a label, the text inside, a title. */
export function accessibleName(el: Element): string {
  const doc = el.ownerDocument
  const by = el.getAttribute('aria-labelledby')
  if (by) {
    const name = by
      .split(/\s+/)
      .map((id) => doc.getElementById(id))
      .filter((x): x is HTMLElement => !!x)
      .map(textOf)
      .join(' ')
      .trim()
    if (name) return name
  }
  const label = el.getAttribute('aria-label')?.trim()
  if (label) return label
  const id = el.getAttribute('id')
  if (id) {
    const forLabel = doc.querySelector(`label[for="${CSS.escape(id)}"]`)
    if (forLabel && textOf(forLabel)) return textOf(forLabel)
  }
  const wrapping = el.closest('label')
  if (wrapping && textOf(wrapping)) return textOf(wrapping)
  if (el.matches(INTERACTIVE) && textOf(el)) return textOf(el)
  const img = el.querySelector('img[alt]')
  if (img?.getAttribute('alt')?.trim()) return img.getAttribute('alt')!.trim()
  return el.getAttribute('title')?.trim() ?? ''
}

function describe(el: Element): string {
  const tag = el.tagName.toLowerCase()
  const cls = (el.getAttribute('class') ?? '').split(/\s+/).slice(0, 3).join('.')
  return `<${tag}${el.id ? `#${el.id}` : ''}${cls ? `.${cls}` : ''}> "${textOf(el).slice(0, 40)}"`
}

/** Every problem on the page as rendered, in words. Empty means it passed. */
export function audit(root: ParentNode = document): string[] {
  const doc = (root as Node).ownerDocument ?? (root as Document)
  const problems: string[] = []
  for (const el of root.querySelectorAll(INTERACTIVE)) {
    if (!accessibleName(el)) problems.push(`no accessible name: ${describe(el)}`)
  }
  for (const el of root.querySelectorAll(FIELDS)) {
    if (!accessibleName(el)) problems.push(`field with no label: ${describe(el)}`)
  }
  for (const el of root.querySelectorAll('[aria-labelledby], [aria-describedby], [aria-controls]')) {
    for (const attr of ['aria-labelledby', 'aria-describedby', 'aria-controls']) {
      for (const id of (el.getAttribute(attr) ?? '').split(/\s+/).filter(Boolean)) {
        if (!doc.getElementById(id)) problems.push(`${attr} names #${id}, which is not on the page: ${describe(el)}`)
      }
    }
  }
  const seen = new Map<string, number>()
  for (const el of root.querySelectorAll('[id]')) seen.set(el.id, (seen.get(el.id) ?? 0) + 1)
  for (const [id, n] of seen) if (n > 1) problems.push(`id #${id} is used ${n} times`)
  for (const el of root.querySelectorAll('[aria-checked]')) {
    if (!CHECKABLE.has(el.getAttribute('role') ?? '')) problems.push(`aria-checked without a checkable role: ${describe(el)}`)
  }
  for (const el of root.querySelectorAll('[role="group"], [role="radiogroup"]')) {
    if (!accessibleName(el)) problems.push(`a group with no name: ${describe(el)}`)
  }
  const mains = root.querySelectorAll('main, [role="main"]').length
  if (mains !== 1) problems.push(`${mains} main landmarks — a screen has exactly one`)
  if (!root.querySelector('h1, h2')) problems.push('no heading — a screen reader has nothing to land on')
  return problems
}
