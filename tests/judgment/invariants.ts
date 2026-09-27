import type { ReadResult } from '../../src/lib/read'
import type { BeforeYesResult } from '../../src/lib/beforeYes'
import { CAREFUL_SCRIPT } from '../../src/data/read'
import { ownAnswerFirst, workItOut } from '../../src/data/beforeYes'
import { autonomyNotes, COMPAT } from '../guide-eval/graders'
import type { ScriptEntry } from './scripts'
import type { Gender } from '../../src/types'

/**
 * The judgment the Read and the Eleven must never lose, as functions of a
 * result. ./read.test.ts and ./eleven.test.ts run them over every answer
 * fast-check can build; ./mutations.test.ts hands them results broken on
 * purpose and requires each to object. One definition, so the property that
 * is tested is the property that is proven to bite.
 */

/** Every sentence the Read says to her about the other person. */
export const readCopy = (r: ReadResult) => [r.headline, r.summary, r.careful ?? '', r.caution ?? '', ...(r.watch ?? [])].join(' ')

export function readInvariants(r: ReadResult): string[] {
  const out: string[] = []
  const known = r.dimensions.find((d) => d.dimension === 'public')?.state === 'shown'
  if (r.band === 'strong' && !known) out.push('strong without being known: words bought the read')
  if (r.band === 'strong' && r.dimensions.some((d) => d.state === 'not-yet')) out.push('strong with something not yet shown')
  if (r.careful && r.band === 'strong') out.push('careful what she raises, and still strong')
  if (r.careful !== undefined && r.script !== CAREFUL_SCRIPT) out.push('careful, and words for the person she is careful around')
  if (r.band === 'caution' && !r.concern) out.push('a caution that does not say which')
  if (r.band === 'early' && !(r.watch?.length ?? 0)) out.push('too early, with nothing to watch for')
  for (const n of autonomyNotes(readCopy(r))) out.push(`the copy ${n}`)
  return out
}

/** A difference named as incompatibility, or as a verdict. */
export function callsIncompatible(text: string): boolean {
  return [...text.matchAll(COMPAT)].length > 0 || /\b(incompatib|a bad sign|deal-?breaker|red flag)/i.test(text)
}

export const elevenCopy = (r: BeforeYesResult) =>
  [r.headline, r.summary, ...Object.values(r.byState).flat().map((t) => t.note), ...r.lines.map((t) => t.note)].join(' ')

export function elevenInvariants(r: BeforeYesResult, gender: Gender, topicCount: number): string[] {
  const out: string[] = []
  const lineIds = r.lines.map((l) => l.id)
  if (lineIds.includes(r.open.id) && lineIds.length < topicCount) out.push('a line opened as a conversation while others were open')
  if (r.open.state === 'settled' && [...r.byState['not-talked'], ...r.byState.unknown, ...r.byState.differ].length > 0)
    out.push('a worked-out difference opened ahead of a conversation not had')
  if (r.open.state === 'differ' && JSON.stringify(r.open.script) !== JSON.stringify(workItOut(gender))) out.push('an open difference without the words for working it out')
  if (r.open.state === 'unknown' && JSON.stringify(r.open.script) !== JSON.stringify(ownAnswerFirst(gender))) out.push('her own answer missing, and a question for him instead')
  if (callsIncompatible(elevenCopy(r))) out.push('a difference called incompatibility')
  for (const n of autonomyNotes(elevenCopy(r))) out.push(`the copy ${n}`)
  return out
}

/** Sentences of `tells` — the reading of the reply — that have got into the words. */
export function tellsLeak(e: Pick<ScriptEntry, 'words' | 'tells'>): string[] {
  const long = (t: string) => t.split(/(?<=[.?!])\s+/).map((s) => s.trim()).filter((s) => s.split(/\s+/).length >= 6)
  return long(e.tells).filter((s) => e.words.includes(s))
}

/** Word-list phrases a held-out message contains verbatim, beyond those there before the set was written. */
export function copiedPhrases(messages: { id: string; message: string }[], phrases: string[], before: Set<string>): string[] {
  const plain = (s: string) => s.toLowerCase().replace(/[’']/g, "'")
  return messages.flatMap((h) => phrases.filter((p) => !before.has(p) && plain(h.message).includes(plain(p))).map((p) => `${h.id}: "${p}"`))
}
