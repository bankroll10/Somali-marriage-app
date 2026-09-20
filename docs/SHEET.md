# The money conversation — what N3 says, and what it refuses to say

> `public/niyyah-money-conversation-sheet.html`, with a plain-text twin at
> `…-sheet.txt`. One file, no fonts, no scripts, no images, no network. Opens
> from an attachment, a USB stick or a printer's desktop with the wifi off.
>
> Built 2026-09-20. The catalog row is in `docs/ASSETS.md` under **N3**.

## Why now, and not on 2026-09-17

`docs/ASSETS.md` listed N3 as proposed and wrote its own gate: *"It ships when
a coordinator or a couple asks, not before."* That was a real constraint, not
throat-clearing — the playbook's whole argument is that an asset built on a
hunch costs more than the traffic it earns.

The gate opened. The founder's distribution watch kept surfacing openings for a
mahr guide, from different directions, unprompted. Repeated inbound interest in
the same subject is the cheapest honest signal of pull there is, and it is
exactly the signal the gate named. So this is not a new bet; it is the
condition a previous session wrote down, being met.

Two things made it safe to build rather than merely wanted:

- **Money is already load-bearing inside the product.** Two of the eleven —
  `money-home` and `aroos-mahr` — are money conversations, and `money-home` is
  one of the three in the N2s sample that goes out in pitches. This is depth on
  a subject the product already stands behind, not a claim about a new one.
- **The discipline already exists.** `docs/VOICE.md` and `docs/PROTOCOL.md`
  already forbid the product from telling a reader what to decide. A mahr sheet
  is only dangerous when it answers; this one asks. That is what makes it
  publishable under a marriage brand on a religiously sensitive subject.

## What it is

Twenty open questions, five in each of four subjects, answered in two columns
labelled **Person A** and **Person B**. Each subject ends with one box: *what
we agree on*, and *what we're still deciding*.

It is not a calculator, not a quiz, not a score. Nothing is totalled, nothing
is rated, no answer is better than another answer. The only output is the
couple's own handwriting, side by side.

## The four subjects, and why they are kept apart

The separation is the product. Collapsed into one conversation, these four
argue with each other — a family's mahr expectation gets traded against a
wedding budget, and someone's remittance to a parent abroad disappears into
"we'll figure money out later."

| # | Subject | What it is, and what it is not |
|---|---|---|
| 1 | Mahr | What each expects, who has heard it, how much at the nikah and how much deferred, and what happens if a family names something different. Not a figure, not a ruling. |
| 2 | The wedding | One-time cost only. Who pays for what, whose guests are whose, each person's own ceiling, what gets cut first and what gets cut last. Explicitly *separate from mahr*. |
| 3 | Existing debt | What each already owes, from before this marriage was decided. Monthly payment, time left, whose name is on it, who already knows, and whether it stays one person's after the nikah. |
| 4 | Ongoing obligations | Money that leaves an account regularly for people outside the marriage — parents, siblings, relatives here or abroad. How much against what they earn, whether it is fixed, who knows, and what happens to it after the marriage. |

Subject 4 is the one most often missing from a sheet like this, and the one
most likely to surface after the nikah rather than before it.

## The content rules, and where they are enforced

Every rule below is pinned by `tests/sheet.test.ts`, not kept in a brief.
A brief is a thing someone edits around; a failing test is not.

- **No ruling, no citation.** No fiqh, no madhhab, no hadith or ayah, no
  "the correct mahr is." The sheet has no religious position, so it takes none.
- **No figure of any kind.** No amounts, ranges, averages, medians or
  benchmarks — the test bans currency symbols and any run of digits outside
  the version line. The only numbers on the sheet are the ones the couple
  writes.
- **No claim about outcomes.** No divorce rates, no research, no "most
  couples." We do not know what most couples do and would not be able to
  defend it if we said.
- **No advice.** Every one of the twenty lines is a question. Four add a
  clarifier after the question mark ("Write your own ceiling, not a guess at
  what it will cost"); none tells the reader what to choose.
- **No other name.** Niyyah is the only organisation named, nobody is quoted,
  and there is not one testimonial.
- **No gendered labels.** Person A and Person B. The test also scans both
  files for husband/wife/groom/bride and for single-reader pronouns — the same
  rule `tests/guides.test.ts` enforces on the eleven.
- **No explaining Somali culture to a Somali reader.** Three terms appear —
  *mahr*, *nikah*, *walima* — because the reader already uses them; nothing is
  glossed, and the words "Somali", "traditionally" and "in our culture" do not
  appear. The sheet is written for Somali-American adults and reads plainly for
  any Muslim adult, which is a property of what it leaves out, not of a
  disclaimer.

## What it does not do, on purpose

- **It records nothing.** No localStorage, no form, no action, no submit
  button, no script tag at all. What is typed stays in the window until it is
  closed. A screen-only line on the sheet says so, because a stranger asked to
  write down their debts is owed that sentence before they start typing.
- **It carries no `via`.** Every other asset in `docs/ASSETS.md` is handed out
  with `?via=` because attribution is the only measurement this product has.
  This one is not. On this subject an inert page is worth more than the
  attribution, and a sheet that measured its reader would be the wrong object.
- **It links into the app exactly once, in the footer**, to
  `https://joinniyyah.com/` and nowhere else. No deep link, no invented URL —
  `docs/ASSETS.md`'s standing rule.

## Print

`@page` declares margins and **no paper size**. That is the fix for "US Letter
and A4 both": the content is laid out inside A4's narrower width and Letter's
shorter height, so whichever paper the printer is holding, nothing clips and
nothing reflows. Declaring `size: Letter` would have been the obvious move and
would have cropped every A4 print.

Each subject starts its own page (`break-before: page`), questions never split
across a break (`break-inside: avoid`), fields print as 11.5mm ruled boxes —
15mm for the agree/still-deciding pair — with transparent backgrounds and hair
borders, so a printed copy costs almost no toner.

The print spacing is tighter than the screen's, and the numbers were measured
rather than guessed. At screen spacing the header plus the first subject came
to 1055px against US Letter's 950px content box — the shorter of the two
papers — so the mahr agreement box landed alone on a fifth sheet. Trimming the
per-question margins, the label size and the header's name fields brought the
first page to 908px, inside Letter with about 40px to spare, and every subject
now ends on its own page.

**This is four printed pages, not two.** The brief asked for a two-page
maximum *and* for page breaks between sections *and* for answer lines tall
enough to write on. Those three cannot all hold: four subjects with a forced
break between them is four pages before a single line is drawn, and squeezing
twenty two-column answers onto two pages leaves lines nobody can write in. The
two constraints that are concrete and testable won. A coordinator handing over
one subject per page is also the better object — it can be filled in across
four sittings, which is how this conversation actually happens.

## Verified

Chromium, from `file://` against the built `dist` copy, so the check is the
same one a coordinator's machine performs on an attachment:

| What | Result |
|---|---|
| Network requests | The document, and nothing else. Zero fonts, scripts, images, stylesheets. |
| Console errors | None. |
| Printed length, US Letter and A4 | **Four pages on both**, one subject each, with the page's own `@page` rules honoured. |
| Phone, 390×844 | No horizontal scroll; the two columns stack; the smallest field renders at 16px. |
| Desktop, 1200px | The two columns sit side by side, tops aligned. |
| Print media | `background: rgb(255,255,255)`, `color: rgb(0,0,0)`, fields fully transparent. |
| Fields | 51, every one with a non-empty `<label for>`. |
| Links | One, `https://joinniyyah.com/`. Scripts: zero. Forms and buttons: zero. |
| Typed and reloaded | The text is gone; `localStorage` and `sessionStorage` both empty. |

**One caveat worth knowing before it surprises anyone.** The four-page result
holds when the print dialog's margins are left at default, which is what makes
the sheet's own `@page` margin apply. A reader who sets margins by hand can
push it to five pages — that is the browser doing what it was told, not the
sheet being wrong. Rendering it with margins applied twice (14mm from the
print API *on top of* the sheet's own 14mm) produced eight pages on A4, which
is the shape of that mistake if it ever shows up in a bug report.

## On a phone, and to a screen reader

Single column below 700px, nothing scrolling sideways. Every field sits at the
16px floor that stops iOS zooming on focus — `docs/MOBILE.md`'s rule, carried
by hand onto a page that shares none of the app's CSS. One `<main>`, one `<h1>`,
four `<section>`s each labelled by its own `<h2>`, an `<ol>` of real list items,
a real `<label>` for all 51 fields, `aria-describedby` tying each answer box to
its question, and a visible `:focus-visible` ring. Black on white prints at
21:1; the screen palette is the app's ink on the app's cream, well past 4.5:1.

## The plain-text twin

`niyyah-money-conversation-sheet.txt` carries the same twenty questions word
for word — the test asserts it, so the two cannot drift. It exists because the
most common way this gets shared is not a link or an attachment: it is someone
pasting it into an email, a WhatsApp message or a forum post.

## Where the rest lives

- The catalog row, the status, and the rule about when a URL may be called
  live: `docs/ASSETS.md`.
- What the voice forbids: `docs/VOICE.md`.
- The 16px floor and the rest of the mobile rules: `docs/MOBILE.md`.
- The accessibility baseline the app holds to: `docs/ACCESS.md`.
- The rules, as tests: `tests/sheet.test.ts`.
