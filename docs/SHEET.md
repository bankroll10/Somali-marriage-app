# The money conversation — what N3 says, and what it refuses to say

> Three files: `public/niyyah-money-conversation-sheet.html` (four printed
> pages, room to write), `…-sheet-1page.html` (the same twenty questions,
> condensed onto one printed page), and a plain-text twin at `…-sheet.txt`.
> No fonts, no scripts, no images, no network in any of them. Each opens from
> an attachment, a USB stick or a printer's desktop with the wifi off.
>
> Built 2026-09-20. The one-page variant and this doc's print numbers were
> added the same day, after a founder review asked for both lengths side by
> side rather than a single choice between them. Catalog rows are in
> `docs/ASSETS.md` under **N3** and **N3-1page**.

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

**The full sheet is four printed pages, not two.** The original brief asked
for a two-page maximum *and* for page breaks between sections *and* for
answer lines tall enough to write on. Those three cannot all hold in one
document: four subjects with a forced break between them is four pages
before a single line is drawn, and squeezing twenty two-column answers onto
two pages leaves lines nobody can write in. Rather than pick one constraint
to break, this file keeps all three and a second file — below — carries the
one-page version instead. A coordinator handing over one subject per page is
also the better object for the four-page file specifically: it can be filled
in across four sittings, which is how this conversation actually happens.

## Verified

Chromium, from `file://` against the built `dist` copy, so the check is the
same one a coordinator's machine performs on an attachment. Page counts are
real PDF renders via headless Chrome, not read off the CSS.

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
| `<title>` | Contains "Niyyah", so a printed page or a shared tab identifies itself on its own. |
| Print-footer | `Niyyah — joinniyyah.com · v1.0 — 2026-09-20`, once per section, plain text — not a second link. |
| Print resize handle | Computed `resize: none` in print media; `::-webkit-resizer` hidden. |
| Typed and reloaded | The text is gone; `localStorage` and `sessionStorage` both empty. |

**One caveat worth knowing before it surprises anyone.** The four-page result
holds when the print dialog's margins are left at default, which is what makes
the sheet's own `@page` margin apply. A reader who sets margins by hand can
push it to five pages — that is the browser doing what it was told, not the
sheet being wrong. Rendering it with margins applied twice (14mm from the
print API *on top of* the sheet's own 14mm) produced eight pages on A4, which
is the shape of that mistake if it ever shows up in a bug report.

## The one-page variant

`niyyah-money-conversation-sheet-1page.html` carries the identical twenty
questions — pinned equal to the full sheet's, word for word, by
`tests/sheet.test.ts` — laid out to print on a single Letter or A4 page. Same
four subjects, same content rules, same footer, same one link. Three real
differences from the full sheet, each one measured rather than assumed:

- **Every per-question answer is a single ruled line (`<input>`), not a
  paragraph box (`<textarea>`).** That is the one content-shape change the
  founder's brief allowed ("shrink the write-in areas to single ruled lines
  as needed"). The agree/still-deciding boxes at the end of each subject stay
  textareas, per the same brief ("keep the agree/still-deciding boxes").
- **The per-question "Person A" / "Person B" labels are real `<label for>`
  elements, visually hidden** (the standard clip-to-1px technique, not
  `display:none`, so a screen reader still reads them) rather than printed
  twenty times over. A single legend line in the header — "Each question
  below: Person A on the left, Person B on the right." — says the order once
  for a sighted reader on paper. (First worded "first"/"second", describing a
  stacked reading order; corrected to "left"/"right" once printed, since the
  two columns sit side by side on paper, not one after the other.) This
  traded a repeated visual cue for roughly 200px of vertical room across the
  page; without it, the layout did not fit even after every other cut below.
- **Print splits into two columns** (`columns: 2`) instead of one page per
  subject, with `break-inside: avoid` on every question and box so nothing
  splits mid-item across the column break.

**Getting from two pages to one took an actual bug fix partway through, not
just smaller numbers.** After the first round of trimming (hiding the
repeated per-question labels, ≈450px saved) stopped producing the expected
drop, measurement found why: a screen-only rule, `.cols input[type='text']
{ min-height: 1.9rem }`, has higher CSS specificity than the bare
`input[type='text']` rule this file's `@media print` block used to shrink
answer rows — so the print override silently lost the cascade, and Chrome
kept every answer row at its rem-based screen height. Worse, because the
print block also sets the page's root `font-size` to 9pt, `1.9rem`
recomputed to about 23px *inside* print instead of being ignored there, so
the rows stayed almost three times too tall with no visible reason why in
the CSS being edited (≈95px reclaimed per row once fixed, ×20 rows, the
single largest cut). The fix restates the same selector, `.cols
input[type='text']`, inside `@media print` at matching specificity so
source order decides it correctly. `tests/sheet.test.ts` pins the fixed rule
directly so this cannot silently regress.

Four rounds of measure-and-trim in total — driven by a script that sums the
real rendered height of every question, label row, framing sentence and box
rather than guessing from the CSS, re-run after each change — took the total
content height from 2217px (two pages on Letter, before any of this) to
1369px (one page on both, confirmed by an actual PDF render each time).

**A second pass spent that fit's leftover room on the lines themselves.**
Fitting one page and being usable on that page are different goals, and the
first pass only solved the first one: at 3mm per question line and 4mm per
agree/still-deciding line, Letter's printed page ended about 23mm above the
bottom margin — room going unused while every line was too short to
comfortably write on. The fix is the opposite of the first pass: grow the
same rules back up, watching the same measurement (now the *gap* between the
last thing on the page and the bottom margin, not the total content height)
so the page stays at one without leaving slack unspent.

That relationship is not linear. `column-fill: balance` (the default, used
here) periodically shifts where content splits between the two print
columns as row heights grow, so a given increase in per-row height sometimes
barely moves the bottom edge and sometimes moves it a lot — measured, once,
going from 3mm rows to 4.5mm (+1.5mm) only closed 3mm of the 23mm gap, but
the very next +1.5mm step (4.5mm → 6mm) closed nearly 17mm on its own and
came within a hair of pushing the file to two pages. Landed at **5.9mm per
question line and 6.9mm per agree/still-deciding line**, found by testing
each step against an actual PDF render rather than assuming the previous
step's ratio would hold for the next one:

| Paper | Bottom slack | Page count |
|---|---|---|
| US Letter (the shorter paper) | **4.47mm** | 1 |
| A4 (the taller paper) | 22.07mm | 1 |

A4 keeps a wide margin on purpose — Letter is the binding constraint, and the
brief asked to fill *it* to within ~5mm, not to make both papers equally
tight. Overshooting Letter even slightly risks a second page; this stayed on
the safe side of the target rather than exactly on it.

**Two more fixes rode along in the same pass, both applying to both files:**

- **Textareas no longer print their resize handle.** The diagonal drag
  corner is a screen-only affordance; printed, it showed as a stray mark in
  the corner of every answer box with nothing to grab. `resize: none` plus
  hiding `::-webkit-resizer` in `@media print` removes it without touching
  the on-screen behavior, where the handle is still real and still useful.
- **The agree/still-deciding boxes' labels were misaligned in the one-page
  file specifically.** "What we're still deciding" wrapped to two lines in
  this file's narrower print column while "What we agree on" stayed on one,
  so the second rule sat visibly lower than the first. Shortened to
  **"Agreed"** and **"Still deciding"** — both now render at the same
  height, and both rules start at the same y-coordinate, confirmed directly
  rather than assumed from the text being shorter. (The four-page file's
  labels are untouched; its print column is wide enough that neither ever
  wrapped.)

## Two files, and no attempt to pick one

Nothing here recommends the four-page sheet over the one-page sheet or the
reverse — they serve different moments. The four-page file is for a couple
who has decided to sit down and actually write; the one-page file is for
someone who wants to see, or hand over, the whole conversation at a glance
before that sitting happens. Handing someone the wrong length for what
they're about to do is its own small failure, so each file names the other
by filename, on screen only, in plain text — not a second `<a>`; the one
link both sheets carry stays the one into joinniyyah.com.

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

## N3-note — a half-page for the person handing it over

The pitch to a coordinator has always been "would your counsellors use
this." That question has an easy yes hiding behind a harder one: *how* —
when in a session, whether couples fill it together or apart, what happens
to it afterward. Leaving that unanswered means the coordinator has to invent
an answer before they can say yes, and an invented answer is a reason to
wait rather than reply.

`public/niyyah-money-conversation-sheet-facilitator-note.html` (N3-note)
answers it directly, in three sections — when to hand it out, how it's meant
to be used, what happens to it after — plus which of the two sheet lengths
fits which moment. It is not a worksheet: nobody fills it in, so it carries
none of the twenty-question content rules above, only the same no-network
guarantee (no font, script, image or CDN link) and the same one-link rule as
the two sheets it accompanies. A plain-text twin,
`…-facilitator-note.txt`, exists for the same reason the sheet's does —
pasting straight into a pitch email.

**Built to half a page, and measured, not eyeballed.** Rendered against the
built copy at US Letter and A4's real content boxes: **51% of a Letter
page, 48% of A4**, both still one printed page. First draft came in at 88%
— readable, but not something a coordinator could take in without turning
the page, which was the whole point. Three rounds of cutting got there:
tighter print-only margins and line-height (the pattern the two sheets
already use, applied here for the first time since this file previously had
no print-specific spacing at all), trimmed wording that said the same thing
in fewer words, and dropping the bordered box around the two sheet
filenames in favor of two plain lines — a border and padding cost more room
on paper than the grouping was worth once each filename already reads as
distinct set off by `<code>`.

## A Somali translation exists — and stays unpublished until reviewed

`internal/translations/money-conversation-sheet.so-DRAFT.md` is a
machine-drafted Somali translation of the money conversation's full content
— header, all four subjects, all twenty questions, both box labels, the
legend, the footer. It is not built from, and it is a source for a future
`niyyah-money-conversation-sheet-so.html`, not a preview of one.

**It is deliberately not a public asset.** `internal/` sits outside Vite's
`publicDir`, so nothing in it is ever copied to `dist` or served — verified
directly, not assumed (`tests/somali-gate.test.ts`). The file itself opens
with an unmissable banner: unreviewed, machine-drafted, do not publish, do
not link. The product's own existing convention for this — the `approved`
field on every line in `src/data/somali.ts`, and `docs/PROTOCOL.md`'s rule
that a Somali sentence ships only after being read aloud to a Somali person
of the target age — already says a wrong word in Somali is a worse failure
than a wrong word in English. This draft has not cleared that bar, and nothing
here claims it has: no row was added to `docs/ASSETS.md` for it, the same
discipline that kept N3 itself off that table while it was still proposed.

The draft's own front matter names four open questions for whoever reviews
it — the register for "you" (singular vs. the plural/formal used for the
two of them together), whether *mahr*/*nikah*/*walima* keep their English
spelling or take a Somali one, whether any line reads as translated rather
than spoken, and whether the no-figures/no-advice content rules survive
translation as cleanly as they read in English. None of those are questions
this session could answer on its own — they need a native or fluent Somali
speaker, the same requirement every other Somali line in the product
already has.

## Where the rest lives

- The catalog rows, the statuses, and the rule about when a URL may be
  called live: `docs/ASSETS.md`.
- What the voice forbids: `docs/VOICE.md`.
- The 16px floor and the rest of the mobile rules: `docs/MOBILE.md`.
- The accessibility baseline the app holds to: `docs/ACCESS.md`.
- How a Somali line earns `approved: true`: `docs/PROTOCOL.md`,
  `src/data/somali.ts`.
- The rules, as tests: `tests/sheet.test.ts`, `tests/somali-gate.test.ts`.
