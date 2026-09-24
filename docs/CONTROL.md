# Niyyah — what we depend on, and what we own

> The Commandment of Control asks one question of every supplier: what happens
> to this company on the day they change their mind? This is the answer for
> each, ranked, with the repairs that were made and the ones only money can
> make.

## The shape of it

Ten kinds of dependency were audited. **Seven do not apply**, and not by luck —
each was a decision made in an earlier pass, and each is worth defending
rather than quietly giving up later.

| Not a dependency | Because | What it would cost to acquire one |
|---|---|---|
| **Apple App Store** | This is a web app | 30% of everything, a review queue, and a morning when a marriage app for Muslims is pulled by someone who never spoke to this community |
| **Google Play** | Same | Same |
| **Authentication provider** | There are no accounts. A six-character code is the whole identity | An Auth0 or Firebase holding the front door, and a migration nobody survives cleanly |
| **Payment processor** | Nothing is sold yet | Manageable — but see the rule below about where payment must never live |
| **Analytics vendor** | `src/lib/analytics.ts` keeps events in memory for the session and sends nothing anywhere. Operational health is counted by the product itself, as totals with no one in them (`docs/OPS.md`) | A third party watching every member of a marriage app |
| **Social SDKs** | Sharing uses the browser's own share sheet | A tracking pixel on a page about someone's marriage |
| **Paid acquisition** | The product is designed to travel by word of mouth | A channel whose price is set by someone else and rises every year |

**The exposure is one vendor.** Netlify holds the hostname, all nine data
stores, the only customer list, the deploy pipeline, and three secrets its
plan refuses to hide. That is not a spread of risks. It is one point through
which the company can end.

## The ranking

| # | Dependency | If pricing doubles | If access disappears | If policy changes | Can we migrate? | Own the customer? | Own the asset? |
|---|---|---|---|---|---|---|---|
| **1** | **The hostname** | Free, so no | Links keep working: DNS repoints at any host on earth | Nothing to reclaim — the registration is ours | Yes. The address moves with us, which is the whole point of owning one | — | **Yes — `joinniyyah.com` is ours.** Was Netlify's; see below |
| **2** | **Blobs — nine stores** | Free-tier limits, not prices; exceeding them degrades quietly | **Every kept map, vouch, pair sheet, door entry and the whole learning record, gone** | A free account can be suspended on an acceptable-use reading of a marriage app with member content | The surface is get, set, delete, list and one conditional write. A few hundred lines — but there is nothing to migrate if the data is already gone | — | The data yes. **A copy: now yes** |
| **3** | **Forms — a second copy of the customer list** | n/a | The contact, city and country that are also in the `contacts` store, plus three the store does not hold: who they are seeking, how far they would go, and the hardest part **in their own words**. Not the map code — it used to travel here, putting the map's sole authenticator in a third party's row beside the way to reach her, and was dropped in the reality-sprint pass (`docs/BOARD.md`). The `contacts` store is ours and is exported monthly by the loop in `docs/OPERATING.md` | Retention is theirs | The transport is already portable — `VITE_WAITLIST_URL` posts to any endpoint | **Yes — since `docs/OWNED.md` move 2** | **Yes. A copy leaves every month** |
| **4** | **Build and deploy** | n/a | The site cannot be rebuilt; the last deploy keeps serving | Build minutes can change | Yes — it is `npm run build`, a static `dist`, and handlers written against the web-standard `Request` | — | Yes, in git |
| **5** | **The three secrets** | n/a | The edge gate fails open and says so; **every readout fails closed** since 2026-09-12 (`netlify/shared/founder.ts`, `docs/BOARD.md`) — `/export` returns whole records and `/pool` deletes on read, so an unset key refuses rather than publishes | **The free plan refuses to mark them secret**, so every key is plaintext to anyone on the team | Trivial | — | No |
| **6** | **Google Fonts** | Free | Typography falls back; the share card's measurements change | Google saw the IP of every visitor | — | — | **Removed. The fonts are ours** |
| **7** | **Anthropic** | The guide costs double; the per-member budget already caps volume, and one variable turns it off | **Nothing breaks.** The client falls back to a complete local voice and the member sees no error | A refusal or terms change degrades answers only | One function to rewrite | — | **Yes — the five voices and the prompt are ours**, built client-side |
| **8** | **GitHub** | n/a | Git is distributed; every clone is a full copy | — | Minutes | — | Yes |
| **9** | **npm** | n/a | Builds blocked until mirrored; the lockfile pins everything | — | Yes | — | Yes |

## What was repaired

**The hostname is a setting.** `src/lib/site.ts` reads `VITE_SITE_HOST`;
`vite.config.ts` writes the same value into the social-card tags at build
time; `index.html` carries no hostname of its own. Both default to today's
value, so nothing changed. The day a domain exists, one variable moves every
link and every share card at once, and a test keeps the two defaults from
drifting apart.

**The learning record has a copy.** `netlify/functions/export.ts`, founder-gated,
returns every progress record whole, the joint tally, and the door as counts.
Saving it is the last line of the monthly hour in `docs/OPERATING.md`.

What it refuses to return is the more important half, and it is documented in
the file itself: no kept maps, because a single endpoint that dumps every
member's answers is exactly the honeypot `docs/LEARNING.md` exists to prevent,
and her map is hers, on her phone; no vouches, because a family member's phone
number cannot be un-leaked and a vouch can simply be asked for again; no pair
sheets, which expire by design; and the door as counts rather than records,
because cohort keys carry map codes and a list of those is a list of keys to
everyone's map.

**The fonts are ours.** Google Fonts was the only third-party origin the
browser ever touched. Four files, Google's own woff2 unmodified, licence
alongside.

**The guards say when they are off**, once per cold start, so "the gate is
open" and "the readouts are public" appear in a log rather than being
discovered.

**The tests run before `main` deploys** — since 2026-09-12, literally:
`netlify.toml`'s build command runs `npm run verify` first, so a red test
fails the build and the last passing deploy keeps serving. Before that the
workflow ran *alongside* the deploy — the same push started both — and a red
run stopped nothing (`docs/BOARD.md`). The workflow is in the repository, so
it leaves with the code if the host ever changes.

## What only money can fix

**Buy a domain.** This was the highest-value item in the audit and the one
thing that could not be done in code. **It is done.** `joinniyyah.com` is
registered, it is the site's primary URL, and `VITE_SITE_HOST` carries it in
every context. The cutover, with what remains:

1. ~~Buy it. Add it in Netlify under Domain management.~~ **Done.**
2. ~~Point the DNS as Netlify instructs, and let the certificate issue.~~ **Done.**
3. ~~Set `VITE_SITE_HOST` to the new host.~~ **Done** — and, since
   `docs/OWNED.md`, the *default* in `src/lib/site.ts` and `vite.config.ts` is
   the owned domain too, so a build that loses the variable still points home
   rather than at the landlord. `tests/durable.test.ts` refuses a platform
   subdomain as the default from here on.
4. **Never release the `getniyyah.netlify.app` subdomain.** Netlify keeps
   serving it and redirecting, and that is the only thing that keeps links
   already sitting in people's messages alive. Still true, for ever.
5. **Set up mail on the domain. This is the one step still open**, and as of
   2026-09-10 it is the founder's to do — everything around it is ready.
   `VITE_CONTACT_EMAIL` is a Gmail address today, and it reaches a human,
   which is the part that matters most. What is still rented is the domain it
   sits on: the public address of this business — printed on the Trust page,
   offered as the fallback when a signup fails — lives on Google's name rather
   than on ours, so it cannot be repointed or handed on. The code's default is
   now `salaam@joinniyyah.com`; until a mailbox answers there, production must
   keep the variable set. Forwarding the new address to the inbox that already
   works is the whole migration.

   **The runbook, in order. The order is the important part.**

   1. **Choose how mail arrives.** Forwarding is enough and costs nothing —
      ImprovMX or Cloudflare Email Routing (the latter wants the zone on
      Cloudflare) will forward `salaam@joinniyyah.com` to the inbox that
      already works. A real mailbox (Fastmail, Migadu, Google Workspace) is
      the same migration plus a few dollars a month, and is worth it only if
      replies should *come from* the address rather than merely reach it.
      Either satisfies what `docs/OWNED.md` is asking for: the address a member
      touches is on a domain we can repoint or hand on.
   2. **Add the records** the provider gives you to whichever zone serves
      `joinniyyah.com` — MX at minimum, usually an SPF TXT, sometimes DKIM.
      Nothing in this repository or its tooling can reach DNS, so this is a
      by-hand step wherever the zone lives.
   3. **Prove it.** Send one message to `salaam@joinniyyah.com` from an
      unrelated account and watch it land. Do not skip this: every step below
      assumes mail actually arrives, and the failure it guards against is
      silent.
   4. **Only then, flip the variable.** Set `VITE_CONTACT_EMAIL` to
      `salaam@joinniyyah.com` — or remove it, since that is already the code's
      default — and redeploy.
   5. **Check the two places a member meets it**: the Trust page, and the
      fallback a failed signup shows.

   **Why the flip is last and not first.** `src/lib/site.ts` carries the
   default `salaam@joinniyyah.com`, and `src/lib/waitlist.ts` uses
   `CONTACT_EMAIL` as its final fallback when a signup cannot be posted. Point
   production at an address that does not yet receive mail and that fallback
   becomes a black hole: a woman whose signup failed writes to us and nobody
   ever sees it. `site.ts` says it plainly — *"if it bounces, a person who
   tried to join is lost silently."* The Gmail address is doing real work until
   the moment the new one answers, and not one moment less.

**Then own the customer list. Done** — `docs/OWNED.md` move 2. Every join now
writes the way to reach that person to a `contacts` store of our own, keyed by
her code, and `docs/OPERATING.md`'s monthly hour exports it to a file beside
the backup. Netlify Forms keeps running as a second copy, and its transport
was already portable. What changed is that the list is no longer only theirs:
if that account ended tomorrow, the people waiting for a pool could still be
told it opened.

No endpoint returns a contact — not the door's tally, not the backup, which
refuses member contact for the same reason. It is read in the store, with the
founder's own credentials, exactly like the vouch sentence and phone.

## Considered and declined

**An abstraction layer over Blobs.** The surface is six methods. A migration
is a few hundred lines, and the handlers are already written against the
web-standard `Request`, so they move to Deno, Bun, Cloudflare or plain Node
almost unchanged. A layer built today would buy nothing and cost clarity every
day between now and a move that may never happen. The control move for storage
is a *backup*, not an *interface* — and the backup is built. Revisit if a
second runtime is ever actually needed.

**A service worker for offline use.** Real offline support means cache
invalidation and an update flow, which is a lot of machinery for a benefit
this audit does not rank highly: the app is opened when something happens, and
what a person needs to keep — her map, her words — is already on her phone in
`localStorage`. Revisit if members start reporting that the app is unreachable
when they need it.

**A second host on standby.** Two deployment targets to keep in sync, for a
risk the backup already covers. Revisit if the company ever depends on
minutes of downtime, which it does not.

## The rules this audit leaves behind

- **Never take payment inside an app-store binary.** Not 30%, and not a
  billing relationship where Apple knows the customer and we do not.
- **Never add a dependency that sees a member.** No analytics vendor, no
  session replay, no tracking pixel, no chat widget, no font CDN. The list of
  third parties the browser contacts should stay at zero.
- **The contact list is the one asset with no copy.** Anything that touches
  it should make it more ours, never less.
- **A guard that fails open must say so.** Unset means open is a good
  convention; silently open is not.
- **Check this file when adding any dependency.** Six questions: pricing
  doubles, access disappears, policy changes, can we migrate, do we own the
  customer, do we own the asset.

## Accounts, recovery, rotation

Every recovery above assumes one person is available and logged in. This is
the record that makes a second person possible (`docs/BOARD.md`, decision 9).
The founder fills the blanks; a copy of the filled table, sealed, goes to one
trusted person.

| Account | 2FA on | Recovery codes kept where | Second person | Notes |
|---|---|---|---|---|
| GitHub (`bankroll10`) | — | — | — | Owns the repository. **Public as of 2026-09-24** (this row said private; the API says otherwise) — the monthly backup artifact waits on it going private (`docs/OPS.md`). Also where the health and deploy alerts arrive, by email |
| Netlify (the team) | — | — | — | Holds every store, every secret and the deploys; "team access is the whole boundary" |
| Anthropic console | — | — | — | **Monthly spend limit set:** — **(write the number here the day it is set; blank means unset).** The bound outside the code (`netlify/functions/guide.ts`) — and since 2026-09-17 the guide fails closed when its own counter cannot be read (`docs/RISKS.md` R5), so the console limit is the second bound rather than the only one |
| Registrar for joinniyyah.com | — | — | — | Registrar: — · Expires: — · Auto-renew: — · Registrar lock: — . Renew for several years |
| Gmail (the inbox `VITE_CONTACT_EMAIL` points at) | — | — | — | Until step 5 above forwards the owned address |

**Rotation.** The two secrets that exist (`ANTHROPIC_API_KEY`, `FOUNDER_KEY`
— `PREVIEW_PASSWORD` is unset since 2026-09-12 and would join them the day
the close switch is used) rotate the day a second person joins the
Netlify team or a new tool is connected to it, and in any case once a quarter;
the monthly hour checks the date of the last rotation. `FOUNDER_KEY` also
lives as a GitHub Actions secret (`.github/workflows/watch.yml`) and rotates
in both places in the same hour.
