/**
 * Minimal event tracking for the first-100 phase.
 *
 * Events land in a local ring buffer (inspect with `niyyahEvents()` in the
 * console) and in dev console output — enough to pair hallway-test interviews
 * with what testers actually did. At launch, swap the body of `track` for a
 * real provider (PostHog/Amplitude); call sites stay.
 *
 * Key funnel: onboarding_started → hook_answered → map_completed →
 * guide_asked (activation) → read_completed / before_yes_completed /
 * guide_committed (progression) → words_sent / door_sent / invite_copied /
 * reflection_shared (the words travelling). Nothing here counts sends per
 * person; the ladder store counts arrivals by source, and that is the metric.
 */
const KEY = 'niyyah.events.v1'
const MAX_EVENTS = 300

export function track(event: string, props?: Record<string, unknown>) {
  try {
    const buf = JSON.parse(localStorage.getItem(KEY) ?? '[]') as unknown[]
    buf.push({ event, ...(props ? { props } : {}), t: Date.now() })
    localStorage.setItem(KEY, JSON.stringify(buf.slice(-MAX_EVENTS)))
  } catch {
    // never let telemetry break the product
  }
  if (import.meta.env.DEV) console.debug('[niyyah]', event, props ?? '')
}

declare global {
  interface Window {
    niyyahEvents?: () => unknown[]
  }
}

if (typeof window !== 'undefined') {
  window.niyyahEvents = () => {
    try {
      return JSON.parse(localStorage.getItem(KEY) ?? '[]')
    } catch {
      return []
    }
  }
}
