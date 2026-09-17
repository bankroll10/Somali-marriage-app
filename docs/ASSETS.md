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

## The assets

| ID | What it is | URL | Status | Last checked |
|---|---|---|---|---|
| **N1a** | *Is he serious?* — the read, for a woman reading a man | `https://joinniyyah.com/tools/is-he-serious` | **live and checked** | 2026-09-17 |
| **N1b** | *Is she serious?* — the same read, for a man reading a woman | `https://joinniyyah.com/tools/is-she-serious` | **live and checked** | 2026-09-17 |
| **N1c** | The eleven, interactive — one conversation at a time, with the two-sided sheet | `https://joinniyyah.com/tools/before-you-say-yes` | **live and checked** | 2026-09-17 |
| **N2** | The eleven, to read and print — all of them, in a voice for two readers | `https://joinniyyah.com/guides/before-you-say-yes` | **live and checked** | 2026-09-17 |
| **N2s** | Three of the eleven, one Letter page — the sample that goes in a pitch | `https://joinniyyah.com/guides/before-you-say-yes/sample` | **live and checked** | 2026-09-17 |
| **N0** | The door — the honest count, for someone looking rather than talking | `https://joinniyyah.com/?door` | advertised but not fully inspected | — |
| **N3** | Mahr, wedding and family-support worksheet | — | **proposed** | — |

### What each one is for

| ID | The problem it answers | Who | What they leave with | The one next step |
|---|---|---|---|---|
| N1a / N1b | "I have been talking to someone for months and I cannot tell if this is going anywhere." | A Somali adult already talking to a specific person | An honest read of what the other person has actually done, in bands, with the thinnest ground named | The one question to ask next, word for word — or talk it through with the guide |
| N1c | "We are getting serious and I do not know what we have not discussed." | A Somali adult deciding about a specific person | Which of the eleven they have had, and which is open | The one to open this week, and the words — or send the two-sided sheet to their partner |
| N2 | "What should a couple actually talk about before the families get involved?" | A couple, or one half of one; and the coordinator or counsellor handing it to them | All eleven, each with why it is found out too late, the words, and what to listen for | Read it separately, then together; the interactive version is linked |
| N2s | The same, at a glance, on one page that can be printed and reviewed in two minutes | A reviewer at a mosque, a counselling service or a resource list | Three conversations, with marking space | The full guide |
| N3 | "What do we each expect about mahr, the wedding, and money to relatives?" | A couple approaching the nikah | Not built. A worksheet separating amounts from expectations, with no prescribed mahr | — |

**N3 is deliberately not built.** The playbook gates it on demand, and nothing
has asked for it yet. It ships when a coordinator or a couple asks, not before.

## Placements — the ledger

Every pitch, whether or not it was accepted. A placement is **accepted** only
when the link is actually visible somewhere a stranger could find it.

| Date | Where | Route | Asset | Link sent | Status | Outcome |
|---|---|---|---|---|---|---|
| 2026-09-17 | Al-Ansar Islamic Movement of Minnesota, North Minneapolis | email, nikah contact | N2 | `…/guides/before-you-say-yes?via=mosque` | sent, awaiting reply | — |
| 2026-09-17 | ICSA / Dar Al-Hijrah, Counseling & Family Services | phone, then email | N2 | `…/guides/before-you-say-yes?via=mosque` | sent, awaiting reply | — |
| 2026-09-17 | The Family & Youth Institute | contact form | N2 | `…/guides/before-you-say-yes?via=group` | sent, awaiting reply | — |
| 2026-09-17 | Masjid Al-Israa, Fridley | email, nikah coordinator | N2 | `…/guides/before-you-say-yes?via=mosque` | sent, awaiting reply | — |

**One difference between these four, worth remembering when the replies come
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
(`src/lib/entry.ts`) reads only `via`, from a closed set of ten room kinds,
and `src/main.tsx` strips the rest of the query before React mounts. So
Al-Ansar and ICSA both arrive as `mosque` and the readout cannot separate
them.

**That stays.** `src/lib/entry.ts` states the rule it enforces: a link names
the *kind* of room and never the room. And with the five-person floor
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
