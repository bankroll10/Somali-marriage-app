import { SAMPLE_NAME, peopleFor, scenarioOf } from './fixtures'
import { evaluate, looksLikeContact, type Self } from './suggest'
import { CRITERION_IDS, type Answers, type Ask, type Asks, type CriterionId, type Firmness, type PersonId, type ScenarioId, type Side } from './types'

/**
 * The state of the matching prototype and every way it changes.
 *
 * Pure: a reducer over plain data, held in memory by the page and nowhere else.
 * No storage, no network. The other person's side is simulated by explicit
 * actions (`they…`) that only the Prototype controls send; nothing here
 * pretends to be a person acting on its own.
 *
 * The rules the tests hold (tests/prototype/flow.test.ts):
 *  - a conversation opens only when both people have chosen each other;
 *  - mutual interest never turns on a photo in either direction;
 *  - a photo is shared per conversation and per direction, by its owner only;
 *  - the people shown are fixed once, at most three, never refilled;
 *  - a person who passed, was blocked or was disconnected is never shown again,
 *    unless the tester undoes a pass straight away (`undo`, below);
 *  - interest can be withdrawn only before a conversation exists, and a conversation
 *    that has ended or been blocked is never reopened by anything;
 *  - nothing the tester chose, passed, withdrew or ignored is readable from the other side.
 */

export type Stage = 'front' | 'about' | 'point' | 'words' | 'review' | 'suggestions' | 'suggestion' | 'people' | 'conversation' | 'notes'

/**
 * The setup steps for the six points. One point to a step; the groups are data, so
 * pairing two points on a step later is a change to this list and nothing else.
 */
export const POINT_STEPS: CriterionId[][] = CRITERION_IDS.map((c) => [c])
/** About you, each point step, and the written answers. Review comes after and is not numbered. */
export const SETUP_STEPS = POINT_STEPS.length + 2

export interface DraftAsk {
  accept: string[]
  firm: Firmness | null
}

export interface Me {
  side: Side | null
  scenario: ScenarioId | null
  name: string
  age: string
  answers: Partial<Answers>
  asks: Record<CriterionId, DraftAsk>
  words: [string, string, string]
}

export type Decision = 'undecided' | 'interested' | 'passed' | 'blocked'

export interface Message {
  n: number
  from: 'you' | 'them'
  text: string
}

export interface Link {
  status: 'open' | 'ended' | 'blocked'
  messages: Message[]
  /** Whether the tester has chosen to share a photo placeholder in this conversation. */
  youShare: boolean
}

export interface Report {
  person: PersonId
  reason: string
  note: string
}

export type SheetKind = 'disconnect' | 'block' | 'report'

/** What the last transition was, for the status line on Your people and on a suggestion. One at a time. */
export type NoticeKind = 'interest' | 'withdrawn' | 'undone' | 'mutual' | 'ended' | 'blocked'
export interface Notice {
  kind: NoticeKind
  person: PersonId
}

export interface Session {
  stage: Stage
  /** The suggestion or conversation on screen. */
  focus: PersonId | null
  /** Which setup step the `point` stage shows: an index into POINT_STEPS. */
  point: number
  /** True when a setup step was opened from Review: Continue and Back return there. */
  editing: boolean
  /** Where the notes page returns to. */
  from: Stage
  /** The screen that opened the profile on screen: Back from the profile returns there. */
  origin: Stage
  me: Me
  /** Fixed when the suggestions are first shown; never refilled. */
  shown: PersonId[]
  decision: Record<PersonId, Decision>
  /** The simulated other person, as the Prototype controls set it. */
  they: Record<PersonId, { interestedInYou: boolean; sharePhoto: boolean }>
  links: Record<PersonId, Link>
  sheet: { kind: SheetKind; person: PersonId } | null
  reports: Report[]
  /**
   * The one person whose “Not for me” can be undone right now, or null. Set by that
   * choice, used by `undoPass`, and ended only by the explicit rules in UNDO_POLICY.
   * There is no timer: nothing about it depends on time, focus, scrolling or what
   * the screen shows.
   */
  undo: PersonId | null
  notice: Notice | null
}

/**
 * Once the tester has chosen or passed on anyone, what they asked for is read-only
 * until a fresh start: a changed requirement must not quietly reshape a list they
 * have already acted on.
 */
export const locked = (s: Session): boolean => Object.values(s.decision).some((d) => d !== 'undecided')

const emptyAsk = (): DraftAsk => ({ accept: [], firm: null })

export const emptyMe = (): Me => ({
  side: null,
  scenario: null,
  name: '',
  age: '',
  answers: {},
  asks: { timeline: emptyAsk(), children: emptyAsk(), practice: emptyAsk(), city: emptyAsk(), work: emptyAsk(), household: emptyAsk() },
  words: ['', '', ''],
})

export const initial = (): Session => ({
  stage: 'front',
  focus: null,
  point: 0,
  editing: false,
  from: 'front',
  origin: 'suggestions',
  me: emptyMe(),
  shown: [],
  decision: {},
  they: {},
  links: {},
  sheet: null,
  reports: [],
  undo: null,
  notice: null,
})

export type Action =
  | { type: 'start'; side: Side; scenario?: ScenarioId }
  | { type: 'go'; stage: Stage; focus?: PersonId; point?: number; editing?: boolean }
  | { type: 'name'; value: string }
  | { type: 'age'; value: string }
  | { type: 'answer'; id: CriterionId; value: string }
  | { type: 'accept'; id: CriterionId; option: string; on: boolean }
  | { type: 'firm'; id: CriterionId; value: Firmness }
  | { type: 'words'; index: 0 | 1 | 2; value: string }
  | { type: 'show' }
  | { type: 'decide'; person: PersonId; choice: 'interested' | 'passed' }
  | { type: 'withdraw'; person: PersonId }
  | { type: 'undoPass'; person: PersonId }
  | { type: 'send'; person: PersonId; text: string }
  | { type: 'sharePhoto'; person: PersonId }
  | { type: 'stopSharing'; person: PersonId }
  | { type: 'theyChoose'; person: PersonId; on: boolean }
  | { type: 'theySend'; person: PersonId; text: string }
  | { type: 'theyShare'; person: PersonId; on: boolean }
  | { type: 'theyEnd'; person: PersonId }
  | { type: 'openSheet'; kind: SheetKind; person: PersonId }
  | { type: 'closeSheet' }
  | { type: 'disconnect'; person: PersonId }
  | { type: 'block'; person: PersonId }
  | { type: 'report'; person: PersonId; reason: string; note: string }
  | { type: 'reset' }

/** What the tester has said, as the whole of `Self`, or null while something is missing. */
export function completeSelf(me: Me): Self | null {
  if (!me.side) return null
  const answers = {} as Answers
  const asks = {} as Asks
  for (const c of CRITERION_IDS) {
    const a = me.answers[c]
    const k = me.asks[c]
    if (!a || !k.firm) return null
    if (k.firm !== 'any' && k.accept.length === 0) return null
    answers[c] = a
    asks[c] = { accept: k.firm === 'any' ? [] : k.accept, firm: k.firm } satisfies Ask
  }
  return { side: me.side, answers, asks }
}

export const missingAbout = (me: Me): string[] => {
  const out: string[] = []
  if (!me.name.trim()) out.push('a made-up first name')
  const age = Number(me.age)
  if (!Number.isInteger(age) || age < 18 || age > 99) out.push('a made-up age, 18 or over')
  return out
}

export type PointGap = 'answer' | 'accept' | 'firm'

/** What is still missing on one point. Answers that would work are not needed when the point does not matter. */
export const missingPoint = (me: Me, id: CriterionId): PointGap[] => {
  const out: PointGap[] = []
  if (!me.answers[id]) out.push('answer')
  const k = me.asks[id]
  if (k.firm !== 'any' && k.accept.length === 0) out.push('accept')
  if (!k.firm) out.push('firm')
  return out
}

export const missingPoints = (me: Me): CriterionId[] => CRITERION_IDS.filter((c) => missingPoint(me, c).length > 0)

export const missingWords = (me: Me): string[] => {
  const out: string[] = []
  if (!me.words[0].trim()) out.push('the first answer')
  if (!me.words[1].trim()) out.push('the second answer')
  if (me.words.some((w) => looksLikeContact(w))) out.push('a way to reach you, which belongs in a conversation and not here')
  return out
}

const peopleOf = (s: Session) => (s.me.side ? peopleFor(s.me.side) : [])

/** Open the conversation if both have chosen, and it is not already open, ended or blocked. */
function openIfMutual(s: Session, person: PersonId): Session {
  if (s.links[person]) return s
  if (s.decision[person] !== 'interested') return s
  if (!s.they[person]?.interestedInYou) return s
  return {
    ...s,
    links: { ...s.links, [person]: { status: 'open', messages: [], youShare: false } },
    // Mutual interest never shares a photo, in either direction.
    they: { ...s.they, [person]: { ...s.they[person], sharePhoto: false } },
    notice: { kind: 'mutual', person },
  }
}

const withLink = (s: Session, person: PersonId, f: (l: Link) => Link): Session => {
  const l = s.links[person]
  if (!l || l.status !== 'open') return s
  return { ...s, links: { ...s.links, [person]: f(l) } }
}

const nextN = (l: Link) => (l.messages.at(-1)?.n ?? 0) + 1

/**
 * What each action does to the pending undo, written out for every action so that
 * adding one without deciding is a type error.
 *  - keep: the simulated person acting (Prototype controls). The tester did nothing.
 *  - clear: any deliberate act of the tester (an edit, a decision, leaving the screen,
 *    a safety action). A `go` to the screen already shown is not leaving it.
 *  - own: the action sets or uses the undo itself (`decide`, `withdraw`, `undoPass`).
 * Focus movement, scrolling and opening a disclosure send no action at all, so none
 * of them can end an undo.
 */
export const UNDO_POLICY: Record<Action['type'], 'keep' | 'clear' | 'own'> = {
  start: 'clear',
  reset: 'clear',
  go: 'clear',
  name: 'clear',
  age: 'clear',
  answer: 'clear',
  accept: 'clear',
  firm: 'clear',
  words: 'clear',
  show: 'clear',
  decide: 'own',
  withdraw: 'own',
  undoPass: 'own',
  send: 'clear',
  sharePhoto: 'clear',
  stopSharing: 'clear',
  theyChoose: 'keep',
  theySend: 'keep',
  theyShare: 'keep',
  theyEnd: 'keep',
  openSheet: 'clear',
  closeSheet: 'clear',
  disconnect: 'clear',
  block: 'clear',
  report: 'clear',
}

/**
 * Whether a person’s profile may be shown: not once they are blocked or a conversation with
 * them has ended. Their profile is for people the tester has not closed the door on.
 */
const profileOpen = (s: Session, id: PersonId): boolean => s.decision[id] !== 'blocked' && (s.links[id]?.status ?? 'open') === 'open'

const navigates = (s: Session, a: Extract<Action, { type: 'go' }>): boolean =>
  a.stage !== s.stage || (a.focus ?? s.focus) !== s.focus || (a.point ?? s.point) !== s.point

export function reduce(s: Session, a: Action): Session {
  const next = step(s, a)
  if (next === s) return s
  const policy = UNDO_POLICY[a.type]
  if (policy !== 'clear' || (a.type === 'go' && !navigates(s, a))) return next
  // Ends the undo, and the last status line unless this action wrote a new one.
  return { ...next, undo: null, notice: next.notice === s.notice ? null : next.notice }
}

function step(s: Session, a: Action): Session {
  switch (a.type) {
    case 'reset':
      return initial()

    case 'start': {
      const me = emptyMe()
      me.side = a.side
      if (a.scenario) {
        const sc = scenarioOf(a.scenario)
        me.scenario = sc.id
        me.name = SAMPLE_NAME[a.side]
        me.age = String(sc.age)
        me.answers = { ...sc.answers }
        for (const c of CRITERION_IDS) me.asks[c] = { accept: [...sc.asks[c].accept], firm: sc.asks[c].firm }
        me.words = [sc.words[0] ?? '', sc.words[1] ?? '', sc.words[2] ?? '']
      }
      const they: Session['they'] = {}
      for (const p of peopleFor(a.side)) they[p.id] = { interestedInYou: p.interestedInYou, sharePhoto: false }
      return { ...initial(), stage: 'about', from: 'about', me, they }
    }

    case 'go': {
      const setup = a.stage === 'about' || a.stage === 'point' || a.stage === 'words'
      const target = a.focus ?? s.focus
      if (a.stage === 'suggestion' && target && !profileOpen(s, target)) return s
      return {
        ...s,
        // A profile remembers the screen that opened it; the notes page and the profile itself do not count.
        origin: a.stage === 'suggestion' && s.stage !== 'suggestion' && s.stage !== 'notes' ? s.stage : s.origin,
        stage: a.stage,
        focus: a.focus ?? s.focus,
        point: a.point ?? s.point,
        editing: a.editing ?? (setup || a.stage === 'notes' ? s.editing : false),
        sheet: null,
        from: a.stage === 'notes' ? s.stage : s.from,
      }
    }

    case 'name':
      return { ...s, me: { ...s.me, name: a.value } }
    case 'age':
      return { ...s, me: { ...s.me, age: a.value } }

    case 'answer':
      return locked(s) ? s : { ...s, me: { ...s.me, answers: { ...s.me.answers, [a.id]: a.value } } }

    case 'accept': {
      if (locked(s)) return s
      const cur = s.me.asks[a.id]
      const accept = a.on ? [...new Set([...cur.accept, a.option])] : cur.accept.filter((o) => o !== a.option)
      return { ...s, me: { ...s.me, asks: { ...s.me.asks, [a.id]: { ...cur, accept } } } }
    }

    case 'firm': {
      if (locked(s)) return s
      const cur = s.me.asks[a.id]
      return { ...s, me: { ...s.me, asks: { ...s.me.asks, [a.id]: { ...cur, firm: a.value } } } }
    }

    case 'words': {
      const words = [...s.me.words] as Me['words']
      words[a.index] = a.value
      return { ...s, me: { ...s.me, words } }
    }

    case 'show': {
      const me = completeSelf(s.me)
      if (!me || !s.me.side) return s
      if (locked(s)) return { ...s, stage: 'suggestions' }
      const { shown } = evaluate(me, peopleFor(s.me.side))
      const decision: Session['decision'] = {}
      for (const p of shown) decision[p.id] = 'undecided'
      return { ...s, stage: 'suggestions', shown: shown.map((p) => p.id), decision }
    }

    case 'decide': {
      if (!s.shown.includes(a.person) || s.decision[a.person] !== 'undecided') return s
      const next: Session = {
        ...s,
        decision: { ...s.decision, [a.person]: a.choice },
        stage: 'people',
        focus: a.person,
        undo: a.choice === 'passed' ? a.person : null,
        notice: a.choice === 'interested' ? { kind: 'interest', person: a.person } : null,
      }
      return a.choice === 'interested' ? openIfMutual(next, a.person) : next
    }

    // Before a conversation exists, and only then. Whether it was a choice made first or
    // second, an open conversation is left only by disconnecting or blocking.
    case 'withdraw': {
      if (s.decision[a.person] !== 'interested' || s.links[a.person]) return s
      return { ...s, decision: { ...s.decision, [a.person]: 'undecided' }, undo: null, notice: { kind: 'withdrawn', person: a.person } }
    }

    case 'undoPass': {
      if (s.undo !== a.person || s.decision[a.person] !== 'passed' || s.links[a.person]) return s
      return { ...s, decision: { ...s.decision, [a.person]: 'undecided' }, undo: null, notice: { kind: 'undone', person: a.person } }
    }

    case 'theyChoose': {
      if (!s.they[a.person] || s.links[a.person]) return s
      const next: Session = { ...s, they: { ...s.they, [a.person]: { ...s.they[a.person], interestedInYou: a.on } } }
      return a.on ? openIfMutual(next, a.person) : next
    }

    case 'send': {
      const text = a.text.trim()
      if (!text) return s
      return withLink(s, a.person, (l) => ({ ...l, messages: [...l.messages, { n: nextN(l), from: 'you', text }] }))
    }

    case 'theySend':
      return withLink(s, a.person, (l) => ({ ...l, messages: [...l.messages, { n: nextN(l), from: 'them', text: a.text }] }))

    case 'sharePhoto':
      return withLink(s, a.person, (l) => ({ ...l, youShare: true }))
    case 'stopSharing':
      return withLink(s, a.person, (l) => ({ ...l, youShare: false }))

    case 'theyShare': {
      if (!s.links[a.person] || s.links[a.person].status !== 'open') return s
      return { ...s, they: { ...s.they, [a.person]: { ...s.they[a.person], sharePhoto: a.on } } }
    }

    case 'openSheet':
      return { ...s, sheet: { kind: a.kind, person: a.person } }
    case 'closeSheet':
      return { ...s, sheet: null }

    case 'disconnect':
    case 'theyEnd': {
      const l = s.links[a.person]
      if (!l || l.status !== 'open') return { ...s, sheet: null }
      return endLink(s, a.person, 'ended')
    }

    case 'block': {
      const l = s.links[a.person]
      const next: Session = {
        ...s,
        decision: { ...s.decision, [a.person]: 'blocked' },
        sheet: null,
        stage: s.stage === 'conversation' || s.stage === 'suggestion' ? 'people' : s.stage,
        focus: a.person,
        notice: { kind: 'blocked', person: a.person },
      }
      return l ? endLink(next, a.person, 'blocked') : next
    }

    case 'report':
      return { ...s, reports: [...s.reports, { person: a.person, reason: a.reason, note: a.note.trim() }], sheet: null }
  }
}

/** Ends a conversation: the thread is dropped from view and neither photo is shown. */
function endLink(s: Session, person: PersonId, status: 'ended' | 'blocked'): Session {
  return {
    ...s,
    sheet: null,
    // Leaves the conversation or the profile it was reached from, as a block does.
    stage: s.stage === 'conversation' || s.stage === 'suggestion' ? 'people' : s.stage,
    links: { ...s.links, [person]: { status, messages: [], youShare: false } },
    they: { ...s.they, [person]: { ...s.they[person], sharePhoto: false } },
    focus: person,
    notice: { kind: status === 'blocked' ? 'blocked' : 'ended', person },
  }
}

/** Who is on the list the tester sees as "still to decide". */
export const undecided = (s: Session): PersonId[] => s.shown.filter((id) => s.decision[id] === 'undecided')
export const chosenPrivately = (s: Session): PersonId[] => s.shown.filter((id) => s.decision[id] === 'interested' && !s.links[id])
export const openLinks = (s: Session): PersonId[] => s.shown.filter((id) => s.links[id]?.status === 'open')
export const visibleSuggestions = (s: Session): PersonId[] => s.shown.filter((id) => s.decision[id] === 'undecided')

export const person = (s: Session, id: PersonId) => peopleOf(s).find((p) => p.id === id)
