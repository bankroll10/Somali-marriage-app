import type Anthropic from '@anthropic-ai/sdk'
import { guideRequest } from '../../netlify/functions/guide'
import { localReply } from '../../src/lib/coach'
import type { CoachContext } from '../../src/data/coach'
import type { GuideCase } from '../guide-eval/cases'
import { JUDGE_MODEL } from '../guide-eval/judge'
import { CALIBRATION } from './calibration'
import { propertiesFor, type Theme } from './guide-map'
import { PROPERTIES, plain, type PropertyId } from './properties'
import type { ScriptEntry } from './scripts'

/**
 * The judged half of relationship judgment (docs/GUIDE-EVAL.md, "Relationship
 * judgment", E).
 *
 * A second model reads one text — a Guide answer, or a script — and says, for
 * each property it is given, whether the text holds it, violates it, or the
 * property does not apply. A "violated" must quote the words that violate it,
 * and the quote must be in the text verbatim; a verdict whose evidence is not
 * there is the judge's error, not the text's, and is set aside and counted
 * (`unverified`). So the judge cannot fail a text on a paraphrase of its own,
 * and a regression it reports can always be pointed at.
 *
 * It never scores against a remembered answer. It is given the properties,
 * the context the text was written for, and the text.
 */

export type Verdict = 'holds' | 'violated' | 'n/a'

export interface PropertyVerdict {
  verdict: Verdict
  /** For a violation: the exact words. Otherwise a sentence saying why. */
  evidence: string
}

export interface PropertyJudgement {
  verdicts: Partial<Record<PropertyId, PropertyVerdict>>
  /** Violations the judge could not quote from the text. Not counted against it. */
  unverified: PropertyId[]
}

export const PROPERTY_RUBRIC = `You are checking one text from Niyyah — a marriage-readiness guide for Somali Muslims in the diaspora — against named properties of good relationship judgment. The text is either an answer from its guide, or words it hands a member to say to someone.

For EACH property you are given, return one verdict:
- "holds": the text does what the property asks.
- "violated": it does not. You MUST put in "evidence" the exact words from the text that violate it, copied character for character. A violation you cannot quote is not a violation.
- "n/a": the property has nothing to act on in this text.

Judge only what is written. Do not reward a phrase for being present; a text can use every right word and still infer a motive, and a text with none of them can hold every property. Do not penalise a text for what it was not asked. Be strict on the hard properties and fair on the rest.

Return only the JSON asked for.`

function schemaFor(properties: PropertyId[]) {
  return {
    type: 'object',
    additionalProperties: false,
    required: properties,
    properties: Object.fromEntries(
      properties.map((p) => [
        p,
        {
          type: 'object',
          additionalProperties: false,
          required: ['verdict', 'evidence'],
          properties: { verdict: { type: 'string', enum: ['holds', 'violated', 'n/a'] }, evidence: { type: 'string' } },
        },
      ]),
    ),
  }
}

/** What the judge is shown. Every property it is asked about arrives with its rule and its rubric line. */
export function judgeInput(text: string, context: string, properties: PropertyId[]): string {
  return [
    'THE PROPERTIES:',
    ...properties.map((p) => `${p} (${PROPERTIES[p].hard ? 'hard' : 'soft'}): ${PROPERTIES[p].rule} ${PROPERTIES[p].rubric}`),
    '',
    `WHAT THE TEXT IS, AND WHO IT IS FOR: ${context}`,
    '',
    'THE TEXT:',
    text,
  ].join('\n')
}

const squash = (s: string) => plain(s).replace(/\s+/g, ' ').trim().toLowerCase()

/**
 * Keep a verdict only when it can be pointed at. Pure, so the rule is pinned
 * offline (tests/judgment-live.test.ts).
 */
export function verify(text: string, raw: Record<string, { verdict: string; evidence: string }>, properties: PropertyId[]): PropertyJudgement | null {
  const verdicts: Partial<Record<PropertyId, PropertyVerdict>> = {}
  const unverified: PropertyId[] = []
  for (const p of properties) {
    const v = raw[p]
    if (!v || !['holds', 'violated', 'n/a'].includes(v.verdict)) return null
    if (v.verdict === 'violated' && (squash(v.evidence).length < 3 || !squash(text).includes(squash(v.evidence)))) {
      unverified.push(p)
      continue
    }
    verdicts[p] = { verdict: v.verdict as Verdict, evidence: String(v.evidence) }
  }
  return { verdicts, unverified }
}

export async function judgeProperties(
  client: Pick<Anthropic, 'messages'>,
  text: string,
  context: string,
  properties: PropertyId[],
): Promise<{ judgement: PropertyJudgement | null; usage: Anthropic.Usage | null }> {
  const res = await client.messages.create({
    model: JUDGE_MODEL,
    max_tokens: 8_000,
    system: PROPERTY_RUBRIC,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: schemaFor(properties) } },
    messages: [{ role: 'user', content: judgeInput(text, context, properties) }],
  })
  if (res.stop_reason === 'refusal') return { judgement: null, usage: res.usage }
  const out = res.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('')
  try {
    return { judgement: verify(text, JSON.parse(out), properties), usage: res.usage }
  } catch {
    return { judgement: null, usage: res.usage }
  }
}

/** The properties words are judged on. The others are about answers, not scripts. */
export const COPY_PROPERTIES: PropertyId[] = ['NO_ACCUSATION', 'NO_THERAPY_SPEAK', 'NATURAL_REGISTER', 'NO_HIDDEN_INTERPRETATION', 'DIRECT', 'SOMALI_NATURAL', 'NO_MOTIVE']

const LISTENER: Record<ScriptEntry['to'], string> = {
  partner: 'the person they are thinking of marrying',
  family: 'a member of their own family',
  elder: 'an elder: a parent, or the other person’s father',
  confidant: 'one person who knows them, not the person they are careful around',
  self: 'themselves',
}

export function copyContext(e: ScriptEntry): string {
  return `Words a Somali ${e.gender} in the diaspora is handed to say, word for word, to ${LISTENER[e.to]}. Declared shape: ${e.shape}. ${
    e.why ? `Why these words, as she is told it (it travels with them if she sends them): ${e.why}` : ''
  }`
}

export interface JudgedText {
  id: string
  kind: 'guide' | 'held-out' | 'script' | 'calibration'
  properties: PropertyId[]
  text: string
  /** Who answered a Guide text: the model; the offline voice because it declined; or nobody, because live inference failed (not judged, not coverage). */
  source?: 'live' | 'offline-fallback' | 'unavailable'
  judgement: PropertyJudgement | null
}

/** A violated hard property, anywhere: the run fails. */
export function propertyFailures(results: JudgedText[]): string[] {
  return results.flatMap((r) =>
    Object.entries(r.judgement?.verdicts ?? {})
      .filter(([p, v]) => v.verdict === 'violated' && PROPERTIES[p as PropertyId].hard)
      .map(([p, v]) => `${r.id} ${p}: "${v.evidence}"`),
  )
}

/** Per property, the share of judged texts where it holds. Compared with the last run like the Guide's judge means. */
export function holdRates(results: JudgedText[]): Partial<Record<PropertyId, number>> {
  const out: Partial<Record<PropertyId, number>> = {}
  for (const p of Object.keys(PROPERTIES) as PropertyId[]) {
    const vs = results.flatMap((r) => (r.judgement?.verdicts[p] && r.judgement.verdicts[p]!.verdict !== 'n/a' ? [r.judgement.verdicts[p]!.verdict] : []))
    if (vs.length) out[p] = Math.round((vs.filter((v) => v === 'holds').length / vs.length) * 100) / 100
  }
  return out
}

export function propertyRegressions(now: JudgedText[], then?: JudgedText[]): string[] {
  const out = propertyFailures(now).map((f) => `hard property — ${f}`)
  if (!then) return out
  const a = holdRates(then)
  const b = holdRates(now)
  for (const p of Object.keys(b) as PropertyId[]) if (a[p] !== undefined && a[p]! - b[p]! > 0.05) out.push(`${p} holds ${a[p]} → ${b[p]}`)
  return out
}

/**
 * The judge, checked before its verdicts count: every calibration line
 * (./calibration.ts) is judged on the property it broke. The removed line
 * must be called violated, and its replacement must hold. Returns what it got
 * wrong; a run whose judge misses more than two is not trusted.
 */
export async function calibrate(client: Pick<Anthropic, 'messages'>): Promise<string[]> {
  const misses: string[] = []
  for (const c of CALIBRATION) {
    const context =
      c.said === 'copy'
        ? 'A sentence the app says to a member about their own situation, their answers, or the person they are thinking of marrying.'
        : 'Words handed to a member to say, word for word, to the person they are thinking of marrying or to their family.'
    const bad = (await judgeProperties(client, c.bad, context, [c.breaks])).judgement?.verdicts[c.breaks]?.verdict
    const good = (await judgeProperties(client, c.good, context, [c.breaks])).judgement?.verdicts[c.breaks]?.verdict
    if (bad !== 'violated') misses.push(`missed ${c.breaks} in the removed line (${c.from})`)
    if (good === 'violated') misses.push(`called the replacement a ${c.breaks} violation (${c.from})`)
  }
  return misses
}

/** One Guide answer, live, with production's fallback, judged on the case's properties. */
export async function judgeGuideCase(client: Pick<Anthropic, 'messages'>, c: GuideCase & { theme?: Theme }, kind: 'guide' | 'held-out'): Promise<JudgedText> {
  const res = await client.messages.create(guideRequest(c.mode, c.context, c.history ?? [], c.message))
  const text = res.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('').trim()
  const declined = res.stop_reason === 'refusal' || !text
  const answer = declined ? localReply(c.message, c.context as unknown as CoachContext, c.mode).text : text
  const properties = propertiesFor(c.id, c.theme)
  const context = `An answer from the guide, in the ${c.mode} voice, to this member's message: "${c.message}". What a good answer does here: ${c.note}`
  return { id: c.id, kind, properties, text: answer, source: declined ? 'offline-fallback' : 'live', judgement: (await judgeProperties(client, answer, context, properties)).judgement }
}
