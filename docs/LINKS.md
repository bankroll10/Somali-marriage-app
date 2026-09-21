# Niyyah as a linked-to product — measured, 2026-09-21

## Context

Requested directly: audit Niyyah as a mobile web product people primarily
discover through links — direct instrument links, Open Graph cards,
copy/paste, WhatsApp, iMessage, SMS, Telegram, browser back, refresh,
home-screen installation, the manifest, icons, offline shell where
appropriate. Two rules to hold every finding against: **every shared link
should open exactly where the sender intended**, and **a recipient should
never need to understand the whole product before using the thing they were
sent**. No dogma — fix what the evidence shows, and say plainly when
something already works.

**Method.** `npm run build`, then `curl` against the real built files for
what a link-preview crawler actually reads (no JS runs for WhatsApp,
Telegram or a search engine, so this is the only test that matters for OG
cards). Chromium (`/opt/pw-browsers/chromium`) driven by Playwright for
everything a crawler can't tell you — real navigation, `page.goBack()`, real
reloads, and the offline test below. Two honest limits, stated once here
rather than re-argued per finding: this sandbox's egress policy refuses
`joinniyyah.com`, so every check ran against the deploy artifact over local
HTTP, not the live CDN; and WhatsApp, iMessage, SMS and Telegram themselves
cannot be opened from here — what's testable and tested is the mechanism
each one actually depends on (below), and known platform behavior is
labeled as such, not presented as something this session watched happen.

## Findings, by category

**Direct instrument links — already solid, confirmed by the existing
suite.** `src/lib/entry.ts` recognises both path-based tools and every
query-string form, cleans a mangled or auto-linkified code
(`normaliseCode`), tolerates one trailing slash and no more, and takes the
first kind when a link is mangled into two. All of this is already pinned in
`src/lib/entry.test.ts` — nothing here needed a fix, and nothing here was
taken on faith: the tests were read, not just trusted.

**Open Graph cards — two of six instrument kinds showed the generic
homepage card, fixed.** `read` and `eleven` have had their own address since
2026-09-17 (`/tools/is-he-serious`, `/tools/is-she-serious`,
`/tools/before-you-say-yes`), each with its own title, description and
canonical baked into a real static file at build time — confirmed with
`curl`, title tag and all, no JS involved. `door` and `families` did not:
they were still query-only (`?door`, `?families`), and a query string can't
be resolved to a distinct static file by any static host, Netlify included
— so every link of either kind previewed as *"Niyyah — marriage for the
Somali diaspora, done in the open"* in any app that unfurls a link, however
the sender's own message explained it. Confirmed this reaches real people,
not just a hypothetical group post: `navigator.share({ text, url })`
(`src/lib/share.ts`) hands the URL to the OS share sheet as its own field,
and every major messaging app renders a link preview from that field
independent of the accompanying text — so `Cohort.tsx`'s door invitation and
the family words sent from `ScriptCard` both carried this, not just a cold
post into a room.

Fixed the same way `read`/`eleven` were: `door` and `families` joined
`src/data/tools.ts`'s table, get their own static pages at `/tools/door` and
`/tools/families` (written by the same `vite.config.ts` build step, no new
mechanism), and `src/lib/entry.ts`'s `pathFor` keeps the address bar on
either path while its screen is showing, exactly like `read`/`beforeYes`
already do. Every mint site with an unambiguous target now uses the path
form: `Cohort.tsx`'s door invitation, both of `ending.ts`'s married-share
links, and `words.ts`'s `eleven`/`family` cases. Verified with `curl` against
the built files:

```
/tools/door       → "The door — where the pool for your city stands"
/tools/families   → "Bringing the families in — the words, word for word"
```

and with a real Chromium navigation: land on either path, the right screen
renders; refresh, it renders again; leave, the address bar returns to `/`.

**One related gap found and deliberately not fixed here.** `words.ts`'s
`read`/`guide` case still mints the query form (`instrumentLink('read',
'words')`), because which side to read (`is-he-serious` vs. `is-she-serious`)
is gender information that isn't available at that call site — `Script`
(`src/data/read.ts`) carries no gender, and `wordsLink` is called from three
places (`ScriptCard`, `Coach.tsx`'s guide words, `home/FollowUp.tsx`).
Threading a reader's side through all three for a card that already names
the product correctly is real, separate scope — flagged here rather than
rushed.

**Copy/paste — reviewed, working as intended.** After landing on any
query-string link, coded or instrument, `main.tsx` strips the query and the
address bar is left showing bare `/` — confirmed live for `?couple=…` and
`?read`. This means copying the address bar to re-share a coded link (a map,
a couple code, a vouch code) does not work; the app's own Share buttons
always mint a fresh, correct link instead. This is not an oversight: it is
the same direction as an earlier, deliberate privacy decision (the vouch
token change, `docs/DEPLOY.md`, "Links already sent") to keep a personal
code out of anywhere it could linger — browser history, autocomplete, a
screenshot. Not reversed here. The two pathed families (`read`/`eleven` and
now `door`/`families`) don't have this problem at all, since their address
bar keeps the real link visible the whole time.

**WhatsApp / iMessage / SMS / Telegram.** What's actually testable from a
sandbox with no access to any of these apps: the OG tags each one's
unfurl mechanism reads, confirmed correct above for every path-based
instrument. What's known, general platform behavior rather than something
observed here: WhatsApp and Telegram's crawlers (like Twitter's and
Facebook's) fetch a URL server-side and run no JavaScript, which is exactly
why every card here is baked into the static HTML at build time rather than
rendered client-side. iMessage and SMS on iOS both hand a tapped link to the
real system Safari, which shares storage normally with the browser proper.
Telegram (and some Android WhatsApp configurations) can open a link in
their own in-app browser instead — a separate storage origin from the
phone's regular browser, so a map restored there would not be visible later
in Safari or Chrome proper. Worth naming plainly rather than either
ignoring or treating as a bug: it isn't fixable from this side, and the
product doesn't need it fixed — `src/lib/entry.ts`'s own docblock already
says why a coded link's failure is a no-op by design (a wrong code, a dead
function, or no network "simply renders the app she would have seen
anyway"), which is exactly the property that makes this platform quirk a
non-event rather than a broken experience.

**Browser back — confirmed working as designed, not a footgun.** `App.tsx`
uses `history.replaceState` exclusively, never `pushState` — a deliberate
choice its own comment states plainly ("Back behaves as it always has").
Verified live: landing on a tool link, tapping "Start the read", answering a
question, then pressing the actual browser Back button exits the tab
entirely — to `about:blank` in a fresh context, to WhatsApp or wherever the
link was opened from on a real phone. That is the same thing Back already
does on any simple linked page, not a broken or stuck state. What matters
more — whether leaving loses anything — is answered below.

**Refresh — confirmed graceful on every path tested.** Mid-instrument
(inside the read, one question answered), a browser-back exit followed by
reopening the *same* link shows *"Pick up where you left off — You answered
1 of 11"* — `src/lib/draft.ts`, a fix from an earlier Fogg-model pass,
confirmed live rather than trusted from the docblock. Mid-onboarding (on a
non-tool screen, no path to restore from), a refresh drops to Welcome —
but with a visible *"Pick up where you left off"* affordance the moment
there's real progress to resume, confirmed with a live walk: a few taps in,
refresh, and the exact line appears under "Start where you are." Nothing
tested lost data; the worst case anywhere is one extra tap.

**Home-screen installation, manifest, icons — valid, confirmed by
Chromium's own installability check, not by inspection.** `Page.
getInstallabilityErrors` (Chrome DevTools Protocol) reports zero errors
against a real (non-incognito) profile — the manifest, icons and HTTPS-in-
production setup all pass Chrome's actual installability criteria as
shipped. The one icon marked `maskable` was checked by looking at it, not
assumed safe: the glyph sits well inside the safe zone a masked (circular or
squircle) icon shape would crop to, so nothing here needed the extra
padding a maskable icon usually wants. Nothing changed in this category —
verified, not touched.

**Offline shell — the one clear gap, fixed.** `index.html` opts into
standalone/home-screen mode (`apple-mobile-web-app-capable`, the manifest's
`display: standalone`) but registered no service worker. Confirmed the
consequence directly, not assumed: load the built app once, kill the
network entirely (both via CDP network emulation and, for an unambiguous
second check, by killing the actual server process), reload — result was
Chromium's own `net::ERR_INTERNET_DISCONNECTED` page, before a single byte
of Niyyah ran. A member who saved the app to her home screen and opened it
with a weak signal saw that, not even a styled page, let alone any of the
product's own honest failure states (`docs/FAIL.md`). Fixed with a minimal
service worker (`src/lib/serviceWorker.ts`) — full account of what it does,
why, and what it deliberately doesn't in the file's own docblock and in
`docs/FAIL.md`'s new row. Re-verified after the fix, unambiguously: load
once online, kill the server process outright, reload — the real app
renders, with the exact set of cached files printed and checked (the shell
HTML, every JS chunk and font actually visited, and nothing under
`/.netlify/`).

## The budget

- **Every shared link opens the screen it was minted for**, confirmed by a
  real navigation, not just the URL shape — enforced going forward by
  `tests/tools.test.ts` and `src/lib/links.test.ts`'s generic
  loops-over-`TOOLS`, which a new instrument automatically joins.
- **An instrument link with an unambiguous target mints the path form, not
  the query form**, so it always carries its own preview. The one
  documented exception (`words.ts`'s `read`/`guide` case) is named, not
  silent.
- **The service worker never touches `/.netlify/*`.** Pinned by
  `tests/service-worker.test.ts`, mutation-tested: removing the exclusion
  fails it. An offline shell that cached a live API response would be a
  correctness and a trust problem, not a convenience.
- **The service worker's own script is never browser-cached**
  (`netlify.toml`'s `Cache-Control: no-cache` on `/sw.js`), so a fix to the
  shell itself can always reach a phone that already has an old one
  installed.
- **Don't add a fix without the number that justifies it.** This pass
  found two real gaps (the two ungated instrument kinds, and the missing
  offline shell) and confirmed four other categories — direct links, back,
  refresh, installability — already worked, with the evidence to show it
  rather than a screen unchanged out of inertia.

## Verification

`npm run verify` (typecheck, lint, `tests/tools.test.ts`,
`src/lib/links.test.ts`, `tests/service-worker.test.ts`, and every existing
test — none of this touches pinned copy, so nothing else should move) and
`npm run build`. Chromium walks, each against the real built artifact served
over HTTP: `/tools/door` and `/tools/families` land, refresh, and reset the
bar on leaving; the offline reload, confirmed twice (CDP network emulation,
then the server process killed outright) with the exact cache contents
printed. `docs/ASSETS.md`'s N0 row is updated to the new `/tools/door`
address and a new N4 row added for `/tools/families`, both **built, not yet
checked** — neither goes in a pitch until a person opens it on a device with
no session, per that file's own rule.
