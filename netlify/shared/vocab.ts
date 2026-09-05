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

/** Must match src/data/hook.ts, plus 'none' for a hardest part never named. */
export const HOOKS = new Set(['serious', 'family', 'trust', 'finding', 'ready', 'none'])

/** Must match src/lib/ledger.ts. */
export const LEDGER = new Set(['map', 'read', 'beforeYes', 'living', 'kept', 'counted', 'vouched'])

export const GENDERS = new Set(['woman', 'man'])

/**
 * Must match src/lib/entry.ts. What kind of link first brought a person here —
 * never who sent it; the link does not carry that.
 */
export const VIAS = new Set(['words', 'eleven', 'couple', 'door', 'family', 'married'])

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

/** Must match src/data/ending.ts — the three closed questions on the way out. */
export const WHO = new Set(['brought', 'family', 'here', 'elsewhere'])
export const MATTERED = new Set(['shown', 'eleven', 'families', 'myself', 'other'])
export const USED = new Set(['read', 'eleven', 'couple', 'families', 'vouch', 'guide', 'map'])
