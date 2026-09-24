import { clearProgress, loadProgress, saveProgress } from './storage'
import { rememberedCode } from './keep'
import { dayKey } from '../lib/dates'
import { snapshotOf } from './reflection'
import type { Answers, Identity } from '../types'

/**
 * Demo ergonomics for live presentations.
 *
 *   ?fresh — clears saved state → the app opens on Welcome (tab 1 of a demo:
 *            show onboarding and the 30-second aha).
 *   ?demo  — seeds a complete, coherent member ("Hodan") → the app opens on
 *            Home (tab 2: show the map, the guide, the read).
 *
 * Reloading a ?demo URL re-seeds, so the demo tab always resets to a known
 * state. Both params overwrite whatever is in localStorage — by design.
 *
 * Neither combines with a link (`?read`, `?couple=`…): main.tsx strips the
 * query before this runs whenever a link is present. No minted link carries
 * them — but anyone can type one, which is why the live site ignores them on a
 * phone that holds anything (applyDemoParams, below).
 */

const demoAnswers: Answers = {
  'hardest-part': 'serious',
  timeline: '1-2',
  'why-now': 'ready',
  practice: 'consistent',
  // Strong but human — a perfect score reads fake on camera and in demos.
  'faith-role': 4,
  'family-role': 'guided',
  children: 'want',
  'value-most': ['kindness', 'deen-char', 'emotional'],
  dealbreakers: ['honesty', 'faith-nn', 'respect'],
  conflict: 'space',
  // 'healing' (not 'healed') — the honest mirror then says something real on
  // camera, which demos the app's honesty better than pure flattery.
  healing: 'healing',
  attachment: 'secure',
  pattern: 'walls',
  // How she'd live — the eleven shows her side of these.
  household: 'near-family',
  work: 'both',
  'money-home': 'expected',
  'working-on': 'ask for help instead of carrying everything alone',
}

const demoIdentity: Identity = {
  firstName: 'Hodan',
  gender: 'woman',
  adult: true,
  scene: 'twin-cities',
}

export function seedDemo() {
  saveProgress({
    answers: demoAnswers,
    identity: demoIdentity,
    // The seeded member uses the live guide — that is the experience to show.
    trust: { guideOnDevice: false, countMe: true },
    situated: true,
    followups: [],
    // Two readings: who she was on day one, and who she is now. The map says
    // what changed in her own words — something recent still ached, and her
    // heart leaned anxious; now she is healing, and meets closeness steadily.
    mapHistory: [
      snapshotOf({ ...demoAnswers, healing: 'fresh', attachment: 'anxious', conflict: 'avoid' }, dayKey(6)),
      snapshotOf(demoAnswers, dayKey(0)),
    ],
    // She's preparing — the stage band then shows the arc ahead of her.
    stage: 'preparing',
    // Some of the guide's budget spent. Three rungs reached (arrived, situated,
    // mapped) grant forty-five replies; she has used fourteen.
    guide: { replies: 14 },
    // No read yet — taking one live is the demo's strongest moment.
    read: null,
    beforeYes: null,
    couple: null,
    ending: null,
    endings: [],
    began: [],
    completed: true,
    coachThreads: {},
  })
}

export function clearForFresh() {
  // Clear app state only — the local analytics buffer survives ?fresh so
  // hallway-test funnels aren't wiped between runs.
  clearProgress()
}

/**
 * Handle ?demo / ?fresh before initial state loads.
 *
 * On the founder's own machine they run exactly as the header says. Anywhere
 * else they are a link a stranger can send, and they used to wipe whatever
 * phone opened them — leaving the kept code behind, so the next save wrote the
 * emptied map over the kept one (docs/ABUSE.md, sabotage). So on the live site
 * they act only on a phone with nothing to lose, and leave the address bar
 * either way, so a reload cannot repeat them.
 */
export function applyDemoParams(): void {
  const params = new URLSearchParams(window.location.search)
  const fresh = params.has('fresh')
  const demo = params.has('demo')
  if (!fresh && !demo) return
  const { hostname, pathname, hash } = window.location
  const presenting = hostname === 'localhost' || hostname === '127.0.0.1'
  if (!presenting) {
    params.delete('fresh')
    params.delete('demo')
    const rest = params.toString()
    window.history.replaceState({}, '', `${pathname}${rest ? `?${rest}` : ''}${hash}`)
    if (loadProgress() || rememberedCode()) return
  }
  if (fresh) clearForFresh()
  if (demo) seedDemo()
}
