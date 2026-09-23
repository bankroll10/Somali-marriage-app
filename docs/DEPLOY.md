# Niyyah — how this gets deployed

> Written on 2026-09-05, the day a merge to `main` deployed nothing and
> nobody could tell why. The failure was silent on both sides: GitHub said
> the merge was clean, Netlify said no new deploy, and neither was lying.

## The rule

**`main` is what the world sees.** Anything merged to `main` should be live
within a couple of minutes, without a person remembering to do anything. If
that is not true, the two symptoms below appear and the site quietly rots.

## The two failure signatures

Both were live on this project at once. Learn to spot them.

### 1. A production deploy whose branch is not `main`

In the Netlify deploy details, look at `branch` and `deploy_source`:

```
branch:        claude/phone-testing-check-slt3yy    ← not main
deploy_source: api                                   ← not a git build
context:       production                            ← yet it is what the world sees
has_source_zip: true                                 ← a folder was uploaded
```

That is a **zip deploy**: somebody ran a deploy command from a working
directory, and Netlify published whatever was in that folder. The `branch`
and `commit_ref` fields are only metadata copied from that machine's git
checkout — Netlify never fetched anything. Merging to `main` on GitHub has no
effect on a site being deployed this way, because Netlify is not watching
GitHub at all.

### 2. A quiet Netlify feed while GitHub keeps moving

If the Netlify activity feed shows nothing for a day while commits land on
`main`, do not assume the build is broken or queued. Check whether a build was
ever *triggered*. No trigger, no build, no error — nothing to see anywhere.

The check that settles it, in one line: compare what is live against `main`.

```bash
git fetch origin
git log --oneline <commit_ref of the live deploy>..origin/main | wc -l   # want 0
```

Anything above zero is the number of commits the world cannot see.

## The fix: let Netlify build from GitHub

Done once, in the Netlify dashboard, at
`https://app.netlify.com/projects/getniyyah`. None of this can be done from
the API or from an agent session — repository linking is deliberately a
dashboard action.

1. **Site configuration → Build & deploy → Continuous deployment.**
2. If there is no repository listed, choose **Link repository** and pick
   `bankroll10/Somali-marriage-app`. Authorise Netlify for the repo if asked.
3. Set **Production branch** to `main`. This is the setting that decides what
   `getniyyah.netlify.app` serves. If it names any other branch, every merge
   to `main` will keep doing nothing.
4. Leave **build command** and **publish directory** empty or as they are.
   `netlify.toml` already declares `npm run build` and `dist`, and the file in
   the repo wins over the dashboard.
5. **Deploys → Trigger deploy → Deploy site** once, to prove it.

**How to know it worked.** Open the new deploy and read the same fields as
above. You want `branch: main`, and a deploy source that is a git build rather
than `api`. Then push a one-word change to a document on `main` and watch a
deploy start on its own. That is the whole test.

## Deploying by hand, when you must

A zip deploy is still the right tool for a one-off — checking something on a
phone from a branch that is not ready to merge. Two rules keep it from
becoming the accident above:

- **Deploy a branch as a branch deploy, never to production.** A branch deploy
  gets its own URL (`branch-name--getniyyah.netlify.app`) and leaves the real
  site alone.
- **After any hand deploy to production, trigger a deploy from `main`** so the
  live site goes back to being `main`. A hand deploy that stays up is how the
  site ends up weeks behind without anyone noticing.

## Environment variables

Set in the dashboard under Site configuration → Environment variables. None of
these live in the repository, and none should.

| Key | What it does | Unset means |
|---|---|---|
| `PREVIEW_PASSWORD` | **The close switch** (`netlify/edge-functions/gate.ts`). Any username, this password. Deleted on 2026-09-12; set it only to shut the site after a safety incident. | **No gate — the normal state since 2026-09-12. The site is open to anyone with the link.** |
| `ANTHROPIC_API_KEY` | Switches on the live Guide (`netlify/functions/guide.ts`). | The Guide answers from its offline voice; no error shown. |
| `FOUNDER_KEY` | Bearer token on every readout (`netlify/shared/founder.ts`). Also a **GitHub Actions secret** of the same name, so `.github/workflows/watch.yml` can read `/safety` weekly. | **Every readout answers 401 until it is set** — fails closed since 2026-09-12 (`docs/BOARD.md`); the recovery is setting it. |
| `VITE_WAITLIST_FORM` | Names the Netlify form signups post to. Already set in `netlify.toml`. | The signup card falls back to a mailto. |
| `VITE_SITE_HOST` | The domain the app calls itself, in every link it hands out and every share card. | `joinniyyah.com` — ours, and the same default the code carries. Set in every context; see `docs/OWNED.md`. |
| `VITE_CONTACT_EMAIL` | Where a signup reaches a human when the form is down. | Defaults to `salaam@joinniyyah.com`, which does not receive mail yet — so production must keep this set to an address a person reads. The one open step in `docs/CONTROL.md`'s cutover. |
| `GUIDE_HOURLY_CAP` | The circuit breaker on the live Guide (`netlify/shared/limit.ts`) — the most calls it will answer in one hour, from anyone, combined. | `300`, chosen well above any real hour this product has seen. See `docs/TIME.md`. |
| `GUIDE_DAILY_CAP` | The same, by the day — **the only cap that bounds a month**, and the only one on a route that spends money rather than storage. | `400`. An hourly counter resets 720 times a month, so the hour bounded an hour and nothing longer: at ~2¢ a reply, 300/hour is ~$145 a day and ~$4,300 in a month nobody watched. Forty members asking ten questions each is ~400 replies, or ~$8. See `docs/ROADMAP.md`. A cap on calls is not a cap on spend: since 2026-09-12 the body is measured (32 KB), the thread cut and the answer capped, so the worst call is ~9¢ and the worst day ~$36 (`netlify/functions/guide.ts`). Set a monthly spend limit in the Anthropic console as well — that is the bound outside the code. Since 2026-09-17 the guide **fails closed** when its own counter cannot be read (`overCapOrUnknown` in `netlify/shared/limit.ts`): every storage route still fails open, this one route bills per call (`docs/RISKS.md` R5). |
| `COHORT_HOURLY_CAP` | Joins the door will count in one hour, from everyone. | `200`. See `docs/SCALE.md`. |
| `KEEP_HOURLY_CAP` | Maps kept in one hour — the cheapest way to spend a free plan's storage, bounded. | `300` |
| `VOUCH_HOURLY_CAP` | Vouch links minted and vouches given in one hour. | `100` |
| `COUPLE_HOURLY_CAP` | Elevens *started* in one hour. | `200` |
| `SAFETY_HOURLY_CAP` | Reports filed in one hour — a flood is the one way to bury a real one. Since 2026-09-23 it is spent only by a report against a pair that exists, so junk codes cannot bury a real report (`docs/THREAT.md` T2). | `30` |
| `SAFETY_PROBE_HOURLY_CAP` | Report attempts of any kind in one hour, checked before the pair is looked up — bounds guessing couple codes through the report route. Past it, a miss is a 503, not a 404. | `600` |
| `PROGRESS_HOURLY_CAP` | Rung reports in one hour — a loop of made-up install codes is the cheapest way to make the readout time out. | `1000` |
| `RESTORE_HOURLY_CAP` | Maps **restored** in one hour. A map code (eight characters since 2026-09-23, six before) is the sole authenticator for a map, so an unmetered read is an enumeration surface. See `docs/HARD.md`, and `docs/SECURITY.md` O8 for why the caps alone were not enough. | `600` |
| `FORGET_HOURLY_CAP` | Maps **forgotten** in one hour. Possession of the code is the authority, so this one deletes across five stores. | `600` |
| `COUPLE_READ_HOURLY_CAP` | Joint sheets read back in one hour. | `600` |
| `VOUCH_READ_HOURLY_CAP` | Vouch lookups (`GET /vouch?code=` or `?token=`) in one hour. Was the one public read with no bucket — an existence oracle over the map code (`docs/THREAT.md` T1). The app reads it twice per open of a kept member nobody has vouched for yet (the read, and one recheck 20 s later), so this binds at roughly 300 such opens an hour; past it the client fails quiet and shows "nobody yet". | `600` |
| `DOOR_HOURLY_CAP` | Public door counts in one hour — the one open route that walks a whole prefix of the store on every call. | `600` |
| `COUPLE_ANSWER_HOURLY_CAP` | His answers to the eleven, in one hour. This row said *"his answer is never capped"* until 2026-09-20; it has been capped since the write-paths pass, and three live knobs were undocumented (`docs/FAIL.md`). | `600` |
| `COUPLE_FORGET_HOURLY_CAP` | Joint sheets deleted in one hour — forget me reaches this store too. | `600` |
| `PROGRESS_FORGET_HOURLY_CAP` | Rung records deleted in one hour, the progress half of forget me. | `600` |

Every `*_HOURLY_CAP` and `*_DAILY_CAP` is a circuit breaker, not a member
limit: one counter per route per period, with no identity attached, refused
with the same quiet 503 a client already treats as "try later". Past the cap a real member sees exactly
what she sees when storage is unreachable, which is to say nothing that looks
like a wall. The defaults sit well above any real hour this product has seen.
**The two times to raise them are the day a link is first posted into a
group** — the door's count is one global counter, and a 500-member chat can
spend `DOOR_HOURLY_CAP` in an hour, after which every visitor reads "the count
isn't reachable" (`docs/BOARD.md`) — **and the week a pool opens**, when a
city's worth of people may arrive in an afternoon. Set the variable, no deploy
needed.

The founder's readouts — `/progress`, `/cohort` with no scene, `/couple` with
no code, `/vouch` with no code, `/pool`, `/export` and `/guide` — carry no
cap; the key is what bounds them. `/pool` is the one to know about here: it
reads every counted member's kept map to say whether a pool could open, and
reports what a sweep would take — `?sweep=1` performs one, and `netlify/functions/sweep.ts` performs it weekly for every pool on Netlify's scheduler (`docs/OPERATING.md`,
`docs/LIQUIDITY.md`). Nothing new to set for it.

Two rules about them:

- **The name is the whole contract.** The code looks up these exact strings. A
  variable called something else — `access_vip`, say — is read by nothing and
  protects nothing, while looking on the dashboard exactly like a setting that
  works.
- **Secret values are not available on this site's plan.** Every attempt to
  mark a variable secret is refused with a 422, on every scope combination.
  The site is on `nf_team_dev`, Netlify's free tier, and hiding a variable's
  value is a paid feature. So assume **every key here is readable in plain
  text** by anyone with access to this Netlify team, and by any tool acting
  on its behalf. If that changes on a paid plan, note that secret variables
  reach Node functions but **not** edge functions, so `PREVIEW_PASSWORD` has
  to stay readable either way — the gate is an edge function.
- **Because hiding is unavailable, rotating is the control that matters.**
  Treat a key that has been sitting in this dashboard as known, and replace it
  at the source when it has been exposed. For `ANTHROPIC_API_KEY` that means a
  fresh key at `https://console.anthropic.com/settings/keys`, pasted in here,
  and the old one deleted there. Keep the number of people on the Netlify team
  as small as the work allows, since team access is now the whole boundary.

## Links already sent

Before 2026-09-05 the family vouch link carried her map code, which also
opens `?map=`. Links minted since carry an eight-character token that opens
only the vouch screen. Old links still vouch — the server accepts both — but
anyone who received one holds a code that restores a map. There is no way to
recall them; the honest step is to tell anyone who was sent one before that
date that the link also opened the map, and that a fresh one does not.

On 2026-09-23 codes became eight characters and tokens ten
(`docs/SECURITY.md`, O8). Nothing already sent breaks:
- a six-character map or couple code still opens;
- an eight-character vouch token still vouches, because the server looks for
  a token before it takes eight characters as a code.

A `?map=` link now asks "Is this yours?" before it replaces anything on the
phone. Opening her own link on her own phone does nothing (SECURITY O2).

## Security headers

`netlify.toml` sends `X-Frame-Options: DENY`,
`Content-Security-Policy: frame-ancestors 'none'`, `nosniff`, a
`Referrer-Policy`, a `Permissions-Policy` and a year of HSTS on every path
(`docs/SECURITY.md`, O7). After a deploy, confirm them once:
`curl -sI https://<host>/ | grep -iE 'x-frame|content-security|strict-transport'`.
If a future feature ever needs to be framed (an embed, a partner page), that
is a decision to make here, not a header to delete.

## The backup

`GET /.netlify/functions/export`, behind the same founder key, returns the
learning record — every progress record, the joint tally, the door as counts —
as one dated JSON file. It deliberately carries no map, no vouch, no pair
sheet and no map code; `netlify/functions/export.ts` says why in full.

Save it every month, as the last line of the hour in `docs/OPERATING.md`. It
is the only copy of this data that exists outside one vendor's storage.

```bash
curl -s -H "Authorization: Bearer $FOUNDER_KEY" \
  https://<your-site>/.netlify/functions/export -o "backup-$(date +%F).json"
```

## The safety queue

`GET /.netlify/functions/safety`, behind the founder key, lists every open
report against a real, named person a member has raised a concern about —
see `netlify/functions/safety.ts` and `docs/LEARNING.md` for what this is and
is not. Unlike the monthly readouts, this one does not wait for the month:
`docs/OPERATING.md` calls for checking it weekly — and since 2026-09-12
`.github/workflows/watch.yml` does the weekly read itself and fails when
anything is open. Resolving a report is
`DELETE /.netlify/functions/safety?code=<code>&side=<woman|man>&id=<id>&outcome=<outcome>`,
which deletes the report and leaves an anonymous stub carrying the outcome;
`docs/OPERATING.md` has the exact command and `SAFETY_OUTCOMES` in
`src/data/safety.ts` is the closed list.

## The gate came off — 2026-09-12

**The site is open, and has been since 2026-09-12.** `PREVIEW_PASSWORD` was
deleted that day and the founder walked the deployed site on a phone an hour
later (`docs/BOARD.md`, "What the founder's own walk found"). Every share path
now hands a stranger a working link, which is what the playbook in
`docs/WEDGE.md` needs.

This file is the one place the gate's state is described; `docs/PRODUCT.md` §9
points here. Corrected 2026-09-17: this section and four others still read as
though the deletion were pending, and `docs/ROADMAP.md` item 0 still said the
whole playbook waited on it — five days after it was done (`docs/BOARD.md`,
the gate-state correction).

**The close switch.** `netlify/edge-functions/gate.ts` stays, dormant. Setting
`PREVIEW_PASSWORD` again shuts every route behind HTTP Basic within one
deploy, and that is the only way to close this site in a single action —
worth keeping for the one day `docs/TIME.md` names, when a safety failure has
to be stopped in the minute it is learned of rather than after a revert. To
close: add the variable in Netlify, trigger a deploy, confirm

```sh
curl -sI https://joinniyyah.com/ | head -1     # want: HTTP/2 401
```

To reopen: delete it and deploy again.

**Revised 2026-09-13: the site is indexable from that same day.** The plan
was to keep `noindex` and a disallowing `robots.txt` until the first pool
opened. Both are gone, for two reasons (`docs/BOARD.md`, the search pass).
They cancelled each other — a disallowed crawl is a crawl that never reads
the `noindex`, so the domain stayed in Google as a bare URL under "No
information is available for this page", which is what a stranger sees when a
site is broken or hiding. And a different Niyyah, a Muslim matchmaking
service in Toronto, Ottawa and Montreal, holds the name in search with a real
title and description, while the first links are about to be handed to people
who will search it before they trust it.

## Being found: the founder's part

Removing the blocks lets Google in. It does not tell Google we exist, so the
steps below are the founder's. (They needed the gate off first; it came off on
2026-09-12.)

1. **Google Search Console** → Add property → **Domain**, `joinniyyah.com`.
   It asks for one DNS TXT record; add it wherever the domain's DNS lives and
   press verify. The domain property covers every subdomain and both schemes,
   which the URL-prefix kind does not.
2. **Sitemaps** → submit `sitemap.xml`. It is written by the build, so it is
   already live and already names the right host.
3. **URL Inspection** → paste `https://joinniyyah.com/` → **Request
   indexing.** This is the step that turns days into hours. Do it once; asking
   repeatedly does not help.
4. **Check what the crawler actually got**: the inspection's "View crawled
   page" should show the real `<title>` and description from
   `src/data/brand.ts`, not an empty shell.
5. A week later, search `site:joinniyyah.com`. One result with the real title
   is the whole test. If it still reads "No information is available", the
   blocks are back or the gate is still on.

Bing has the same flow at Bing Webmaster Tools and can import the Search
Console property, which is two minutes and worth it.

**The brand collision is not a technical problem and has no technical fix.**
`niyyahmatch.com` will keep ranking for "Niyyah" until this site has links
pointing at it from places Google trusts. What earns those is the thing the
playbook already does: the rooms, the posts, the eventual press. Searching
"Niyyah Somali" should find us first well before "Niyyah" does, and that is
the search that matters for the wedge.

## The tools' own addresses

Since 2026-09-17 the read and the eleven have paths — `/tools/is-he-serious`,
`/tools/is-she-serious`, `/tools/before-you-say-yes` — defined once in
`src/data/tools.ts`. The build writes one HTML document per tool at
`dist/tools/<slug>/index.html` from the built `index.html`, with only the head
changed: its own title, description, social-card lines, canonical and `og:url`
(`src/lib/toolPages.ts`). Netlify serves the file before the single-page
rewrite, so a fresh visit, a reload and a messaging app's preview all read the
tool's own head without running the app. The sitemap lists all four pages.

`door` and `families` joined this table on 2026-09-21 (`docs/LINKS.md`) —
`/tools/door`, `/tools/families` — after a link/discovery audit found both
still previewing as the homepage in every messaging app. Same mechanism,
same test coverage; nothing about the build changed to add them.

**After the first deploy that carries them**, once:

```sh
curl -sI https://joinniyyah.com/tools/is-he-serious | head -1     # want 200, not 301
curl -s  https://joinniyyah.com/tools/is-he-serious | grep -o '<title>[^<]*'
```

A 301 means Netlify's "Pretty URLs" is adding a trailing slash; the app
tolerates the slash and the canonical stays without it, so nothing breaks, but
turn the setting off under Project configuration → Build & deploy →
Post processing so the address people copy is the one we mint.

**Linking the tools in public placements.** In a room post, the room's kind:
`https://joinniyyah.com/tools/is-he-serious?via=group` (or `?via=alumni`,
`?via=professional`, `?via=mosque`, per `docs/WEDGE.md`); men's rooms get
`/tools/is-she-serious`. In a bio or anywhere a bare link belongs, the path
with no query. The eleven is `/tools/before-you-say-yes` either way. A share
from inside a tool mints `?via=words` (the reads) or `?via=eleven` (the
eleven), the same ids the invitation row already records — no new via.

## The guide, and its one-page sample

Since 2026-09-17 the eleven also exist as a page — `/guides/before-you-say-yes`
— and a one-page sample of three of them at `/guides/before-you-say-yes/sample`.
Both are plain documents written from `src/data/eleven.ts` at build time
(`src/lib/guidePages.ts`), in a voice for two readers, with the disclosures on
page one: made by Niyyah, free, no account, nothing recorded; what the
interactive version does with answers; that the app has a guide using an AI
model and the page does not; that the eleven include qabiil and a second wife.
No app runs on them and opening them counts nothing. Their only script forwards
a `?via=` on the page's address onto the two links into the app, so an arrival
from a placement is remembered as what kind of link it was.

**Before you put a link in a pitch**, check it against `docs/ASSETS.md` — the
one place an address is declared verified, with the date someone last opened
it on a device with no session. A slug that is not there with the status
*live and checked* is not a link to send.

**Handing it to an institution.** The link for a mosque or a counselling
service is `https://joinniyyah.com/guides/before-you-say-yes?via=mosque`; for
a national resource list, `?via=group` (no closer id exists — add a `partner`
via only once a placement is actually agreed). The printed sample is the same
page printed: open `/guides/before-you-say-yes/sample` in Chrome, Print, Save
as PDF, Letter, default margins — it is laid out to fit one page, and the
build's walk checks that it still does. Attach the PDF to the pitch and put
the live URL in the body only after `curl -sI` on it answers 200 — the one
check that matters, since a link in a pitch that 404s is the whole pitch.

**What can and cannot be measured.** Arrivals into the app from the guide, by
via; eleven begun and completed among them; the two-sided sheet asked and
answered; `counted` by city. Not measured, and not to be promised in a pitch:
opens of the page itself, and return visits (`docs/LEARNING.md`). The decision
rule is A9 in `docs/EXPERIMENTS.md`.

## The offline shell

Since 2026-09-21 the build writes `dist/sw.js` (`src/lib/serviceWorker.ts`,
`docs/LINKS.md`), registered from `src/main.tsx` in production only. It
caches the shell — the built HTML, JS, CSS and fonts — network-first, so an
online visit always gets whatever shipped most recently and only a genuinely
unreachable network falls back to the cache. It never touches
`/.netlify/*`: every write and every live read still goes straight to the
network, exactly as before.

`netlify.toml` sets `Cache-Control: no-cache` on `/sw.js` itself, so a
browser holding an old worker always checks for a new one rather than
sitting on a stale shell indefinitely. Nothing to rotate or clean up by
hand: the cache name is a hash of the build's own asset list, so a new
deploy gets a new cache automatically and the worker's own `activate`
handler deletes every cache but the current one. Since 2026-09-23 the
worker's own source is in that hash too, so a change to the worker alone
still rotates the cache; and a page is cached under its path alone, so a
`?map=`, `?couple=` or `?vouch=` code never lands on the phone's disk
(`docs/THREAT.md` T3).

## At real launch

Nothing is left to remove. The `noindex` header and the disallowing
`robots.txt` went on 2026-09-13, `PREVIEW_PASSWORD` on 2026-09-12, and
`netlify/edge-functions/gate.ts` stays on purpose as the close switch above.

Before that day: `netlify/functions/safety.ts` gives reporting a real channel
(see above), but this product has no accounts, so "removed" still means a
founder's phone call, not a button. Trust's promise of real consequences is
true as far as a report reaching a person goes; keep it worded that way, not
as a claim of automatic enforcement this product cannot yet make. See
`docs/TIME.md`.


## The "Powered by Netlify" badge

Netlify shows it by default on Free-plan projects created on or after
2026-08-19, injected at the edge — it is in no file here, and `npm run build`
cannot remove it. Turn it off at Netlify → `getniyyah` → Project
configuration → General → "Powered by Netlify badge". Per project, no
redeploy needed. A visitor can hide it for themselves; only that switch hides
it for everyone. Found on the live site 2026-09-12 (docs/BOARD.md).


## The Guide's request contract

`POST /.netlify/functions/guide` takes `{ mode, context, message, history }`.
`mode` is one of the five in `netlify/shared/vocab.ts` `GUIDE_MODES`; anything
else is a 400. `context` is the member's map, checked field by field in
`netlify/shared/prompt.ts` before it reaches the prompt. The system prompt is
built on the server and **a `system` field in the body is ignored** — it used
to be the whole prompt, which made the route a general-purpose Claude endpoint
on our key (`docs/BOARD.md`, the reality-sprint pass). Ignored rather than
refused, so a client still cached on a phone keeps working.

## Reading a pool without changing it

`GET /pool?scene=…` now deletes nothing. `swept` reports what a sweep would
take; `sweep=1` performs it and `sweptForReal` says so. Since 2026-09-17 `netlify/functions/sweep.ts` performs the same sweep for every pool at once, weekly, on Netlify's scheduler (`export const config = { schedule: '@weekly' }`) — no key, no request, nothing to remember; its log line names what it took (`docs/RISKS.md` R3). After the first deploy that carries it, the Netlify dashboard's function list should show `sweep` with a schedule; if it does not, the function deployed unscheduled and `?sweep=1` remains the way. Sweep between tests,
never during one.
