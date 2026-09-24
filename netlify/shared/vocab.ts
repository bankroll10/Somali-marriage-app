/**
 * Every word the server will accept.
 *
 * The functions validate against closed sets, and until now each function kept
 * its own copy of each set. This is the one place they live. Every set names
 * the file in src/ it must match, and tests/vocab-sync.test.ts fails the moment
 * either side moves without the other.
 *
 * Nothing here is a person and nothing here is a sentence. That is the point of
 * closing the vocabulary: a record made of these ids can carry how a map read
 * or which conversation was had, and it cannot carry what anyone wrote.
 */

/** Must match src/lib/rungs.ts. */
export const RUNGS = new Set([
  'arrived',
  'situated',
  'mapped',
  'kept',
  'read',
  'eleven',
  'asked-him',
  'he-answered',
  'followed-through',
  'deciding',
  'married',
])

/** Must match src/data/scenes.ts. */
export const SCENES = new Set([
  'twin-cities', 'toronto', 'london', 'columbus', 'stockholm',
  'seattle', 'san-diego', 'birmingham', 'bristol', 'leicester', 'gothenburg', 'oslo', 'copenhagen', 'helsinki', 'amsterdam', 'nairobi', 'melbourne',
  'other',
])

/** Must match src/data/hook.ts, plus 'none' for a hardest part never named. */
export const HOOKS = new Set(['serious', 'family', 'trust', 'finding', 'other', 'ready', 'none'])

export const GENDERS = new Set(['woman', 'man'])

/**
 * Must match `ModeId` in src/types.ts and the mode ids in src/data/coach.ts —
 * which of the four voices is answering. The only thing about how the guide
 * speaks that a caller gets to choose (netlify/shared/prompt.ts).
 */
export const GUIDE_MODES = new Set(['auntie', 'brother', 'therapist', 'islamic'])

/** Must match `Stage` in src/types.ts and the ids in src/data/stages.ts. */
export const STAGES = new Set(['preparing', 'talking', 'deciding', 'married'])

/**
 * Must match src/lib/entry.ts. What kind of link first brought a person here —
 * never who sent it; the link does not carry that. `group` is a link shared
 * into a community's chat rather than sent to one person: the kind of room,
 * never the room (docs/PRODUCT.md). `alumni`, `professional` and `mosque` say
 * which kind of room, so the eight-week pivot rule can be read from the
 * readout — still never which room, never a person (docs/DECISIONS.md). `press`
 * is not a room at all: a publication that printed the link, never which one,
 * and deliberately outside the room kinds the pivot rule reads
 * (src/lib/entry.ts, docs/PRODUCT.md).
 */
export const VIAS = new Set(['words', 'eleven', 'couple', 'family', 'married', 'group', 'alumni', 'professional', 'mosque', 'press'])

/** Must match `Dimension` in src/types.ts — the map's seven grounds. */
export const DIMENSIONS = new Set(['intention', 'faith', 'family', 'vision', 'character', 'emotional', 'selfAwareness'])

/** Must match `GroundState` in src/types.ts. */
export const GROUND_STATES = new Set(['thin', 'steady', 'strong'])

/** Must match `ReadBand` in src/lib/read.ts. */
export const READ_BANDS = new Set(['early', 'strong', 'mixed', 'thin', 'caution'])

/** Must match `ReadDimension` in src/data/read.ts. */
export const READ_DIMENSIONS = new Set(['intent', 'public', 'family', 'consistency', 'pressure'])

/**
 * What a read's follow-up can be about: a dimension the script addressed, or
 * 'early' — the question handed to someone whose read was taken too soon to
 * conclude anything (src/data/read.ts SCRIPTS).
 */
export const READ_TOPICS = new Set([...READ_DIMENSIONS, 'early'])

/** Must match src/data/beforeYes.ts — the eleven. */
export const TOPICS = new Set([
  'live',
  'his-family-in-home',
  'work',
  'money-home',
  'children',
  'deen-daily',
  'aroos-mahr',
  'qabiil',
  'going-back',
  'second-wife',
  'families-disagree',
])

/** Must match `YesState` in src/data/beforeYes.ts. */
export const YES_STATES = new Set(['agree', 'settled', 'differ', 'not-talked', 'unknown'])

/** Must match `Joint` in netlify/functions/couple.ts. */
export const JOINTS = new Set([
  'both-agree',
  'both-settled',
  'both-not-talked',
  'one-thinks-talked',
  'differ-somewhere',
  'unknown-somewhere',
])

/** Must match src/data/families.ts. */
export const FAMILY_SCRIPT_IDS = new Set([
  'tell-wali-online',
  'tell-family-online',
  'first-with-hooyo',
  'send-his-people',
  'approach-her-family',
  'open-mahr-and-living',
  'families-meet',
  'end-it-kindly',
  'in-laws-after',
])

/**
 * Which follow-ups can be reported as had, and what their topic must be. The
 * guide is deliberately absent: its follow-up topic is what she asked, in her
 * own words, and a sentence can never arrive here under any name.
 */
export const THROUGH_TOPICS: Record<string, Set<string>> = {
  read: READ_TOPICS,
  beforeYes: TOPICS,
  couple: TOPICS,
  family: FAMILY_SCRIPT_IDS,
}

/** Must match the intake's `dealbreakers` question in src/data/intake.ts. */
export const DEALBREAKERS = new Set(['honesty', 'faith-nn', 'respect', 'no-addiction', 'kids-nn', 'ambition-nn', 'kindness-nn'])

/** Must match src/data/ended.ts — why a courtship ended, and from which stage. */
export const ENDED_REASONS = new Set([
  'non-negotiable',
  'eleven',
  'his-read',
  'my-family',
  'his-family',
  'timeline',
  'distance',
  'he-stopped',
  'i-stopped',
  'other',
])
export const ENDED_STAGES = new Set(['talking', 'deciding'])
/** The three reasons that name a second id, and the list each must come from. */
export const ENDED_WHICH: Record<string, Set<string>> = {
  'non-negotiable': DEALBREAKERS,
  eleven: TOPICS,
  'his-read': READ_DIMENSIONS,
}

/**
 * Must match src/data/instruments.ts — which questionnaires a person began.
 * The denominator for a completion rate, since finishing is already a rung.
 * One bit each, merged as a union: not a count, not a time, not a session.
 */
export const INSTRUMENTS = new Set(['map', 'read', 'eleven', 'couple'])

/** Must match src/lib/facts.ts ASKED — what a person asked, ever, as a set. Today only the guide. */
export const ASKED = new Set(['guide'])

/** Must match src/data/ending.ts — the three closed questions on the way out. */
export const WHO = new Set(['brought', 'family', 'elsewhere'])
export const MATTERED = new Set(['shown', 'eleven', 'families', 'myself', 'other'])
export const USED = new Set(['read', 'eleven', 'couple', 'families', 'guide', 'map'])

/**
 * Must match src/data/safety.ts. Why a member is reporting a concern about
 * whoever is on the other side of a couple code — the one closed list this
 * report is built from. See netlify/functions/safety.ts.
 */
export const SAFETY_REASONS = new Set(['harassment', 'threats', 'sexual', 'already-married', 'impersonation', 'other'])
/** Must match src/data/safety.ts SAFETY_OUTCOMES. What the founder did about a report. */
export const SAFETY_OUTCOMES = new Set(['spoke-to-them', 'told-the-family', 'not-enough', 'no-action'])

/**
 * The reasons that cannot wait for Monday (docs/SECURITY.md): an open report
 * with one of these fails the founder's daily health check. Server-only — the
 * app never sends urgency, only the reason; `/health` decides.
 */
export const URGENT_REASONS = new Set(['threats', 'sexual'])

/**
 * Must match src/lib/crash.ts CRASH_EVENTS. The only two things a phone ever
 * tells the server about the app failing on it: that it crashed, or that a
 * screen's code never arrived. No screen, no stack, no code (docs/OPS.md).
 */
export const CRASH_EVENTS = new Set(['crash', 'chunk'])

/** The routes whose failures are counted as `fail.<route>`. */
export const OPS_ROUTES = ['keep', 'couple', 'progress', 'safety', 'export', 'guide', 'sweep', 'limit', 'health'] as const
export type OpsRoute = (typeof OPS_ROUTES)[number]

/** Every rate-limit bucket in netlify/functions, as the kind of cap it is (shared/limit.ts capSignal). */
export const CAP_FAMILIES = [
  'guide-h',
  'guide-d',
  'keep',
  'restore',
  'forget',
  'couple',
  'couple-read',
  'couple-forget',
  'couple-answer',
  'safety',
  'safety-probe',
  'progress',
  'progress-forget',
  'health',
] as const

/** What the guide's call to Claude came to. `ok` is a whole answer. */
export const CLAUDE_OUTCOMES = ['ok', 'rate_limited', 'auth', 'upstream', 'unexpected', 'empty', 'stream_ended', 'not_configured'] as const

/**
 * Every operations signal there is (shared/ops.ts, docs/OPS.md). A closed list,
 * so nothing free-text and nothing about a person can ever be counted: each
 * one names an operation of the service — a route failing, a cap refusing, a
 * call to Claude and its tokens, a phone reporting a crash. `note()` drops
 * anything not here.
 */
export const OPS_SIGNALS = new Set<string>([
  ...OPS_ROUTES.map((r) => `fail.${r}`),
  ...CAP_FAMILIES.map((c) => `cap.${c}`),
  ...CLAUDE_OUTCOMES.map((o) => `claude.${o}`),
  'claude.in',
  'claude.out',
  ...[...CRASH_EVENTS].map((e) => `client.${e}`),
])
