# Niyyah — the asset catalogue

Every public thing this product hands to a stranger, with its verified URL,
its status and the date someone last opened it; the placement ledger; and the
content rules for the money conversation sheets.

## The rule

**An address is not used in a pitch, a post or a room until it is live and
checked.** Three pitches went out on 2026-09-17 carrying placeholder URLs
because no single file said which addresses were verified. This is that file,
and no task invents a public URL from a proposed slug.

An asset is **live and checked** only when a person has opened it on a device
with no session, not when it builds, merges or deploys; the date is that
opening. Everything else is a claim. The check is a session-less `curl -sI`
answering 200, not 301 (`docs/OPS.md`).

Statuses: **live and checked** · **live with a blocker** · **built, not yet
checked** (at a real URL, opened by nobody without a session) · **advertised
but not fully inspected** · **proposed** · **retired**. Only the first goes
in a pitch.

`tests/guides.test.ts` fails if a tool in `src/data/tools.ts` or either guide
page has no URL here. A new asset does not ship without a row.

## The assets

| ID | What it is | URL | Status | Last checked |
|---|---|---|---|---|
| **N1a** | *Is he serious?* — the read, for a woman reading a man | `https://joinniyyah.com/tools/is-he-serious` | **live and checked** | 2026-09-17 |
| **N1b** | *Is she serious?* — the same read, for a man reading a woman | `https://joinniyyah.com/tools/is-she-serious` | **live and checked** | 2026-09-17 |
| **N1c** | The eleven, interactive, with the two-sided sheet | `https://joinniyyah.com/tools/before-you-say-yes` | **live and checked** | 2026-09-17 |
| **N4** | Bringing the families in — the family words, at their own address | `https://joinniyyah.com/tools/families` | **built, not yet checked** | — |
| **N2** | The eleven, to read and print, in a voice for two readers | `https://joinniyyah.com/guides/before-you-say-yes` | **live and checked** | 2026-09-17 |
| **N2s** | Three of the eleven on one Letter page — the sample for a pitch | `https://joinniyyah.com/guides/before-you-say-yes/sample` | **live and checked** | 2026-09-17 |
| **N3** | The money conversation — four printed pages, room to write | `https://joinniyyah.com/niyyah-money-conversation-sheet.html` | **live and checked** | 2026-09-20 |
| **N3-1page** | The same twenty questions on one printed page | `https://joinniyyah.com/niyyah-money-conversation-sheet-1page.html` | **live and checked** | 2026-09-20 |
| **N3-note** | A half-page note for whoever hands N3 to a couple | `https://joinniyyah.com/niyyah-money-conversation-sheet-facilitator-note.html` | **live and checked** | 2026-09-20 |
| **N3-so** | The money conversation in Somali, four pages, founder-approved | `https://joinniyyah.com/niyyah-money-conversation-sheet-so.html` | **live and checked** | 2026-09-20 |
| **N3-1page-so** | The Somali version on one printed page | `https://joinniyyah.com/niyyah-money-conversation-sheet-1page-so.html` | **live and checked** | 2026-09-20 |
| **N3-pdf** | N3 as a Letter PDF, four pages | `https://joinniyyah.com/niyyah-money-conversation-sheet.pdf` | **live and checked** | 2026-09-25 |
| **N3-1page-pdf** | N3-1page as a Letter PDF, one page | `https://joinniyyah.com/niyyah-money-conversation-sheet-1page.pdf` | **live and checked** | 2026-09-25 |
| **N3-note-pdf** | N3-note as a Letter PDF, one page | `https://joinniyyah.com/niyyah-money-conversation-sheet-facilitator-note.pdf` | **live and checked** | 2026-09-25 |
| **N3-so-pdf** | N3-so as a Letter PDF, four pages | `https://joinniyyah.com/niyyah-money-conversation-sheet-so.pdf` | **built, not yet checked** | — |
| **N3-1page-so-pdf** | N3-1page-so as a Letter PDF, one page | `https://joinniyyah.com/niyyah-money-conversation-sheet-1page-so.pdf` | **built, not yet checked** | — |

N0, the door's tool page (`/tools/door`), was retired with the door on
2026-09-24; the id is not reused.

The `/tools/` pages are rows in `src/data/tools.ts`, written at build time by
`src/lib/toolPages.ts`; the `/guides/` pages are its `GUIDE.path` and
`GUIDE.samplePath`, written by `src/lib/guidePages.ts`. The N3 family are
static files in `public/`, with plain-text twins (`…-sheet.txt`,
`…-sheet-so.txt`, `…-facilitator-note.txt`) for pasting into an email.

| ID | The problem it answers | Who | What they leave with | Next step |
|---|---|---|---|---|
| N1a / N1b | "I have been talking to someone for months and cannot tell if this is going anywhere." | A Somali adult talking to a specific person | A read of what the other person has done, in bands, with the thinnest ground named | The one question to ask next, word for word, or the guide |
| N1c | "We are getting serious and I do not know what we have not discussed." | A Somali adult deciding about a specific person | Which of the eleven they have had, and which is open | The one to open this week, or the two-sided sheet sent to the other person |
| N4 | "How do I say this to my family?" | Someone about to bring the families in | The family conversations, written to be said aloud | Saying one; the app asks later whether they did |
| N2 | "What should a couple talk about before the families get involved?" | A couple, and the coordinator handing it to them | All eleven, each with why it is found out too late, the words, and what to listen for | Read it separately, then together; N1c is linked |
| N2s | The same, reviewable in two minutes | A reviewer at a mosque, a service or a resource list | Three conversations, with marking space | The full guide |
| N3 | "What do we each expect about mahr, the wedding, debt and money to relatives?" | Two adults deciding about each other, and whoever hands it over | Twenty questions in four subjects, answered in two columns | Their answers side by side; nothing prescribed or scored |
| N3-note | "How would my counsellors use this?" | A coordinator deciding whether to hand out N3 | When to hand it out, that each fills it separately, that nobody collects it | Attach it beside whichever length fits |

**Naming.** The *Small-Asset Traffic Playbook* (shared 2026-09-17) proposed
`/tools/before-nikah-conversations`. The product calls it *Before you say
yes*, and the eleven are not only for the weeks before a nikah; the addresses
above are the only correct ones.

## Attribution: the kind of link, never the link

**This product ignores UTM parameters.** For attribution `entryFromUrl`
(`src/lib/entry.ts`) reads only `via`, from a closed set of ten ids, and
`src/main.tsx` strips the query before React mounts. Two mosques both arrive
as `mosque`. That stays: a link names the *kind* of room, never the room.

`press` (2026-09-19) is a third kind, not a finer room: a publication's
readers were not asked by name, and filed as `group` they would blur the cell
that says what room posts produce. An article link is minted once, into an
archive, and there is no second chance to tag it, so a via lands in the code
before the pitch that needs it. Per-placement ids would read `null` for months
under the five-person floor (`netlify/shared/floor.ts`). The ledger carries
the placement, the product the kind; arrivals under that via in the week an
acceptance lands are the evidence.

**What can be measured:** arrivals by via, and under each via the rungs
reached (`eleven`, `asked-him`, `he-answered`, `followed-through`) and the
questionnaires begun; arrivals by city; every split floored at five
(`netlify/functions/progress.ts`). **Never:** opens of a static page, return
visits, or anything about a person (`docs/PRIVACY.md`). Do not promise an
institution a report on its own couples.

**How to link.** A room post carries the room's kind (`?via=group`,
`alumni`, `professional`, `mosque`); an article or a station's web page
`?via=press`; a bio the bare path. The guide pages pass their `via` on to the
app. The N3 family carries none (below). Radio cannot carry one; a spoken
address would be a product change made before the first spot airs, not built.

## Placements — the ledger

Every pitch, accepted or not. A placement is **accepted** only when the link
is visible somewhere a stranger could find it.

| Date | Where | Route | Asset | Link sent | Status |
|---|---|---|---|---|---|
| 2026-09-17 | Al-Ansar Islamic Movement of Minnesota, North Minneapolis | email, nikah contact | N2 | `…/guides/before-you-say-yes?via=mosque` | sent, awaiting reply |
| 2026-09-17 | ICSA / Dar Al-Hijrah, Counseling & Family Services | phone, then email | N2 | `…/guides/before-you-say-yes?via=mosque` | sent, awaiting reply |
| 2026-09-17 | The Family & Youth Institute | contact form | N2 | `…/guides/before-you-say-yes?via=group` | sent, awaiting reply |
| 2026-09-17 | Masjid Al-Israa, Fridley | email, nikah coordinator | N2, with N2s attached as a PDF | `…/guides/before-you-say-yes?via=mosque` | sent, awaiting reply |
| 2026-09-18 | Abubakar As-Saddique Islamic Center, Minneapolis | email `aaic@abuubakar.org`, phone 612-871-8600 | N2 + N2s attached, N1c linked | `…/guides/before-you-say-yes?via=mosque` | drafted, not yet sent |
| 2026-09-19 | WardheerNews, worldwide Somali readership | email `admin@wardheernews.com` | N1c | `…/tools/before-you-say-yes?via=press` | topic inquiry sent |
| 2026-09-23 | The Somali American, Minneapolis, "Ask a Scholar" column | contact form (editor) | N1c; N2s linked for the editor | `…/tools/before-you-say-yes?via=press` | drafted, not yet sent |
| 2026-09-23 | KALY-LP 101.7 FM, Somali-language, South Minneapolis | email `Underwriting@kalyradio.org` | none — rate inquiry only | web: `…/tools/before-you-say-yes?via=press`; on air: none | drafted, not yet sent |
| 2026-09-25 | Before the Nikah Institute (Dr. Aneesah Nadir), *Before the Nikah* (13-week virtual course, Sep 14 – Dec 7; finances weeks Oct 5–30) | email, the course's business address | N3-note, N3, N3-1page, their three PDFs, N3-so and N3-1page-so | `…/niyyah-money-conversation-sheet-facilitator-note.html` and the sheets, no via | **replied.** Pitch sent 2026-09-25 (drafted 09-23); she replied the same day with the finances dates and asked for the resource; sent the same day. Ask how it went around Nov 2 (rule 9) |
| 2026-09-24 | Islamic Center of Naperville, IL, matrimonial services (general Muslim couples) | email `matrimonial@icnmasjid.org` | N2, N2s linked | `…/guides/before-you-say-yes?via=mosque` | drafted, not yet sent |
| 2026-09-24 | The Rahma Center, Lake Forest CA, premarital counselling (up to six sessions; US Muslim couples; also runs matchmaking, not pitched) | email `counseling@therahmacenter.org` | N3-note, pointing to N3 and N3-1page; PDFs offered | `…/niyyah-money-conversation-sheet-facilitator-note.html`, no via | sent, awaiting reply |

**Rules the ledger has taught**, each a correction made before a row was
logged:

1. **Every link carries `?via=`**, except the N3 family and radio; without
   it an arrival cannot be told from a stranger typing the domain.
2. **The surface picks the asset.** A coordinator's packet is N2 (N1c is
   linked inside); an article's reader clicks through, so N1c; N2s goes in
   the *pitch* to an editor. **Stagger sends that share a via.**
3. **A Somali-language channel needs a Somali destination.** The eleven is in
   English, so KALY stays a rate inquiry until the eleven has a Somali
   destination or the station says its listeners read English. Ask about its
   talk programming too: unpaid, and in the listeners' language.
4. **An underwriting spot is not an advert.** A noncommercial station almost
   certainly works under FCC underwriting rules: identification, a neutral
   description, an address, no call to action. Confirm with the station.
5. **Exclusivity binds.** WardheerNews takes articles "intended exclusively
   for its readers": new prose, not the public guide rearranged.
6. **Promise only what exists.** The sheets have had PDF twins since
   2026-09-24, rendered in Chromium on Letter from the HTML at the version on
   its footer, after a pitch had offered them. A change to a sheet's HTML
   re-renders its PDF in the same PR; `tests/sheet.test.ts` holds that each
   sheet has one with the right page count.
7. **Send while the handout is useful.** *Before the Nikah* does not publish
   its finances week, so the email asks which it is; business address only;
   the Somali versions get one clause for a US Muslim audience.
8. **A general Muslim room is told which conversations are Somali.** Qabiil,
   going back and a second wife are named in the pitch, so a reviewer is not
   surprised on page two. Its arrivals share `via=mosque` with the Minneapolis
   mosques, so it is not sent in the same week as another mosque pitch.
9. **An N3 pitch has no measure but the reply.** Its links carry no via, and
   nobody counts opens of a static page, so the reply goes here and in
   `docs/RESEARCH.md`. A PDF offered in the pitch is rendered on the day it
   is asked for (rule 6).

Masjid Al-Israa is the only 2026-09-17 send with the sample attached; if it
alone answers, suspect the attachment. The Somali American's newest dated
material was October 2025: send, log, do not wait.

**Who keeps it.** The founder sends; the working session logs what the
founder reports, the day it happens. A reply goes here as an outcome **and**
in `docs/RESEARCH.md` as what was said: two acceptances start A9's eight-week
clock.

Named, not yet approached: the UMN Somali Student Association, the
MuslimMatters money episode team, Amaliah's relationships section, Somali
nikah coordinators and marriage educators. Excluded: `r/SomaliRelationships`,
whose rules prohibit posts that drive traffic.

## The money conversation sheets (N3)

N3 was to ship when a coordinator or a couple asked. Repeated openings for a
mahr guide were that ask; it was built 2026-09-20. Money was already in the
eleven (`money-home`, `aroos-mahr`), and the voice forbids telling a reader
what to decide (`docs/DESIGN.md`). A mahr sheet is dangerous only when it
answers. This one asks.

### What it is

Twenty open questions, five in each of four subjects, answered in two columns,
**Person A** and **Person B**. Each subject ends with two boxes: what we agree
on, and what we are still deciding. Nothing is totalled, rated or scored.

The subjects are kept apart because, collapsed, they trade against each other:
a family's mahr expectation against a wedding budget, a remittance abroad lost
inside "we'll figure money out later".

| # | Subject | What it covers |
|---|---|---|
| 1 | Mahr | What each expects, who has heard it, how much at the nikah and how much deferred, what happens if a family names something different. Not a figure, not a ruling. |
| 2 | The wedding | One-time cost only: who pays for what, whose guests, each person's ceiling, what is cut first and last. Separate from mahr. |
| 3 | Existing debt | What each already owes: monthly payment, time left, whose name, who knows, whether it stays one person's after the nikah. |
| 4 | Ongoing obligations | Money that leaves regularly for people outside the marriage: parents, siblings, relatives here or abroad. The subject most often missing from a sheet like this. |

### Content rules

Pinned by `tests/sheet.test.ts` and `tests/sheet-so.test.ts`, not kept in a
brief.

- **No ruling, no citation:** no fiqh, madhhab, hadith or ayah.
- **No figure:** no amount, range or benchmark, no currency symbol, no digits
  outside the version line. The only numbers are the couple's.
- **No claim about outcomes:** no divorce rates, research or "most couples".
- **No advice:** every line is a question; four add a clarifier, none says
  what to choose.
- **No other name:** Niyyah is the only organisation named; nobody is quoted.
- **No gendered labels:** no husband, wife, groom, bride or single-reader
  pronoun (the rule `tests/guides.test.ts` holds for the eleven).
- **No explaining Somali culture to a Somali reader:** *mahr*, *nikah*,
  *walima* go unglossed; "Somali", "traditionally", "in our culture" never
  appear.

It **records nothing**: no script, form or storage, and a screen-only line
says so before anyone types their debts. It **carries no `via`**: on this
subject an inert page is worth more than the attribution. It fetches nothing,
so it opens from an attachment with the network off. It has **one absolute
link**, to `https://joinniyyah.com/`; its only other links are the screen-only
version switcher (English ↔ Somali, four-page ↔ one-page) as bare sibling
filenames.

### Two lengths, and why

The brief asked for two pages at most, a break between subjects, and lines
tall enough to write on; one file cannot hold all three. The four-page file
keeps the breaks and the room, one subject per page, and can be filled across
four sittings. The one-page file is for seeing, or handing over, the whole
conversation before that sitting. Neither is recommended over the other.
Handing someone the wrong length is its own failure, so each links the other.

### Print rules

Page counts come from headless-Chrome PDF renders. jsdom has no print layout,
so the tests pin the rules that made the numbers true, not the numbers.

- **Declare margins, never a paper size.** Lay out inside A4's width and
  Letter's height; `size: Letter` would crop every A4 print. Re-render after
  every change: a number read back from the CSS proves nothing.
- **Four-page:** each subject starts a page; no question splits across a
  break; transparent ruled boxes with hair borders, black on white.
- **One-page:** two print columns, `break-inside: avoid` on every item, one
  ruled line per question per person, the 9pt floor the founder set. The
  per-question Person A / B labels are real `<label for>` elements, visually
  hidden; one legend says "Person A on the left, Person B on the right".
- **Restate a screen rule in print at the same specificity.** The screen rule
  `.cols input[type='text'] { min-height: 1.9rem }` outranked the bare print
  rule, and 1.9rem recomputed against the 9pt print root (≈23px), so every
  answer row printed nearly three times too tall.
- **Fill the page, not just fit it.** Grow lines into the leftover room,
  watching the bottom slack and rendering each step (column balancing makes
  it non-linear).
- **A label that wraps drops its box.** The English one-page labels are
  "Agreed" and "Still deciding", so both boxes start at the same y. No file
  prints a textarea resize handle.

| File | US Letter | A4 | Measured settings |
|---|---|---|---|
| N3 | 4 pages | 4 pages | answer boxes 11.5mm, agree/still-deciding 15mm |
| N3-1page | 1 page, 4.47mm bottom slack | 1 page, 22.07mm | 5.9mm per question line, 6.9mm per agree/still-deciding line |
| N3-so | 4 pages | 4 pages | retuned: Somali runs longer than English |
| N3-1page-so | 1 page, 3.79mm bottom slack | 1 page | full approved Somali box labels, not shortened |
| N3-note | 1 page, about half (51–55%) | 1 page (48%) | print-only margins and line height |

The four-page count assumes the print dialog's default margins. Margins set by
hand can push it to five; margins applied twice gave eight on A4.

On screen: one column below 700px, every field at the 16px floor that stops
iOS zooming, a real label on every field, a visible focus ring. Typed text is
gone on reload; nothing is stored.

### The facilitator note (N3-note)

"Would your counsellors use this?" hides a harder question: how. The note
says when to hand it out, that each person fills their own column before
comparing, that nobody collects it, which length fits which moment, and that
a Somali version exists. The no-network and one-absolute-link rules apply;
it links all four sheets by their real filenames.

### The Somali versions, and how a Somali line is approved

No Somali sentence reaches a reader until the founder has approved it. In the
app, every Somali sentence sits in `src/data/somali.ts` behind `approved`; an
unapproved line carries `// VERIFY` and never renders
(`tests/somali-gate.test.ts`). A line a native speaker winces at goes back to
`approved: false` that night (`docs/PROTOCOL.md`).

The founder reviewed and approved the sheets' translation on 2026-09-20.
The approved source, never served, is
`internal/translations/money-conversation-sheet.so.md`: 49 rows keyed to the
English element IDs, the terminology (`meher`, `nikaax`, `waliimo`, `Qofka A`
/ `Qofka B`) and the debt-direction fix. `tests/sheet-so.test.ts` checks the
built files carry its approved phrases, so a correction goes into both. Lines
outside the 49 rows (the cross-reference, the one-page note, the switcher's
"Af-Ingiriisi ahaan" and "Sidoo kale") are operational, were translated
during the build and are noted in the record.

## Where the rest lives

Building and deploying the pages: `docs/OPS.md`. A9 and what people said:
`docs/RESEARCH.md`. The voice, the 16px floor, accessibility:
`docs/DESIGN.md`. What is recorded about anyone: `docs/PRIVACY.md`.
