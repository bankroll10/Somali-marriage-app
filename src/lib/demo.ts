import { clearProgress, saveProgress } from './storage'
import { dayKey } from '../data/checkin'
import { snapshotOf } from './reflection'
import type { Answers, Identity } from '../types'

/**
 * Demo ergonomics for live presentations.
 *
 *   ?fresh — clears saved state → the app opens on Welcome (tab 1 of a demo:
 *            show onboarding and the 30-second aha).
 *   ?demo  — seeds a complete, coherent member ("Hodan") → the app opens on
 *            Home (tab 2: show the map, guide, trust, discovery, conversation).
 *
 * Reloading a ?demo URL re-seeds, so the demo tab always resets to a known
 * state. Both params overwrite whatever is in localStorage — by design.
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
  // How she'd live — the three the sample introduction reads on.
  household: 'near-family',
  work: 'both',
  'money-home': 'expected',
  'working-on': 'ask for help instead of carrying everything alone',
}

const demoIdentity: Identity = {
  firstName: 'Hodan',
  gender: 'woman',
  adult: true,
  age: 27,
  scene: 'twin-cities',
  bio: 'Nurse, big sister, early-morning walker. I want a home built on deen, honesty, and a lot of laughter.',
}

export function seedDemo() {
  saveProgress({
    answers: demoAnswers,
    identity: demoIdentity,
    // The seeded member uses the live guide — that is the experience to show.
    trust: { guideOnDevice: false, countMe: true },
    situated: true,
    followups: [],
    // History but no entry TODAY — the live check-in tap is a demo moment,
    // and the strip + continuity line have something to show.
    checkIns: [
      { date: dayKey(4), mood: 'heavy' },
      { date: dayKey(2), mood: 'hopeful' },
      { date: dayKey(1), mood: 'steady' },
    ],
    // Day 7 on the path — the journey milestone shows in demos.
    firstSeen: dayKey(6),
    // Two readings: who she was on day one, and who she is now. The map says
    // what changed in her own words — something recent still ached, and her
    // heart leaned anxious; now she is healing, and meets closeness steadily.
    mapHistory: [
      snapshotOf({ ...demoAnswers, healing: 'fresh', attachment: 'anxious', conflict: 'avoid' }, dayKey(6)),
      snapshotOf(demoAnswers, dayKey(0)),
    ],
    // She's preparing — the stage band then shows the arc ahead of her.
    stage: 'preparing',
    // Two things done, one still open — the work card demos in its live state,
    // and the map has a record to show.
    steps: [
      { dimension: 'vision', taken: dayKey(5), done: dayKey(5) },
      { dimension: 'family', taken: dayKey(3), done: dayKey(2) },
      { dimension: 'emotional', taken: dayKey(1) },
    ],
    // Most of the month's guide allowance spent, no trial started — the "6
    // replies left" line and the whole free-to-paid path are one tap away.
    plus: {
      trialStarted: null,
      trialTaken: false,
      usage: { month: dayKey(0).slice(0, 7), used: 14 },
    },
    // No saved place — the ask is part of the demo.
    waitlist: null,
    // No read yet — taking one live is the demo's strongest moment.
    read: null,
    beforeYes: null,
    couple: null,
    vouch: null,
    completed: true,
    coachThreads: {},
  })
}

export function clearForFresh() {
  // Clear app state only — the local analytics buffer survives ?fresh so
  // hallway-test funnels aren't wiped between runs.
  clearProgress()
}

/** Handle ?demo / ?fresh before initial state loads. Returns true if handled. */
export function applyDemoParams(): void {
  const params = new URLSearchParams(window.location.search)
  if (params.has('fresh')) clearForFresh()
  if (params.has('demo')) seedDemo()
}
