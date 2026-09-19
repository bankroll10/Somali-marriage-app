/**
 * Links into Niyyah, read before anything renders.
 *
 * Three kinds of link carry a code: `?map=` brings a kept map back, `?couple=`
 * is him opening the eleven she sent, `?vouch=` is a family member arriving to
 * vouch. Three more carry none and simply open an instrument: `?read`,
 * `?eleven`, `?families`. They exist because the thing that travels between
 * people here is the words — a friend sends a friend the exact question that
 * worked — and the person who receives them should land on the instrument,
 * not on a front door. None of them needs an account. The last, `?door`, is
 * for the person who is looking rather than talking — every instrument
 * presumes someone on the other side, and a man sent here because he is
 * single had nowhere to land (docs/MACHINE.md). It opens on the number.
 *
 * Any link may also carry `?via=`: what kind of thing carried it — words, the
 * eleven, a couple's link, the door, a family link, a link from someone this
 * worked for, or a link shared into a community's group rather than sent to
 * one person. Never who sent it. It is the only attribution this product
 * records, and it is validated here so that nothing else can ride along under
 * that name. `group` is the one the first forty are found through — see
 * docs/WEDGE.md — and it names the kind of room, never the room. Its three
 * siblings — `alumni`, `professional`, `mosque` — name the kind of room more
 * exactly, because the eight-week rule pivots "channel first" and a single
 * `group` cell could not tell which kind of room produced the men
 * (docs/BOARD.md). A kind of room is still not a person, and never which
 * room; added before the first post because it cannot be retrofitted.
 *
 * `press` is the eleventh, and it is a third kind rather than a finer split of
 * the second. The first six name a link one person sent another; the four
 * above name a kind of room somebody posted into; `press` names a publication
 * that printed the link — never which publication, exactly as a room kind
 * never names the room. It exists because an article is not a room: nobody in
 * it was asked by name, the readership is whatever the publication has, and it
 * is read from anywhere in the world. Filed as `group` it would sit in the one
 * cell docs/WEDGE.md's eight-week rule reads — `sidesByVia.man.group.arrived`
 * — and the pivot on the wedge channel would be decided partly by strangers
 * who never saw the wedge. Added on 2026-09-19 for the same reason as the
 * three above and with the same urgency: an article link is minted once, into
 * an archive, and there is no second chance to tag it (docs/ASSETS.md).
 *
 * Since 2026-09-17 three of the instruments also have a path — `/tools/…`,
 * defined once in src/data/tools.ts — so that a link can be understood before
 * it is opened and survives a reload. A path is recognised here too, before
 * the query, because a tool path is minted deliberately and no link this
 * product hands out puts a code on one. The query-string forms stay, unchanged,
 * for every link already sitting in someone's messages.
 *
 * This is the one place links are recognised, so main.tsx can dispatch without
 * a router and the query string can be cleaned before React reads storage.
 */
import { TOOLS, toolFor, toolFromPath, toolPath, type ToolSide } from '../data/tools'

export type CodedKind = 'map' | 'couple' | 'vouch'
export type InstrumentKind = 'read' | 'eleven' | 'families' | 'door'
export type EntryKind = CodedKind | InstrumentKind

// The tools table is import-free so the build can load it; this is what keeps
// its literal kinds from drifting from the ones recognised here.
TOOLS satisfies { kind: InstrumentKind }[]

export type Via = 'words' | 'eleven' | 'couple' | 'door' | 'family' | 'married' | 'group' | 'alumni' | 'professional' | 'mosque' | 'press'
/** Must match netlify/shared/vocab.ts VIAS. */
export const VIAS: Via[] = ['words', 'eleven', 'couple', 'door', 'family', 'married', 'group', 'alumni', 'professional', 'mosque', 'press']

export interface Entry {
  kind: EntryKind
  /** Present for map, couple and vouch; the instruments carry none. */
  code?: string
  /** What kind of link this was — never who sent it. */
  via?: Via
  /**
   * The person being read, when the path said so (`/tools/is-he-serious` is
   * about a man). The reader is the other side. Only a tool path sets it.
   */
  about?: ToolSide
}

/** Coded kinds first, so a link mangled into two still restores the map. */
const CODED: CodedKind[] = ['map', 'couple', 'vouch']
const INSTRUMENTS: InstrumentKind[] = ['read', 'eleven', 'families', 'door']

/** Normalise what a human or a messaging app did to a code. */
export function normaliseCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

function viaOf(params: URLSearchParams): Via | undefined {
  const raw = params.get('via')
  return raw && (VIAS as string[]).includes(raw) ? (raw as Via) : undefined
}

export function entryFromUrl(search: string, pathname = '/'): Entry | null {
  let params: URLSearchParams
  try {
    params = new URLSearchParams(search)
  } catch {
    return null
  }
  const via = viaOf(params)
  const tool = toolFromPath(pathname)
  if (tool) return { kind: tool.kind, ...(tool.about ? { about: tool.about } : {}), ...(via ? { via } : {}) }
  for (const kind of CODED) {
    const raw = params.get(kind)
    if (raw === null) continue
    const code = normaliseCode(raw)
    if (code) return { kind, code, ...(via ? { via } : {}) }
  }
  // `?read` and `?read=1` both open the read; the value is ignored.
  for (const kind of INSTRUMENTS) {
    if (params.has(kind)) return { kind, ...(via ? { via } : {}) }
  }
  // A bare `?via=` with no kind is not a link we ever mint.
  return null
}

/**
 * The path the address bar should show for a screen, or nothing.
 *
 * `'/'` when a screen that is not a tool is shown while the bar still says a
 * tool — never otherwise, so a screen change elsewhere in the app does not
 * touch history at all. `undefined` for the read before the reader is known:
 * the bar is left alone until the chooser answers, rather than guessing.
 */
export function pathFor(screen: string, reader: ToolSide | undefined, current: string): string | undefined {
  if (screen === 'read' || screen === 'beforeYes') {
    const tool = toolFor(screen === 'read' ? 'read' : 'eleven', reader)
    return tool ? toolPath(tool.slug) : undefined
  }
  return toolFromPath(current) ? '/' : undefined
}
