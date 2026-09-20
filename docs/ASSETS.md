# Niyyah — the asset catalog

> Every public thing this product hands to a stranger, with its **verified**
> URL and the date someone last opened it. One file, because a URL declared
> live in four places is a URL nobody owns — and because the distribution
> playbook this serves states the rule plainly: *a future task must never
> invent a public URL from a proposed slug.* If an address is not in the table
> below with the status **live and checked**, it is not a link to put in a
> pitch, a post or a room.
>
> Written 2026-09-17, after the founder shared the *Small-Asset Traffic
> Playbook* and three pitches had already gone out carrying placeholder URLs.

## The rule

An asset moves to **live and checked** only when a person has opened it on a
device with no session — not when it builds, not when it merges, not when
Netlify says ready. The date in the last column is the date of that opening,
and whoever does it puts their finding in the row. Everything else is a claim.

Statuses, from the playbook: **live and checked** · **live with a blocker** ·
**advertised but not fully inspected** · **proposed** · **retired**.

One status added here, 2026-09-20: **built, not yet checked**. The playbook's
list jumps from *proposed* straight to statuses that assume a public address,
and every asset in fact spends time between the two — written and merged, live
at a real URL, opened by nobody without a session. N3 was the first asset to
sit there long enough to need a word for it. It is not a softer *live and
checked*: the rule above is unchanged, and an asset in this state does not go
in a pitch.

## The assets

| ID | What it is | URL | Status | Last checked |
|---|---|---|---|---|
| **N1a** | *Is he serious?* — the read, for a woman reading a man | `https://joinniyyah.com/tools/is-he-serious` | **live and checked** | 2026-09-17 |
| **N1b** | *Is she serious?* — the same read, for a man reading a woman | `https://joinniyyah.com/tools/is-she-serious` | **live and checked** | 2026-09-17 |
| **N1c** | The eleven, interactive — one conversation at a time, with the two-sided sheet | `https://joinniyyah.com/tools/before-you-say-yes` | **live and checked** | 2026-09-17 |
| **N2** | The eleven, to read and print — all of them, in a voice for two readers | `https://joinniyyah.com/guides/before-you-say-yes` | **live and checked** | 2026-09-17 |
| **N2s** | Three of the eleven, one Letter page — the sample that goes in a pitch | `https://joinniyyah.com/guides/before-you-say-yes/sample` | **live and checked** | 2026-09-17 |
| **N0** | The door — the honest count, for someone looking rather than talking | `https://joinniyyah.com/?door` | advertised but not fully inspected | — |
| **N3** | The money conversation — mahr, the wedding, debt and family support, on one printable sheet (four pages, room to write) | `https://joinniyyah.com/niyyah-money-conversation-sheet.html` | **built, not yet checked** | — |
| **N3-1page** | The money conversation, condensed — the same twenty questions on a single printed page | `https://joinniyyah.com/niyyah-money-conversation-sheet-1page.html` | **built, not yet checked** | — |

### What each one is for

| ID | The problem it answers | Who | What they leave with | The one next step |
|---|---|---|---|---|
| N1a / N1b | "I have been talking to someone for months and I cannot tell if this is going anywhere." | A Somali adult already talking to a specific person | An honest read of what the other person has actually done, in bands, with the thinnest ground named | The one question to ask next, word for word — or talk it through with the guide |
| N1c | "We are getting serious and I do not know what we have not discussed." | A Somali adult deciding about a specific person | Which of the eleven they have had, and which is open | The one to open this week, and the words — or send the two-sided sheet to their partner |
| N2 | "What should a couple actually talk about before the families get involved?" | A couple, or one half of one; and the coordinator or counsellor handing it to them | All eleven, each with why it is found out too late, the words, and what to listen for | Read it separately, then together; the interactive version is linked |
| N2s | The same, at a glance, on one page that can be printed and reviewed in two minutes | A reviewer at a mosque, a counselling service or a resource list | Three conversations, with marking space | The full guide |
| N3 | "What do we each expect about mahr, the wedding, and money to relatives?" | Two adults deciding about each other, before the families are involved; and the coordinator who hands it to them | Twenty questions across four subjects kept strictly apart, answered in two columns, with what they agree on and what is still open written down | Their own answers, side by side — nothing prescribed, nothing scored |

**N3 was gated on demand, and the demand arrived.** The rule written here on
2026-09-17 was that it ships when a coordinator or a couple asks, not before.
The founder's distribution watch kept returning mahr-guide openings — the same
request from different directions — and that is the ask the gate named. Built
2026-09-20; see `docs/SHEET.md` for what it does and does not say.

It is a static file, not a route: `public/niyyah-money-conversation-sheet.html`,
served straight from `dist` ahead of the SPA rewrite, with a plain-text twin at
`…-sheet.txt` for pasting into an email or a post. It loads no font, no script
and no image, so it opens from an attachment or a USB stick with the network
off — which is the form a coordinator actually forwards. Unlike N1c and N2 it
carries **no link into the app** beyond the one footer address, and records
nothing: no `via`, no storage, no form. That is deliberate. On this subject a
sheet that measured its reader would be the wrong object, and the attribution
we would gain is worth less than the page being obviously inert.

**A second, one-page version exists for the same URL family:**
`public/niyyah-money-conversation-sheet-1page.html`, at
`https://joinniyyah.com/niyyah-money-conversation-sheet-1page.html`, same
status. Same twenty questions, same four subjects, same content rules — every
per-question answer is a single ruled line instead of a paragraph box, and
print splits into two columns, to fit US Letter and A4 on one printed page
instead of four (verified by rendering both to PDF with headless Chrome, not
estimated from the CSS — `docs/SHEET.md` has the numbers). It exists because
"print this and hand it over" and "sit down and actually write" are two
different asks, and the four-page sheet only serves the second one. Handing
someone the wrong length is its own failure mode.

## Placements — the ledger

Every pitch, whether or not it was accepted. A placement is **accepted** only
when the link is actually visible somewhere a stranger could find it.

| Date | Where | Route | Asset | Link sent | Status | Outcome |
|---|---|---|---|---|---|---|
| 2026-09-17 | Al-Ansar Islamic Movement of Minnesota, North Minneapolis | email, nikah contact | N2 | `…/guides/before-you-say-yes?via=mosque` | sent, awaiting reply | — |
| 2026-09-17 | ICSA / Dar Al-Hijrah, Counseling & Family Services | phone, then email | N2 | `…/guides/before-you-say-yes?via=mosque` | sent, awaiting reply | — |
| 2026-09-17 | The Family & Youth Institute | contact form | N2 | `…/guides/before-you-say-yes?via=group` | sent, awaiting reply | — |
| 2026-09-17 | Masjid Al-Israa, Fridley | email, nikah coordinator | N2 | `…/guides/before-you-say-yes?via=mosque` | sent, awaiting reply | — |
| 2026-09-18 | Abubakar As-Saddique Islamic Center, Minneapolis | email `aaic@abuubakar.org`, phone 612-871-8600 | **N2 + N2s attached**, N1c linked | `…/guides/before-you-say-yes?via=mosque` | drafted, not yet sent | — |
| 2026-09-19 | WardheerNews — editorial, worldwide Somali readership | email `admin@wardheernews.com` | **N1c** | `…/tools/before-you-say-yes?via=press` | topic inquiry sent 2026-09-19 | — |

**The 2026-09-19 entry, and what it shows next to the one above it.** The
shortlist again called the interactive tool N2. This time the *destination* is
right and only the label is wrong: a reader on a news site clicks through and
does it themselves, so **N1c** — the interactive `/tools/…` — is the asset.
Yesterday's Abubakar surface was a packet a coordinator hands to a couple, so
**N2**, the printable `/guides/…`, was the asset there. Keep both rows: the
pair is the argument that the choice is made by the *surface*, not by which
asset is newest or which the shortlist named.

Two more things about the WardheerNews entry:

- **`press` did not exist until this pitch.** The ten vias were six kinds of
  link a person sends and four kinds of room; an article is neither, and filed
  as `group` it would have polluted the one cell the eight-week pivot rule
  reads. `src/lib/entry.ts` says a via cannot be retrofitted, and an article
  goes into an archive and stays there — so the id landed before the inquiry,
  not before the draft.
- **Exclusivity is a real constraint, not boilerplate.** WardheerNews accepts
  articles "intended exclusively for its readers", stated on two of its pages.
  The article must be newly written prose, **not** the text of
  `/guides/before-you-say-yes` rearranged — that page is public, so a rewrite
  of it is not exclusive, and a relationship with a publication that serves
  Somali readers worldwide is worth more than one placement. Written down here
  because this is the thing that gets lost between an accepted inquiry and a
  draft three weeks later.

**Two corrections made to the 2026-09-18 shortlist before it was logged**, both
worth keeping because the same two mistakes will recur:

1. **The proposed link carried no `?via=`.** Every earlier placement carries
   one, and `via` is the *only* attribution this product records
   (`src/lib/entry.ts`). The shortlist's own measurement plan asks for
   Minneapolis-area activation to be tracked separately — without `?via=mosque`
   that is not a harder measurement, it is an impossible one. A link sent
   without it produces an arrival indistinguishable from a stranger typing the
   domain.
2. **The shortlist called the interactive tool N2.** In this ledger **N1c** is
   the interactive eleven at `/tools/before-you-say-yes` and **N2** is the
   printable one at `/guides/before-you-say-yes`. They are different assets for
   different readers, and the proposed surface — "instructions provided to
   couples applying for marriage services" — is a packet a coordinator hands
   over, which is what N2 and the one-page N2s exist for. N1c is linked inside
   N2, so sending N2 loses nothing and gains the printable route.

**One difference between the first four, worth remembering when the replies come
in.** The first three carried the link alone. Masjid Al-Israa also carried the
one-page sample as a PDF attachment, the version with the marking boxes. If
Al-Israa answers and the others do not, the attachment is the first thing to
suspect — a coordinator can see a printed sheet in two minutes without
clicking anything. Four sends is not evidence of anything; it is a difference
to notice, not a conclusion to draw.

**Who keeps this ledger.** The founder sends; the entries are written in the
working session, from what the founder reports. A send is logged the day it
happens. A reply goes here as an outcome **and** in `docs/FEEDBACK.md` as what
was said, because two acceptances start the eight-week clock on
`docs/EXPERIMENTS.md` A9.

Named but not yet approached, from the playbook: the UMN Somali Student
Association, the MuslimMatters money episode team, Amaliah's relationships
section, and Somali nikah coordinators and marriage educators as a discovery
category. Excluded on purpose: `r/SomaliRelationships`, whose rules prohibit
posts intended to drive traffic.

## Attribution — decided, and why it looks thin

The playbook asks for a distinct identifier per placement and shows a UTM
example. **This product ignores UTM parameters entirely.** `entryFromUrl`
(`src/lib/entry.ts`) reads only `via`, from a closed set of eleven ids,
and `src/main.tsx` strips the rest of the query before React mounts. So
Al-Ansar and ICSA both arrive as `mosque` and the readout cannot separate
them.

**That stays.** `src/lib/entry.ts` states the rule it enforces: a link names
the *kind* of room and never the room.

**`press`, added 2026-09-19, is not an exception to that rule — it is a third
kind.** `alumni`, `professional` and `mosque` were a finer split of one thing:
rooms. A publication is not a finer room. Nobody in its readership was asked by
name, the scale is whatever the publication has, and it is read from anywhere
in the world. Two Somali news sites will both arrive as `press` and the readout
will not separate them, exactly as two mosques both arrive as `mosque` — the
rule is unchanged. What changes is that an article's readers no longer land in
`group`, where the wedge's own eight-week test would have counted them
(`docs/WEDGE.md`). And with the five-person floor
(`netlify/shared/floor.ts`), per-placement cells would read `null` for months
even if they existed — the split would cost the privacy rule and buy nothing.

So the ledger above carries the placement's identity and the product carries
only the kind. When an acceptance lands, the row records it, and the arrivals
under that `via` in the same week are the evidence. That is the playbook's own
answer for this scale, and it is written here so it reads as a decision rather
than an omission.

**What can and cannot be measured**, for anyone drafting a pitch: arrivals by
kind of link, the eleven begun and completed among them, the two-sided sheet
asked and answered, and `counted` by city — all floored at five. Never: opens
of a static page, return visits, or anything about an individual
(`docs/LEARNING.md`). Do not promise an institution a report on their own
couples.

## Naming, corrected

The playbook was researched before these shipped and proposes slugs we did not
use. The live addresses in the table above are the only correct ones.

| Proposed there | What shipped | Why |
|---|---|---|
| `/tools/is-he-serious`, `/tools/is-she-serious` | the same | — |
| `/tools/before-nikah-conversations` | `/tools/before-you-say-yes` (interactive) and `/guides/before-you-say-yes` (to read and print) | The product already calls it *Before you say yes*, and the eleven are not only for the weeks before a nikah |

## Where the details live

- How the pages are built and how to hand them to an institution:
  `docs/DEPLOY.md`.
- Whether the channel works, with the rule written before the numbers:
  `docs/EXPERIMENTS.md` A9.
- What people said: `docs/FEEDBACK.md`.
- The routes as a developer meets them: `docs/DEMO.md`, `src/data/tools.ts`.
