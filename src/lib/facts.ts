import type { Dimension, EndingRecord, FollowUp, Gender, GroundState, ReadRecord, Reflection } from '../types'
import { DIMENSION_LABEL, type ReadDimension } from '../data/read'
import { beforeYesTopics } from '../data/beforeYes'
import { familyScripts } from '../data/families'
import { endingQuestions } from '../data/ending'
import { buildRead, type ReadBand } from './read'
import { buildBeforeYes } from './beforeYes'

/**
 * What the rungs were made of.
 *
 * The ladder says that something happened: a map was built, a read was taken,
 * a conversation was had, someone married. It has never said what — which
 * ground read thin, how the read came out, which of the eleven got said, who
 * she married. That knowledge is the only thing this product produces that
 * a second team could not copy from the screens, and until now it was
 * discarded at the moment it was made.
 *
 * This carries it, beside the rungs, under the same anonymous install code and
 * the same "Count me" control. Every value here is an id from a closed list
 * the product already owns — a ground, a state, a band, a topic, an option.
 * The type is the guarantee: there is no field that could hold a sentence,
 * an answer in her words, or a name. The one free-text line on the ending is
 * not on this type and cannot be added without changing it.
 *
 * Output is deterministic — fixed key order, sorted arrays — because the
 * serialised form is what tells a re-render from a new fact.
 */
export interface Facts {
  /** Each of the seven grounds, in a word. */
  grounds?: Partial<Record<Dimension, GroundState>>
  /** How the read came out, and the ground it found thinnest. */
  read?: { band: ReadBand; thin: ReadDimension }
  /** How many of the eleven were in each state, and the one it told her to open. Counts, never her sheet. */
  eleven?: { agree: number; differ: number; notTalked: number; unknown: number; open: string }
  /** Conversations she confirmed she had, as `source:topic`. Never the guide's. */
  through?: string[]
  /** The three closed answers on the way out. Never the line she wrote. */
  ending?: { who?: string; mattered?: string; used?: string[] }
}

export interface FactsInput {
  reflection: Reflection | null
  read: ReadRecord | null
  beforeYes: ReadRecord | null
  followups: FollowUp[]
  ending: EndingRecord | null
  gender: Gender
}

/**
 * The product's own closed lists, so a stale id in storage can be dropped here
 * rather than have the server refuse the whole report.
 */
const READ_TOPICS = new Set<string>([...Object.keys(DIMENSION_LABEL), 'early'])
const TOPICS = new Set(beforeYesTopics('woman').map((t) => t.id))
const FAMILY_SCRIPTS = new Set([...familyScripts('woman'), ...familyScripts('man')].map((s) => s.id))
const THROUGH: Record<string, Set<string>> = { read: READ_TOPICS, beforeYes: TOPICS, couple: TOPICS, family: FAMILY_SCRIPTS }
const ENDING = Object.fromEntries(endingQuestions('woman').map((q) => [q.id, new Set(q.options.map((o) => o.id))])) as Record<
  'who' | 'mattered' | 'used',
  Set<string>
>

export function factsFrom(i: FactsInput): Facts {
  const facts: Facts = {}

  if (i.reflection) {
    const grounds: Partial<Record<Dimension, GroundState>> = {}
    for (const d of i.reflection.dimensions) grounds[d.dimension] = d.state
    facts.grounds = grounds
  }

  if (i.read) {
    const r = buildRead(i.read.answers, i.gender)
    if (r) facts.read = { band: r.band, thin: r.thin }
  }

  if (i.beforeYes) {
    const b = buildBeforeYes(i.beforeYes.answers, i.gender)
    if (b && TOPICS.has(b.open.id)) {
      facts.eleven = {
        agree: b.counts.agree,
        differ: b.counts.differ,
        notTalked: b.counts['not-talked'],
        unknown: b.counts.unknown,
        open: b.open.id,
      }
    }
  }

  const through = new Set<string>()
  for (const f of i.followups) {
    if (f.outcome !== 'asked') continue
    const allowed = THROUGH[f.source]
    if (allowed?.has(f.topic)) through.add(`${f.source}:${f.topic}`)
  }
  if (through.size) facts.through = [...through].sort()

  if (i.ending) {
    const ending: NonNullable<Facts['ending']> = {}
    if (i.ending.who && ENDING.who.has(i.ending.who)) ending.who = i.ending.who
    if (i.ending.mattered && ENDING.mattered.has(i.ending.mattered)) ending.mattered = i.ending.mattered
    const used = (i.ending.used ?? []).filter((u) => ENDING.used.has(u)).sort()
    if (used.length) ending.used = used
    if (Object.keys(ending).length) facts.ending = ending
  }

  return facts
}
