# Niyyah — what we rent, what we produce, and the three moves between

> MJ DeMarco's Consumer/Producer Principle: consumers use other people's
> systems; producers build systems other people use. Every business runs on
> both, and the question is never "do we depend on anything" — it is *which
> dependencies compound into assets we keep, and which quietly rent us the
> right to exist.* The test used throughout this file: **if the supplier
> disappeared tomorrow, would we still have the thing?**

## The ledger

Across the classes worth auditing. "Rented" is not an accusation — it is a
position, and a position can be moved.

| Class | Position | What it actually means here |
|---|---|---|
| **AI models** | **Rented, and deliberately non-load-bearing** | One supplier, one function (`netlify/functions/guide.ts`). The five voices, the prompt and a complete local answer engine are ours, and `tests/durable.test.ts` refuses to let a model into any instrument. Anthropic vanishing costs a better sentence, never a feature — `docs/DURABLE.md` |
| **Social platforms** | **Not used, and not planned** | No SDK, no pixel, no page. Sharing is `navigator.share`, a browser API. `docs/WEDGE.md`'s channel is ten named people in real rooms — reach nobody grants and nobody can revoke |
| **App stores** | **Not a dependency** | A web app. No 30% cut, no review queue, no morning when a marriage app for Muslims is pulled by someone who never spoke to this community |
| **Advertising platforms** | **Not a dependency, by rule** | `docs/STRATEGY.md` forbids paid acquisition. A channel whose price is set by someone else and rises every year is the definition of renting demand |
| **APIs** | **One, and it is the model** | There is no other outbound call. No maps API, no enrichment, no verification vendor, no analytics SDK |
| **Third-party infrastructure** | **Rented — the real exposure** | Netlify holds the build, the functions, the Blobs (nine stores) and the form. `docs/CONTROL.md` ranks it; the backup (`netlify/functions/export.ts`) is the copy that makes the data ours |
| **The address** | **Owned — as of this pass, in code too** | `joinniyyah.com` is registered to the founder. DNS repoints anywhere; a `netlify.app` subdomain cannot. Every link ever sent carries it |
| **Generic matchmaking conventions** | **Rejected, and that is the product** | No photos, no swiping, no feed, no messaging, no desirability score, no engagement metric. Each refusal is in `docs/LEARNING.md` with its reason. What replaced them — the eleven, the seven grounds, the read, the vouch, the ledger, the honest door — is entirely ours |

## What we already produce

The unusual thing about this audit is how much is already on the owned side.
It is worth naming, because a producer asset that nobody writes down gets
traded away by the next person who finds it inconvenient.

- **The question sets.** Sixteen intake questions, eleven topics, the read's
  eleven, seven grounds, seven non-negotiables, five hardest parts, six
  hesitations, ten reasons a courtship ends, the ending's three taps. Every one
  written by the founder, living in `src/data/`, and pinned as closed
  vocabularies by `tests/vocab-sync.test.ts`. **This is the compatibility
  framework**, and no supplier is involved in any of it.
- **The engines.** `buildReflection`, `buildRead`, `buildBeforeYes`,
  `alignment`, `rungsFrom`, `factsFrom`, the couple tally, the ledger. Pure
  functions, no network, ours.
- **The guide's local voice.** Five modes, their framework answers, the
  keyword matcher. It is the only voice until a key is set.
- **The dataset nobody else has.** Why Somali courtships end, from which
  stage, and whether it was foreseeable — plus how pairs come out on the
  eleven, and which conversations were actually had. It needs no marketplace,
  it compounds from the first member, and `export.ts` gives the founder a copy
  she can leave with.
- **The operating systems.** Thirteen documents that are the actual method:
  the monthly loop, the learning charter, the scale triggers, the wedge
  playbook, the gaps map, the experiments with decision rules fixed in
  advance, the process, the machine, the bets, the durability rule. A
  competitor could copy the screens in a month and would still not have this.
- **The brand.** The name, the Trust page, the philosophy, the refusal to fake
  a count. And now the address it all lives at.
- **The fonts.** Self-hosted, licence included — so no third party sees the IP
  of everyone who opens a Somali marriage app.

## The three highest-leverage moves from renter to owner

Ranked by what is lost if the supplier goes, times how cheaply the position
can be moved.

### 1 · The address — **done in this pass**

**Was rented.** `docs/CONTROL.md` ranked the hostname first of all nine
dependencies, and for the sharpest reason in the audit: links do not come back
to be corrected. Every vouch link a father opened, every couple link a man
answered, every restore link and every share card carries an address for ever.
On `getniyyah.netlify.app`, the day that account ends every one of them dies,
and there is no DNS to repoint because we do not own `netlify.app`.

**Now owned.** `joinniyyah.com` is registered, is the site's primary URL, and
`VITE_SITE_HOST` carries it in every context. What was still rented was the
*code's default* — `src/lib/site.ts` and `vite.config.ts` both fell back to
the landlord's subdomain, which is what a build mints whenever the variable is
missing: a preview, a fresh site, a teammate's laptop. The default is now the
owned domain, `tests/durable.test.ts` refuses a platform subdomain from here
on, and `getniyyah.netlify.app` is kept for ever as a redirect so that links
already in people's messages stay alive.

**Still open:** mail. `VITE_CONTACT_EMAIL` is a Gmail address — a working
inbox someone actually reads, which is the part that matters most. What is
still rented is the domain it sits on: the public address of a marriage
business, printed on Trust and offered whenever a signup fails, lives on
Google's name rather than on ours. Nothing about it can be repointed, and it
cannot be handed to anyone else later. A mailbox on `joinniyyah.com` closes
the last rented thing a member touches, and forwarding it to the inbox that
already works means nothing changes for whoever is reading it.

### 2 · The customer list — **done in this pass**

**Rented, and it is the only row in `docs/CONTROL.md` that answers "Own the
customer?" with *no*.** Every member's email or phone lives in Netlify Forms
and nowhere else. `src/lib/waitlist.ts` says it plainly: *"this form is the
only place their contact lives."* No code reads it back. If that account is
suspended — and a marriage app with member content is exactly what an
acceptable-use review reads badly — every person who ever trusted us with a
way to reach them becomes unreachable, and the pool they were waiting for can
never be told it opened.

This was the highest-value move still available, and the one that had to be
made *early*: a list is only ever owned from the first member forward. There
is no retroactive version. **Built before the first member, which was the
whole point.**

**What shipped, and why in this shape.**

- A `contacts` store, keyed by the map code, holding the way to reach a person
  and nothing else — structurally identical to the `vouches` store, which
  already holds a family member's phone number under the same kind of key, and
  therefore already Tier 4 in `docs/LEARNING.md`'s terms.
- Written by `netlify/functions/cohort.ts` at the same moment it mints the
  code, so there is one write and one truth rather than a form and a hope.
- **Not** folded into `export.ts`'s general backup. That function refuses to
  return kept maps and vouches for a stated reason — a single endpoint that
  dumps member contact details is precisely the honeypot the charter exists to
  prevent. It needs its own founder-gated route, and it should be the only
  thing in the repository that returns a contact.
- Deleted by forget-me, in the same breath as the map, the vouch and the
  token: `netlify/functions/keep.ts` already does exactly this for three keys
  and would do it for a fourth.
- `Cohort.tsx`'s privacy paragraph and `Trust.tsx` move in the same commit, as
  they always do. The sentence is easy because it is true: *we keep our own
  copy of how to reach you, so that a company we rent from cannot lose it.*
- The transport stays portable regardless: `VITE_WAITLIST_URL` already posts a
  signup to any endpoint, and Netlify Forms keeps running as a second copy.

One thing was designed differently from the sketch above, and it matters. The
sketch said the store should have "its own founder-gated route." It has **no
route at all.** An endpoint that returns every member's email and phone is a
honeypot behind a key that the free plan cannot even mark as secret, and
`netlify/functions/export.ts` already refuses member contact for exactly that
reason. The precedent to follow was `netlify/functions/vouch.ts`, which has
held a family member's phone number since the day it was written and says of
it: *read in the Blobs store, never on any endpoint.* So the founder reads it
with her own credentials, and `docs/OPERATING.md`'s monthly hour writes it to
a file beside the backup — which is what actually gets it off the platform,
and therefore what actually makes it hers.

### 3 · The compatibility framework's lineage

**Half-owned, and the missing half is the part that compounds.** The
constants are already ours — `WEIGHTS` in `src/lib/read.ts`, `consequence`
per topic in `src/data/beforeYes.ts`, `stateOf`'s thresholds in
`src/lib/reflection.ts`, `alignment()`'s weights, the order of the eleven.
But today every one of them is a **founder opinion sitting in a literal**, and
an opinion is not an asset. The asset is the *lineage*: this constant is 0.75
because ninety-one people's endings said so on this date, and here is what it
was before.

`docs/OPERATING.md` already defines the loop that produces it — readout field
→ the constant it revises → one change at a time on a hundred records. What
does not exist is the artifact: a single place where every tunable constant is
listed with its current value, the evidence class behind it (`docs/GAPS.md`'s
KNOWN / LIKELY / ASSUMED / UNKNOWN), and its revision history.

That artifact is the thing a competitor genuinely cannot copy. They can read
our eleven topics off the screen in an afternoon. They cannot read *why topic
four is weighted above topic nine*, because that answer is written in a
dataset only we hold.

**The foundation, to build when the first hundred records land.** A
`docs/CONSTANTS.md` in the shape of the existing dated logs: one row per
tunable, its value, its evidence class, the readout field that governs it, and
a revision log where every change names the number of records behind it. It
costs nothing to start empty — and starting it empty *now* is what makes the
first revision a recorded fact rather than a remembered one.

## Foundations we can begin now

| Foundation | Cost | Begin when |
|---|---|---|
| The owned address as the code's default | Done | — |
| A mailbox on `joinniyyah.com` | An afternoon, a few dollars a month | Now. It is the last rented thing a member touches |
| The `contacts` store and its founder-gated route | A day | Before the first real member. A list is only owned from member one |
| `docs/CONSTANTS.md`, started empty | An hour | Now, so the first revision is recorded rather than remembered |
| Keep exporting Netlify Forms by hand | Minutes, monthly | Every monthly hour, until the store above exists |

## Considered and declined

- **Leaving Netlify.** Not a producer move — it swaps one landlord for
  another. What matters is that the *address* moves with us (done), the
  *data* has a copy (done), and the *customer list* is ours (move 2). With
  those three, the host is a commodity, which is exactly where a supplier
  should sit.
- **Building our own analytics.** There is nothing to measure that
  `src/lib/analytics.ts` does not already keep on the member's own device.
  Owning a system you should not be running is not ownership.
- **A social presence as an owned channel.** A page on someone else's platform
  is rented audience wearing a brand. The owned equivalent is the mailing list
  in move 2, and the ten named connectors in `docs/WEDGE.md`.
- **Self-hosting a model to stop renting Anthropic.** The dependency is
  already non-load-bearing, and the local voice already runs. Spending months
  to own a supplier that costs nothing when it disappears is the exact
  inversion of this principle.

## Revisions

_Dated, one line each: what moved from rented to owned, and what it cost._

- 2026-09-07 — The address. `joinniyyah.com` was already registered and set in
  production; the code's default was still the landlord's subdomain, so any
  build missing the variable minted links pointing at it. Default moved, rule
  asserted in `tests/durable.test.ts`, `docs/CONTROL.md`'s cutover marked done
  except for mail.
- 2026-09-08 — The customer list. A `contacts` store, written on every join,
  read by no endpoint, exported monthly, deleted by forget-me. `docs/CONTROL.md`
  row 3 answers "own the customer?" with yes for the first time. Built with
  zero members, which is the only time it could have been built completely.
