/**
 * The tools that have an address of their own.
 *
 * Until 2026-09-17 every screen in Niyyah lived behind one URL. A link with
 * `?read` on it opened the read, and then the query was stripped and the
 * address bar said `/` for the rest of the visit — so a reload landed on
 * Welcome, the address bar copied into a chat sent the homepage, and a shared
 * link previewed as the homepage. That is fine for a member who lives here and
 * wrong for the person the read was built for: a woman who was handed it by a
 * friend, wants to know what it is before she trusts it, and might pass it on.
 *
 * So the read and the eleven get paths. Three of them, one per way in, and the
 * only place they are defined is this table. `src/lib/entry.ts` recognises
 * them, `src/lib/links.ts` mints them, `src/App.tsx` keeps the address bar on
 * them, and `vite.config.ts` writes one HTML document per row at build time so
 * that a fresh visit, a reload and a messaging app's preview all read the
 * tool's own title and description with no JavaScript run.
 *
 * Two reads rather than one because the address is the preview: a link that
 * says "is he serious" in it is understood before it is opened, and the person
 * arriving through it is not asked who they are reading about. `about` is the
 * person read; the reader is the other side, and `READER_OF` is the chooser's
 * rule (`Read.tsx`) written down once. The eleven has no `about` — it is asked
 * on arrival, as it always was.
 *
 * `families` joined this table on 2026-09-21, for the same reason the first
 * three did rather than a new one: the audit that added it found it still
 * minted as a query-only link (`?families`), which carries no static preview
 * of its own. It has no `about`; a person arrives at the family words for
 * themself, not to read someone else. See `docs/DESIGN.md`.
 *
 * `via` is what a share of the blank tool records: the same id the invitation
 * row already uses for the same gesture (`src/data/invite.ts`). No new id,
 * because splitting a young channel into two cells under the k-floor makes both
 * read null for longer, and because `via` names the kind of thing that carried
 * the link — "a friend handed you the instrument" is what `words` and `eleven`
 * already mean.
 *
 * No imports, on purpose: `vite.config.ts` loads this file at build time under
 * `tsconfig.node.json`, which has no `vite/client` types and must not reach
 * `src/lib/site.ts`. The literal unions here are pinned to their `src/lib`
 * twins by `src/lib/entry.ts` (`satisfies`) and `tests/tools.test.ts`.
 */

export type ToolSlug = 'is-he-serious' | 'is-she-serious' | 'before-you-say-yes' | 'families'

/** Which side a person is. Assignable to `Gender` in src/types.ts. */
export type ToolSide = 'woman' | 'man'

export interface Tool {
  slug: ToolSlug
  /** The instrument the path opens. Assignable to `InstrumentKind` in src/lib/entry.ts. */
  kind: 'read' | 'eleven' | 'families'
  /** The person being read. Absent for the eleven, which asks on arrival. */
  about?: ToolSide
  /** `<title>`, and the title a messaging app shows under the link. */
  title: string
  /** The meta description, and the line a messaging app shows under the title. */
  description: string
  /** The sentence sent beside the link from "Share this tool". */
  share: string
  /** What kind of link a share of this tool is. An existing id in `VIAS`. */
  via: 'words' | 'eleven' | 'family'
}

export const TOOLS_BASE = '/tools/'

export const TOOLS: Tool[] = [
  {
    slug: 'is-he-serious',
    kind: 'read',
    about: 'man',
 title: 'Is he serious? — a ninety-second read on what he has done',
    description:
      'Twelve questions about behaviour, not promises — who knows you exist, what happens when you stop texting first, how he handles a hard conversation. One read, and the one question worth asking him next. No account. Nothing about him is asked by name.',
    share:
 'Talking to someone? This reads what he’s done — not what he says — in ninety seconds, and gives you the one question to ask him next. Built for us. No account.',
    via: 'words',
  },
  {
    slug: 'is-she-serious',
    kind: 'read',
    about: 'woman',
 title: 'Is she serious? — a ninety-second read on what she has done',
    description:
      'Twelve questions about behaviour, not promises — who knows you exist, what happens when you stop texting first, how she handles a hard conversation. One read, and the one question worth asking her next. No account. Nothing about her is asked by name.',
    share:
 'Talking to someone? This reads what she’s done — not what she says — in ninety seconds, and gives you the one question to ask her next. Built for us. No account.',
    via: 'words',
  },
  {
    slug: 'before-you-say-yes',
    kind: 'eleven',
    title: 'Before you say yes — the eleven conversations to have first',
    description:
      'The eleven conversations Somali couples rarely have before the families are involved — where you’d live, money sent home, hooyo in the house, a second wife. Two minutes to see which you two have had, and the words to open the one that matters. No account.',
    share:
      'Before you say yes — the eleven conversations most of us have too late: where you’d live, money home, a second wife. This asks which ones you two have had, and gives you the words to open the one that matters. Two minutes. No account.',
    via: 'eleven',
  },
  {
    slug: 'families',
    kind: 'families',
    title: 'Bringing the families in — the words, word for word',
    description:
      'The conversations with your family, written to be said out loud by a real person — not read off a card. No account, nothing recorded.',
    share: 'The conversations with your family, word for word. No account.',
    via: 'family',
  },
]

/** The reader is the other side of the person read — the chooser's rule, in one place. */
export const READER_OF: Record<ToolSide, ToolSide> = { man: 'woman', woman: 'man' }

export function toolPath(slug: ToolSlug): string {
  return `${TOOLS_BASE}${slug}`
}

/**
 * The tool a path names, if any. One trailing slash is tolerated because a
 * host's "pretty URLs" may add one; nothing else is — `/tools/is-he-serious/x`
 * is not a tool.
 */
export function toolFromPath(pathname: string): Tool | undefined {
  const clean = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
  return TOOLS.find((t) => toolPath(t.slug) === clean)
}

/** The tool a screen is showing, for the address bar. */
export function toolFor(kind: 'read' | 'eleven', reader?: ToolSide): Tool | undefined {
  if (kind === 'eleven') return TOOLS.find((t) => t.kind === 'eleven')
  if (!reader) return undefined
  return TOOLS.find((t) => t.kind === 'read' && t.about === READER_OF[reader])
}

/**
 * The guide: the eleven conversations as a page to read and print, at an
 * address of its own, and a one-page sample of three of them.
 *
 * Built for the person a mosque or a counselling service hands it to — a
 * couple, or one half of one, who already know each other and are about to
 * involve the families. So it is written in a voice for two readers, says on
 * page one who made it and what it does and does not record, and names every
 * topic including qabiil and a second wife before anyone has to discover them.
 * Written from src/data/eleven.ts at build time (src/lib/guidePages.ts); no
 * app runs on it, nothing is counted when it is opened.
 *
 * `sample` is the three the outreach asked for: where you would live, their
 * family in your home, money sent home. One printed page.
 */
export interface Guide {
  path: string
  samplePath: string
  title: string
  description: string
  sampleTitle: string
  sampleDescription: string
  /** Topic ids from src/data/eleven.ts, in the order the sample prints them. */
  sample: string[]
  /** The interactive version, for the link at the foot of the page. */
  toolSlug: ToolSlug
}

export const GUIDE: Guide = {
  path: '/guides/before-you-say-yes',
  samplePath: '/guides/before-you-say-yes/sample',
  title: 'Before you say yes — the eleven conversations to have before the families do',
  description:
    'The eleven conversations Somali couples rarely have before the families are involved — where you’d live, their family in your home, money sent home, children, deen day to day, the aroos and the mahr, qabiil, going back, a second wife, when the families disagree. Each one with why it matters, the words to open it, and what to listen for. Free, no account, nothing recorded. Made by Niyyah.',
  sampleTitle: 'Before you say yes — three of the eleven conversations, a sample',
  sampleDescription:
    'Three of the eleven conversations to have before the families do — where you’d live, their family in your home, money sent home — each with why it matters, the words to open it, and what to listen for. A one-page sample of the full guide. Free, no account, nothing recorded. Made by Niyyah.',
  sample: ['live', 'his-family-in-home', 'money-home'],
  toolSlug: 'before-you-say-yes',
}
