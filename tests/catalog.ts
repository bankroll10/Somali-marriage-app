/**
 * What every test file is for (docs/TESTING.md).
 *
 * A suite of a thousand tests is only worth what it protects. This is the
 * map: each file, what kind of test it is, whether it tests what the product
 * *does* or what its source *says*, and which of the product's invariants it
 * holds. tests/catalog.test.ts keeps the map true — a test file nobody
 * catalogued, an invariant with no suite, or a new file of source regexes
 * each fail the build.
 */

export type Category =
  /** One function, pure or with its I/O doubled. */
  | 'unit'
  /** A real handler over the in-memory store, or the real client over the real handler. */
  | 'integration'
  /** Two things that must agree — client and server, code and doc, copy and code — held together. */
  | 'contract'
  /** Who can read, write or erase what. */
  | 'security'
  /** A rule over generated inputs (fast-check), or over every input there is. */
  | 'property'
  /** The rendered app, driven by what a person taps, over the real client and handlers. */
  | 'e2e'
  /** What a screen reader, a keyboard or a small screen gets. */
  | 'accessibility'
  /** Pixels. Deliberately absent — see VISUAL_ABSENT. */
  | 'visual'
  /** A step made to fail, a race made to happen, a network taken away. */
  | 'failure'

export const CATEGORIES: readonly Category[] = ['unit', 'integration', 'contract', 'security', 'property', 'e2e', 'accessibility', 'visual', 'failure']

export const VISUAL_ABSENT =
  'Pixel snapshots need a pinned browser and font stack in CI, which this repository does not have; without one they fail on anti-aliasing, not on regressions. The static style guards in tests/mobile.test.ts and the contrast arithmetic in tests/a11y.test.ts stand in, and a Chromium walk before release covers the rest (docs/TESTING.md).'

/**
 * What the assertions look at.
 *  - behaviour: what the code returns, renders, stores or sends.
 *  - source: the text of the source — a regex over a .ts/.tsx/.css file. Kept
 *    only where no behaviour can reach (a CSS class, a build setting, a file
 *    that must not exist), and counted, so the number can only go down.
 *  - mixed: both.
 */
export type Kind = 'behaviour' | 'source' | 'mixed'

/** The product's invariants — the few things that, broken, break trust (docs/TESTING.md, "The register"). */
export type Invariant =
  | 'one-code-one-person'
  | 'non-negotiables-never-ignored'
  | 'private-sheets'
  | 'delete-means-deleted'
  | 'founder-routes-fail-closed'
  | 'links-open-the-right-thing'
  | 'both-sides-semantically-correct'

export const INVARIANTS: Record<Invariant, string> = {
  'one-code-one-person': 'A person’s map is restored by her code and nothing else, and never to anyone holding a different one.',
  'non-negotiables-never-ignored': 'A non-negotiable she chose is either a gate that is checked or the first thing she is told to ask — never dropped.',
  'private-sheets': 'Neither side of the eleven ever sees, or can fetch, the other’s answers — only the joint.',
  'delete-means-deleted': 'After Forget me, nothing of hers is left on any store or on her phone but a tombstone and what the docs name.',
  'founder-routes-fail-closed': 'Every founder readout refuses without the right key, with nothing about a member in the refusal.',
  'links-open-the-right-thing': 'A link the product hands out opens the instrument it was for, for the person it was sent to.',
  'both-sides-semantically-correct': 'A man and a woman each read the other person in the right words, on every instrument.',
}

export interface Entry {
  categories: Category[]
  kind: Kind
  invariants?: Invariant[]
}

export const CATALOG: Record<string, Entry> = {
  // ── Units, beside the code they test ──────────────────────────────────────
  'src/data/intake.test.ts': { categories: ['unit'], kind: 'behaviour' },
  'src/data/invite.test.ts': { categories: ['unit'], kind: 'behaviour' },
  'src/lib/analytics.test.ts': { categories: ['unit'], kind: 'behaviour' },
  'src/lib/beforeYes.test.ts': { categories: ['unit'], kind: 'behaviour' },
  'src/lib/budget.test.ts': { categories: ['unit'], kind: 'behaviour' },
  'src/lib/coach.test.ts': { categories: ['unit'], kind: 'behaviour' },
  'src/lib/cohort.test.ts': { categories: ['unit', 'failure'], kind: 'behaviour' },
  'src/lib/contact.test.ts': { categories: ['unit'], kind: 'behaviour' },
  'src/lib/couple.test.ts': { categories: ['unit'], kind: 'behaviour' },
  'src/lib/demo.test.ts': { categories: ['unit', 'security'], kind: 'behaviour' },
  'src/lib/draft.test.ts': { categories: ['unit'], kind: 'behaviour' },
  'src/lib/ending.test.ts': { categories: ['unit'], kind: 'behaviour' },
  'src/lib/entry.test.ts': { categories: ['unit'], kind: 'behaviour', invariants: ['links-open-the-right-thing'] },
  'src/lib/facts.test.ts': { categories: ['unit'], kind: 'behaviour' },
  'src/lib/followup-chain.test.ts': { categories: ['unit'], kind: 'behaviour' },
  'src/lib/followup.test.ts': { categories: ['unit'], kind: 'behaviour' },
  'src/lib/forget.test.ts': { categories: ['unit', 'failure'], kind: 'behaviour', invariants: ['delete-means-deleted'] },
  'src/lib/inferStage.test.ts': { categories: ['unit'], kind: 'behaviour' },
  'src/lib/keep.test.ts': { categories: ['unit', 'failure'], kind: 'behaviour', invariants: ['one-code-one-person'] },
  'src/lib/ledger.test.ts': { categories: ['unit'], kind: 'behaviour' },
  'src/lib/links.test.ts': { categories: ['unit'], kind: 'behaviour', invariants: ['links-open-the-right-thing'] },
  'src/lib/matching.test.ts': { categories: ['unit'], kind: 'behaviour', invariants: ['non-negotiables-never-ignored'] },
  'src/lib/progress.test.ts': { categories: ['unit'], kind: 'behaviour' },
  'src/lib/read.test.ts': { categories: ['unit'], kind: 'behaviour' },
  'src/lib/reflection.test.ts': { categories: ['unit'], kind: 'behaviour' },
  'src/lib/route.test.ts': { categories: ['unit'], kind: 'behaviour' },
  'src/lib/rungs.test.ts': { categories: ['unit'], kind: 'behaviour' },
  'src/lib/storage.test.ts': { categories: ['unit'], kind: 'behaviour' },
  'src/lib/vouch.test.ts': { categories: ['unit'], kind: 'behaviour' },
  'src/lib/waitlist.test.ts': { categories: ['unit', 'failure'], kind: 'behaviour' },
  'src/lib/words.test.ts': { categories: ['unit'], kind: 'behaviour' },

  // ── The invariants: one suite each, named for what it holds ───────────────
  'tests/invariants/one-code-one-person.test.ts': {
    categories: ['security', 'property', 'integration'],
    kind: 'behaviour',
    invariants: ['one-code-one-person'],
  },
  'tests/invariants/non-negotiables-are-never-ignored.test.tsx': {
    categories: ['property', 'contract', 'e2e'],
    kind: 'behaviour',
    invariants: ['non-negotiables-never-ignored'],
  },
  'tests/invariants/private-sheets.test.ts': {
    categories: ['security', 'property', 'integration'],
    kind: 'behaviour',
    invariants: ['private-sheets'],
  },
  'tests/invariants/delete-means-deleted.test.ts': {
    categories: ['security', 'integration', 'failure'],
    kind: 'behaviour',
    invariants: ['delete-means-deleted'],
  },
  'tests/invariants/founder-routes-fail-closed.test.ts': {
    categories: ['security', 'contract'],
    kind: 'behaviour',
    invariants: ['founder-routes-fail-closed'],
  },
  'tests/invariants/links-open-the-right-thing.test.tsx': {
    categories: ['e2e', 'property'],
    kind: 'behaviour',
    invariants: ['links-open-the-right-thing'],
  },
  'tests/invariants/both-sides.test.ts': {
    categories: ['property', 'unit'],
    kind: 'behaviour',
    invariants: ['both-sides-semantically-correct'],
  },

  // ── Journeys: the rendered app, driven by taps, over the real server ───────
  'tests/journeys/keep-and-restore.test.tsx': { categories: ['e2e', 'failure'], kind: 'behaviour', invariants: ['one-code-one-person'] },
  'tests/journeys/tool-link-read.test.tsx': {
    categories: ['e2e'],
    kind: 'behaviour',
    invariants: ['links-open-the-right-thing', 'both-sides-semantically-correct'],
  },
  'tests/journeys/eleven-two-phones.test.tsx': { categories: ['e2e', 'security'], kind: 'behaviour', invariants: ['private-sheets'] },
  'tests/journeys/forget-offline.test.tsx': { categories: ['e2e', 'failure'], kind: 'behaviour', invariants: ['delete-means-deleted'] },
  'tests/journeys/door.test.tsx': { categories: ['e2e', 'integration'], kind: 'behaviour' },

  // ── Rendered accessibility ────────────────────────────────────────────────
  'tests/ui/screens.test.tsx': { categories: ['accessibility'], kind: 'behaviour' },
  'tests/ui/crash.test.tsx': { categories: ['failure', 'security'], kind: 'behaviour' },

  // ── Functions over the in-memory store ────────────────────────────────────
  'tests/caps-function.test.ts': { categories: ['integration', 'security'], kind: 'behaviour' },
  'tests/cohort-function.test.ts': { categories: ['integration'], kind: 'behaviour' },
  'tests/couple-function.test.ts': { categories: ['integration', 'security'], kind: 'behaviour', invariants: ['private-sheets'] },
  'tests/edge-functions/gate.test.ts': { categories: ['integration', 'security'], kind: 'behaviour' },
  'tests/export-function.test.ts': { categories: ['integration', 'security'], kind: 'behaviour', invariants: ['founder-routes-fail-closed'] },
  'tests/guide-function.test.ts': { categories: ['integration', 'security'], kind: 'behaviour' },
  'tests/keep-function.test.ts': {
    categories: ['integration', 'security'],
    kind: 'behaviour',
    invariants: ['one-code-one-person', 'delete-means-deleted'],
  },
  'tests/pool-function.test.ts': {
    categories: ['integration', 'security'],
    kind: 'behaviour',
    invariants: ['non-negotiables-never-ignored', 'founder-routes-fail-closed'],
  },
  'tests/progress-function.test.ts': { categories: ['integration'], kind: 'behaviour' },
  'tests/safety-function.test.ts': { categories: ['integration', 'security'], kind: 'behaviour' },
  'tests/sweep-function.test.ts': { categories: ['integration', 'failure'], kind: 'behaviour' },
  'tests/vouch-function.test.ts': { categories: ['integration', 'security'], kind: 'behaviour' },
  'tests/guide-eval-live.test.ts': { categories: ['integration'], kind: 'mixed' },

  // ── Failure, caused ───────────────────────────────────────────────────────
  'tests/integrity.test.ts': { categories: ['failure', 'integration'], kind: 'behaviour', invariants: ['delete-means-deleted'] },
  'tests/failure-modes.test.ts': { categories: ['failure', 'integration'], kind: 'behaviour' },
  'tests/ops.test.ts': { categories: ['failure', 'integration', 'security'], kind: 'behaviour' },
  'tests/chunk-error.test.ts': { categories: ['failure'], kind: 'mixed' },
  'tests/fail.test.ts': { categories: ['failure'], kind: 'source' },

  // ── Contracts: two things that must agree ─────────────────────────────────
  'tests/vocab-sync.test.ts': { categories: ['contract'], kind: 'behaviour' },
  'tests/gate-sync.test.ts': { categories: ['contract', 'property'], kind: 'behaviour', invariants: ['non-negotiables-never-ignored'] },
  'tests/record-version.test.ts': { categories: ['contract'], kind: 'behaviour' },
  'tests/guide-prompt.test.ts': { categories: ['contract'], kind: 'behaviour' },
  'tests/guide-eval.test.ts': { categories: ['contract'], kind: 'mixed' },
  'tests/guide-eval-graders.test.ts': { categories: ['unit'], kind: 'behaviour' },
  'tests/guide-disclosure.test.ts': { categories: ['contract', 'security'], kind: 'mixed' },
  'tests/alignment-audit.test.ts': {
    categories: ['contract', 'unit'],
    kind: 'mixed',
    invariants: ['non-negotiables-never-ignored'],
  },
  'tests/tools.test.ts': { categories: ['contract'], kind: 'mixed', invariants: ['links-open-the-right-thing'] },
  'tests/help.test.ts': { categories: ['contract'], kind: 'mixed' },
  'tests/guides.test.ts': { categories: ['unit', 'contract'], kind: 'mixed' },
  'tests/sheet.test.ts': { categories: ['contract'], kind: 'behaviour' },
  'tests/sheet-so.test.ts': { categories: ['contract'], kind: 'behaviour' },
  'tests/service-worker.test.ts': { categories: ['contract', 'failure'], kind: 'mixed' },
  'tests/short-map.test.ts': { categories: ['unit'], kind: 'mixed' },
  'tests/wayout.test.ts': { categories: ['unit'], kind: 'mixed' },
  'tests/fogg.test.ts': { categories: ['unit'], kind: 'mixed' },
  'tests/restore-link.test.ts': { categories: ['security', 'unit'], kind: 'mixed', invariants: ['one-code-one-person'] },
  'tests/floor.test.ts': { categories: ['unit', 'security'], kind: 'behaviour' },
  'tests/mens-read.test.ts': { categories: ['unit'], kind: 'mixed', invariants: ['both-sides-semantically-correct'] },
  'tests/abuse.test.ts': { categories: ['security'], kind: 'mixed' },
  'tests/security-audit.test.ts': { categories: ['security'], kind: 'mixed' },

  // ── Static guards: only where behaviour cannot reach ──────────────────────
  'tests/a11y.test.ts': { categories: ['accessibility'], kind: 'source' },
  'tests/mobile.test.ts': { categories: ['accessibility'], kind: 'source' },
  'tests/load.test.ts': { categories: ['accessibility'], kind: 'mixed' },
  'tests/brand.test.ts': { categories: ['contract'], kind: 'source' },
  'tests/deploy-layout.test.ts': { categories: ['contract', 'security'], kind: 'source' },
  'tests/durable.test.ts': { categories: ['contract'], kind: 'source' },
  'tests/performance.test.ts': { categories: ['contract'], kind: 'source' },
  'tests/promises.test.ts': { categories: ['contract'], kind: 'source' },
  'tests/somali-gate.test.ts': { categories: ['contract'], kind: 'source' },
  'tests/voice.test.ts': { categories: ['contract'], kind: 'source' },

  // ── This file's own guard ─────────────────────────────────────────────────
  'tests/catalog.test.ts': { categories: ['contract'], kind: 'behaviour' },
}

/**
 * How many files test source text rather than behaviour. A ratchet: it may go
 * down, and going up is a decision made in a diff someone reads, with the
 * reason in docs/TESTING.md.
 */
export const SOURCE_FILES_AT_MOST = 10
