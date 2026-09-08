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
  'vouched',
  'counted',
  'deciding',
  'married',
])

/** Must match src/data/scenes.ts. */
export const SCENES = new Set(['twin-cities', 'toronto', 'london', 'columbus', 'stockholm', 'other'])

/**
 * Must match src/data/countries.ts. The country sits above the city in the
 * door's count — the pool a person would move within for the right person —
 * and never below it; docs/LEARNING.md refuses anything finer than the city.
 */
export const COUNTRIES = new Set(['us', 'ca', 'uk', 'se', 'no', 'dk', 'nl', 'fi', 'de', 'au', 'ke', 'ae', 'so', 'other'])

/**
 * Must match `country` on each named city in src/data/scenes.ts. A city
 * implies its country; only `other` has to be told one.
 */
export const SCENE_COUNTRY: Record<string, string> = {
  'twin-cities': 'us',
  toronto: 'ca',
  london: 'uk',
  columbus: 'us',
  stockholm: 'se',
}

/** Must match src/data/reach.ts — how far she would go for the right person. */
export const REACH = new Set(['city', 'country', 'anywhere'])

/** Must match src/data/hook.ts, plus 'none' for a hardest part never named. */
export const HOOKS = new Set(['serious', 'family', 'trust', 'finding', 'ready', 'none'])

/** Must match src/lib/ledger.ts. */
export const LEDGER = new Set(['map', 'read', 'beforeYes', 'living', 'kept', 'counted', 'vouched'])

export const GENDERS = new Set(['woman', 'man'])

/**
 * Must match src/lib/entry.ts. What kind of link first brought a person here —
 * never who sent it; the link does not carry that. `group` is a link shared
 * into a community's chat rather than sent to one person: the kind of room,
 * never the room (docs/WEDGE.md).
 */
export const VIAS = new Set(['words', 'eleven', 'couple', 'door', 'family', 'married', 'group'])

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
export const YES_STATES = new Set(['agree', 'differ', 'not-talked', 'unknown'])

/** Must match `Joint` in netlify/functions/couple.ts. */
export const JOINTS = new Set(['both-agree', 'both-not-talked', 'one-thinks-talked', 'differ-somewhere', 'unknown-somewhere'])

/** Must match src/data/families.ts. */
export const FAMILY_SCRIPT_IDS = new Set([
  'tell-wali-online',
  'first-with-hooyo',
  'send-his-people',
  'open-mahr-and-living',
  'end-it-kindly',
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

/**
 * Must match src/data/hesitation.ts — why someone reached the door and did
 * not walk through it. One word about the door, never about her.
 */
export const HESITATIONS = new Set(['contact', 'seen', 'family', 'empty', 'ready', 'other'])

/** Must match src/data/ending.ts — the three closed questions on the way out. */
export const WHO = new Set(['brought', 'family', 'here', 'elsewhere'])
export const MATTERED = new Set(['shown', 'eleven', 'families', 'myself', 'other'])
export const USED = new Set(['read', 'eleven', 'couple', 'families', 'vouch', 'guide', 'map'])

/**
 * Must match src/data/safety.ts. Why a member is reporting a concern about
 * whoever is on the other side of a couple code — the one closed list this
 * report is built from. See netlify/functions/safety.ts.
 */
export const SAFETY_REASONS = new Set(['harassment', 'threats', 'sexual', 'already-married', 'impersonation', 'other'])
/** Must match src/data/safety.ts SAFETY_OUTCOMES. What the founder did about a report. */
export const SAFETY_OUTCOMES = new Set(['spoke-to-them', 'told-the-family', 'never-introduce', 'not-enough', 'no-action'])
