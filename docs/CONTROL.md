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
| **Analytics vendor** | `src/lib/analytics.ts` writes to `localStorage` and sends nothing anywhere | A third party watching every member of a marriage app |
| **Social SDKs** | Sharing uses the browser's own share sheet | A tracking pixel on a page about someone's marriage |
| **Paid acquisition** | The product is designed to travel by word of mouth | A channel whose price is set by someone else and rises every year |

**The exposure is one vendor.** Netlify holds the hostname, all six data
stores, the only customer list, the deploy pipeline, and three secrets its
plan refuses to hide. That is not a spread of risks. It is one point through
which the company can end.

## The ranking

| # | Dependency | If pricing doubles | If access disappears | If policy changes | Can we migrate? | Own the customer? | Own the asset? |
|---|---|---|---|---|---|---|---|
| **1** | **The hostname** | Free, so no | **Every link ever sent dies and cannot be redirected** — the vouch link a father opened, the couple link a man answered, every restore link, the footer of every share card | A subdomain is theirs to reclaim or rename | Forward only. New links carry a new name; the ones already in people's messages cannot be saved | — | **No. The address is Netlify's** |
| **2** | **Blobs — six stores** | Free-tier limits, not prices; exceeding them degrades quietly | **Every kept map, vouch, pair sheet, door entry and the whole learning record, gone** | A free account can be suspended on an acceptable-use reading of a marriage app with member content | The surface is get, set, delete, list and one conditional write. A few hundred lines — but there is nothing to migrate if the data is already gone | — | The data yes. **A copy: now yes** |
| **3** | **Forms — the only customer list** | n/a | **The only way to reach any member, gone.** No code reads it back; recovery is a dashboard CSV | Retention is theirs | The transport is already portable — `VITE_WAITLIST_URL` posts to any endpoint. The existing rows are not | **No. Netlify holds it** | No |
| **4** | **Build and deploy** | n/a | The site cannot be rebuilt; the last deploy keeps serving | Build minutes can change | Yes — it is `npm run build`, a static `dist`, and handlers written against the web-standard `Request` | — | Yes, in git |
| **5** | **The three secrets** | n/a | Both guards fail open, and now say so | **The free plan refuses to mark them secret**, so every key is plaintext to anyone on the team | Trivial | — | No |
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

**The tests run before `main` deploys.** `main` auto-deploys on merge and
nothing was checking it first. The workflow is in the repository, so it leaves
with the code if the host ever changes.

## What only money can fix

**Buy a domain. It is the highest-value item in this audit and it costs about
a dollar a month.** Everything else here is a repair; this is the one thing
that cannot be done in code.

Until then, every link this product has ever put in somebody's hands points at
an address owned by a company that has no obligation to us. The code is now
ready for the switch. The cutover, once a domain exists:

1. Buy it. Add it in Netlify under Domain management.
2. Point the DNS as Netlify instructs, and let the certificate issue.
3. Set `VITE_SITE_HOST` to the new host, and `VITE_CONTACT_EMAIL` to an
   address on it that a person actually reads. Redeploy.
4. **Never release the `getniyyah.netlify.app` subdomain.** Netlify will keep
   serving it and redirecting to the new host, and that is the only thing that
   keeps links already sitting in people's messages alive.
5. Set up mail on the domain, so the contact address stops being a promise.

Note the address in the code today, `salaam@niyyah.app`, is on a domain nobody
here owns. It is the last fallback in `src/lib/waitlist.ts`, which means a
person who tried to join when the form was down would be sent to an inbox that
does not exist.

**Then own the customer list.** The transport is already portable: set
`VITE_WAITLIST_URL` and signups post to any endpoint. Until something is
listening there, the only list is Netlify's — export it from the dashboard
whenever it matters, and remember it is the one asset here with no copy.

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
