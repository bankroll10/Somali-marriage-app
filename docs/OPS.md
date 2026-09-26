# Operations

This is the founder's runbook for the service. It covers who holds each account, how `main` goes live, how to tell whether the site is all right, how to read the readouts, how to recover from the ten worst days, what runs on a clock, and what to change as load grows. It holds nothing about members. How the product is doing is `docs/RESEARCH.md`'s monthly loop.

## Accounts and who owns them

Every recovery below assumes one person is available and signed in. This table is what makes a second person possible (`docs/DECISIONS.md`, decision 9). The founder fills the blanks, and a sealed copy of the filled table goes to one trusted person.

| Account | 2FA on | Recovery codes kept where | Second person | Notes |
|---|---|---|---|---|
| GitHub (`bankroll10`) | — | — | — | Owns `bankroll10/Somali-marriage-app`. **Public as of 2026-09-24**; the monthly backup artifact waits on it going private. The health and deploy alerts arrive here by email |
| Netlify (the team; site `getniyyah`) | — | — | — | Holds every store, every secret and the deploys. It is on `nf_team_dev`, the free tier, so team access is the whole boundary |
| Anthropic console | — | — | — | **Monthly spend limit set:** — (write the number here the day it is set; blank means unset). The bound outside the code |
| Registrar for `joinniyyah.com` | — | — | — | Registrar: — · Expires: — · Auto-renew: — · Registrar lock: —. Renew for several years |
| Gmail (the inbox `VITE_CONTACT_EMAIL` points at) | — | — | — | Stays until mail on the domain forwards to it (below) |

**Rotation.** `ANTHROPIC_API_KEY` and `FOUNDER_KEY` rotate once a quarter, and also on the day a second person joins the Netlify team or a new tool is connected to it. `FOUNDER_KEY` lives both in Netlify and as a GitHub Actions secret, so rotate it in both places in the same hour. `PREVIEW_PASSWORD` joins them the day the close switch is used.

### What we own and what we rent

The test for each supplier is: if it disappeared tomorrow, would we still have the thing?

| Dependency | If it goes | Position |
|---|---|---|
| **The hostname** | Nothing: DNS can point at any host | **Owned.** `joinniyyah.com` is registered to the founder and is the site's primary URL. It ranks first because links already sent cannot be corrected. `src/lib/site.ts` and `vite.config.ts` default to it, and `tests/durable.test.ts` refuses a hosting supplier's subdomain as the default |
| **Netlify Blobs**, seven stores | Every kept map, sheet and report, and the learning record | The data is ours, and `/export` is its copy (Recovery, below). The storage surface is get, set, delete, list and one conditional write, so moving is a few hundred lines |
| **Netlify build and deploy** | The last deploy keeps serving | The build is `npm run build` producing a static `dist`, with handlers written on the web-standard `Request`. The test gate is `verify.yml`, which lives in the repository and leaves with it |
| **The secrets** | — | The free plan refuses to mark variables secret, so each one is plaintext to the team. Rotation is the control |
| **Anthropic** | Nothing breaks. The offline voice answers, and no error is shown | The four voices, the prompt and the local answer engine are ours. Replacing the model means rewriting one function |
| **GitHub** | Every clone is a full copy | Minutes to move |
| **npm** | Builds wait until packages are mirrored. The lockfile pins everything | — |
| **Google Fonts** | — | Removed. Four woff2 files are self-hosted with their licence |

**Not dependencies, by decision.** There is no app store (it is a web app), no authentication provider (a code is the whole identity, `netlify/shared/code.ts`), no payment processor (nothing is sold), no analytics vendor (operations are counted as totals, below), no social SDK (sharing uses `navigator.share`) and no paid acquisition.

**Rules this leaves:**
- Never take payment inside an app-store binary.
- Never add a dependency that sees a member: no analytics, session replay, pixel, chat widget or font CDN. The browser contacts no third party today.
- A guard that fails open must say so. The gate and the founder key each log a line once per cold start when they are unset.
- Before adding a dependency, ask six questions: what if pricing doubles, what if access disappears, what if policy changes, can we migrate, do we own the customer, do we own the asset.

**Considered and declined:** an abstraction layer over Blobs (the control move for storage is a backup, not an interface; revisit only if a second runtime is ever needed), and a second host on standby (two targets to keep in sync, for a risk the backup already covers).

### The mailbox: the one open step

`VITE_CONTACT_EMAIL` points at a Gmail inbox that a person reads. An address on a mail provider's domain is the last rented thing a member uses to reach us: it cannot be repointed or handed on. The code's default is `salaam@joinniyyah.com`, which does not receive mail yet, so production must keep the variable set. Move it over in this order:

1. **Choose how mail arrives.** Forwarding is enough and costs nothing: ImprovMX, or Cloudflare Email Routing if the zone is on Cloudflare. A real mailbox (Fastmail, Migadu, Google Workspace) is worth paying for only if replies should come *from* the address.
2. **Add the provider's records** (MX, usually SPF, sometimes DKIM) wherever the `joinniyyah.com` zone lives. Nothing in this repository can reach DNS.
3. **Prove it.** Send one message from an unrelated account and watch it arrive.
4. **Only then** set `VITE_CONTACT_EMAIL` to `salaam@joinniyyah.com`, or remove it, and redeploy.
5. **Check the contact link** on Home and on Trust.

The switch comes last because an address that bounces loses the person who wrote in, and nobody finds out. Never release `getniyyah.netlify.app`: Netlify keeps serving it and redirecting, and that is what keeps links already in people's messages alive.

## Deploy

**`main` is what the world sees.** A merge to `main` should be live within a couple of minutes, without anyone having to remember a step.

### Netlify builds from GitHub

This is set once, in the dashboard at `https://app.netlify.com/projects/getniyyah`. Linking a repository cannot be done from the API or from an agent session.

1. Go to Site configuration → Build & deploy → Continuous deployment → Link repository, and pick `bankroll10/Somali-marriage-app`.
2. Set **Production branch** to `main`. If it names any other branch, every merge to `main` does nothing.
3. Leave the build command and publish directory as they are. `netlify.toml` overrides the dashboard.
4. Run Deploys → Trigger deploy once. The new deploy should read `branch: main` and name a git build as its source, not `api`.

Two signs show the site has stopped following `main`. The first is **a production deploy whose branch is not `main`**, showing `deploy_source: api` and `has_source_zip: true`: someone ran a deploy command from a local folder, Netlify is not watching GitHub, and merging changes nothing. The second is **a quiet Netlify feed while `main` keeps moving**: with no trigger there is no build and no error. Run `git log --oneline <live commit_ref>..origin/main | wc -l`; any number above zero is how many commits the world cannot see.

**Deploying by hand, when you must.** Deploy a branch as a **branch deploy** (`<branch>--getniyyah.netlify.app`), never to production. After any hand deploy to production, trigger a deploy from `main` so the live site is `main` again.

### `netlify.toml`

- **Build.** The command is `npm run verify && npm run build`. Typecheck, lint and the whole suite run first, so a failing test fails the build and the last passing deploy keeps serving. It publishes `dist`, with functions from `netlify/functions` and the edge function from `netlify/edge-functions`.
- **Environment.** `NODE_VERSION = "22"`, which `verify.yml` must match (`tests/deploy-layout.test.ts` checks it). `NPM_FLAGS = "--include=dev"`, because every build tool is a devDependency and `npm ci` under `NODE_ENV=production` would otherwise prune them. Commit `package-lock.json` in the same change as `package.json`, or `npm ci` fails.
- **One rewrite.** `/*` goes to `/index.html` with status 200. Functions and real files (`/tools/*`, `/guides/*`, `robots.txt`, `sitemap.xml`) are served before it.
- **Headers on every path.** `X-Frame-Options: DENY`, `Content-Security-Policy: frame-ancestors 'none'`, `nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, a `Permissions-Policy` that asks for nothing, and a year of HSTS (`docs/SECURITY.md`, O7). `/sw.js` also gets `Cache-Control: no-cache`. Confirm the headers after a deploy with `curl -sI https://joinniyyah.com/ | grep -iE 'x-frame|content-security|strict-transport'`. If a page ever needs to be framed, decide that deliberately rather than deleting the header.
- **No `noindex`, ever.** `netlify.toml` must not send `X-Robots-Tag` or `noindex`, and `tests/deploy-layout.test.ts` fails if it does. Until 2026-09-13 a `noindex` header and a disallowing `robots.txt` cancelled each other out. The crawler was blocked, so it never read the header, and the domain sat in Google as a bare URL reading "No information is available for this page", while another Niyyah held the name with a real title. Today `robots.txt` and `sitemap.xml` are written by `vite.config.ts` using the configured host.

### CI workflows (`.github/workflows/`)

Every workflow's token can read the repository and do nothing else (`docs/SECURITY.md`, O10).

| File | Runs | Does |
|---|---|---|
| `verify.yml` | Every PR, and every push to `main` | `npm ci`, `npm run verify` and `npm run build` on Node 22 |
| `deployed.yml` | Every push to `main`, or by hand | Waits up to 15 minutes for `/version.json` to report the pushed commit, then smoke-tests it (below). A newer push cancels the older wait |
| `watch.yml` | Every 3 hours; the 1st of each month at 09:30 UTC; or by hand | The health job and the monthly backup (both below) |
| `guide-eval.yml` | PRs touching `netlify/shared/prompt.ts`, `netlify/functions/guide.ts`, `src/lib/coach.ts`, `src/data/coach.ts` or `tests/guide-eval/**`; or by hand | Evaluates the live guide, at about $4 a run. Without an `ANTHROPIC_API_KEY` repository secret, or when its account has no credit, it warns and passes. The offline eval gates every PR inside `verify` (`docs/GUIDE-EVAL.md`) |

### Environment variables

Set these in Netlify under Site configuration → Environment variables, unless the row says otherwise. None of them lives in the repository.

| Variable | What it does | Unset means |
|---|---|---|
| `PREVIEW_PASSWORD` | The close switch (below). Leave "Contains secret values" unchecked, because edge functions cannot read secret-scoped variables | No gate. This has been the normal state since 2026-09-12 |
| `ANTHROPIC_API_KEY` | Turns on the live guide (`netlify/functions/guide.ts`). A GitHub Actions secret of the same name lets `guide-eval.yml` run. Give that one its own key with its own console spend limit, so the eval can never spend the members' budget | The guide answers in its offline voice, with no error shown. Without the GitHub secret, the live eval warns and passes |
| `FOUNDER_KEY` | The bearer token on every readout (`netlify/shared/founder.ts`). Also a GitHub Actions secret with the same value, so `watch.yml` can read `/health`. Generate it with `openssl rand -base64 32` | **Every readout answers 401** (fails closed since 2026-09-12), and every health run is red. The fix is to set it |
| `VITE_SITE_HOST` | The host used in every link the app hands out, every share card, `robots.txt` and `sitemap.xml`. Set it in every context | `joinniyyah.com` |
| `VITE_CONTACT_EMAIL` | The contact link on Home and Trust | `salaam@joinniyyah.com`, which does not receive mail yet. Keep this set (above) |
| `VITE_OPERATOR_NAME` | Who Trust names as running Niyyah: a full legal name, or a company's registered name. A setting so that a name stays out of the public repository | "its founder", which names nobody. Set it before strangers arrive (`docs/DECISIONS.md`, the completion review) |
| `OPS_COST_ALERT_USD` | The estimated guide spend in a day at which `/health`'s `cost` check turns red | `20`, about half of the worst possible day under the caps |
| `SITE_URL` (GitHub → Variables) | The site that `watch.yml` and `deployed.yml` check | `https://joinniyyah.com` |
| `BACKUP_TO_ARTIFACT` (GitHub → Variables) | Set it to `true` to have the monthly job save `/export` as a 35-day artifact. Set it only once the repository is private: an artifact on a public repository can be downloaded by anyone signed in to GitHub | No artifact. Back up by hand |
| `NETLIFY_AUTH_TOKEN` (your shell only) | Lets `scripts/restore.ts` reach the stores. Create one under Netlify → User settings → Applications | The restore script refuses to run |

**Caps.** Every `*_HOURLY_CAP` and `*_DAILY_CAP` is a circuit breaker, not a member limit (`netlify/shared/limit.ts`). Each is one counter per bucket per period, with no identity attached. A refusal is the same quiet `503 rate_limited` that a client already treats as "try later", so past a cap a member sees what she sees when storage is down. The cap is read on every call, but Netlify hands functions their variables at deploy time: a changed cap takes effect once you redeploy (Deploys → Trigger deploy), not before.

| Variable | Bounds, per hour from everyone unless stated | Default |
|---|---|---|
| `GUIDE_HOURLY_CAP` | Live guide calls | `300` |
| `GUIDE_DAILY_CAP` | Live guide calls per UTC day. **The only cap that bounds a month**, and the only one on a route that spends money | `400` |
| `KEEP_HOURLY_CAP` | Maps kept (`POST /keep`) | `300` |
| `RESTORE_HOURLY_CAP` | Maps restored (`GET /keep`). A map code is the sole authenticator, so an unmetered read would let a script guess codes (`docs/SECURITY.md`, O8) | `600` |
| `FORGET_HOURLY_CAP` | Maps forgotten and codes changed (`DELETE` and `PUT /keep`) | `600` |
| `COUPLE_HOURLY_CAP` | Elevens started | `200` |
| `COUPLE_READ_HOURLY_CAP` | Joint sheets read back | `600` |
| `COUPLE_ANSWER_HOURLY_CAP` | His answers to a sent eleven | `600` |
| `COUPLE_FORGET_HOURLY_CAP` | Joint sheets deleted | `600` |
| `SAFETY_HOURLY_CAP` | Reports filed against a pair that exists, so made-up codes cannot bury a real report | `30` |
| `SAFETY_PROBE_HOURLY_CAP` | Report attempts of any kind, checked before the pair is looked up. Past it, a miss is a 503, not a 404 | `600` |
| `PROGRESS_HOURLY_CAP` | Rung reports | `1000` |
| `PROGRESS_FORGET_HOURLY_CAP` | Rung records deleted | `600` |
| `HEALTH_HOURLY_CAP` | Crash beacons from phones (`POST /health`) | `60` |

**Hyphens become underscores.** A bucket name may contain a hyphen (`couple-read`), and a hyphen cannot appear in an environment variable name. `envName()` in `netlify/shared/limit.ts` upper-cases the bucket and turns each hyphen into an underscore, so `couple-read` reads `COUPLE_READ_HOURLY_CAP` and `safety-probe` reads `SAFETY_PROBE_HOURLY_CAP`. `tests/caps-function.test.ts` holds this.

**The guide fails closed.** Every storage route lets a call through when its counter cannot be read. The guide refuses instead (`overCapOrUnknown`, `docs/PRODUCT.md` R5), because it bills per call. A call costs about 2¢. The body is limited to 32 KB, the thread is cut to ten turns and the answer is capped, so the worst call is about 9¢ and the worst day about $36; an ordinary founding month is about $8. The console's monthly spend limit is the bound outside the code.

Three rules about these variables:
- **The name is the whole contract.** A variable spelled any other way is read by nothing and protects nothing, yet it looks on the dashboard exactly like a setting that works.
- **The free plan cannot hide values.** Marking a variable secret is refused with a 422, so assume every value is readable by anyone on the team and by any tool acting for it. On a paid plan, secret variables reach Node functions but not edge functions, so `PREVIEW_PASSWORD` stays readable either way.
- **Rotation is the control that matters.** Treat a key that has sat in the dashboard as known. For `ANTHROPIC_API_KEY`, create a fresh key at `https://console.anthropic.com/settings/keys`, paste it into Netlify, and delete the old key there.

### Rolling back

Roll back a live, broken deploy first, and work out why second. The data is safe either way: stored records are readable by both older and newer code, and `tests/recovery.test.ts` reads every record shape ever written.

1. In Netlify → the site → **Deploys**, find the last deploy marked **Published** whose `deployed.yml` run was green.
2. Open it and choose **Publish deploy**. It goes live in seconds, with no rebuild.
3. Choose **Stop auto publishing**, so the next push to `main` does not put the broken commit back.
4. Fix it on a branch, and let `npm run verify` and the preview pass before you merge.
5. Choose **Start auto publishing**, and confirm `deployed.yml` is green on the fix.

Practise this once in a quiet hour: publish the previous deploy, check the site, then publish the latest again. Netlify moves these buttons around, and on the real day the minutes matter.

### Did it deploy? Is it up?

Every build writes `/version.json` containing the commit it was built from (`vite.config.ts`, using Netlify's `COMMIT_REF`). After each push to `main`, `deployed.yml` waits for the live site to report that commit, then smoke-tests three things: the page answers 200 and contains the app; `/health` without a key answers 401, so the functions are running; and `GET /keep?code=AAAAAAAA` answers 404 `not_found`, so storage is answering. If the commit never goes live, or goes live and fails the smoke test, the job fails, GitHub emails the owner, and the error message names the rollback above.

### The close switch

**The site is open, and has been since 2026-09-12**, when `PREVIEW_PASSWORD` was deleted. `netlify/edge-functions/gate.ts` stays, dormant. Setting that variable again puts every path behind HTTP Basic at the edge within one deploy, so a visitor never receives the app's HTML. It is the only way to close the site in a single action. It is kept for the day this runbook plans for (Time, below): a safety failure that has to be stopped the minute it is learned of, not after a revert and a build.

**To close,** add `PREVIEW_PASSWORD` (exactly this name, value = the password, "Contains secret values" unchecked) and trigger a deploy. Any username is accepted; only the password is checked, in constant time. **To confirm,** run `curl -sI https://joinniyyah.com/ | head -1`: closed shows `HTTP/2 401`, open shows `HTTP/2 200`. **To reopen,** delete the variable and deploy again.

### Being found, and the pages that must answer

**Google Search Console** is the founder's job, done once. Add a **Domain** property for `joinniyyah.com` and verify it with the DNS TXT record it asks for; the property covers every subdomain and both schemes. Submit `sitemap.xml`, then use URL Inspection → Request indexing on `https://joinniyyah.com/`, once only. Its "View crawled page" should show the real title and description from `src/data/brand.ts`. A week later, search `site:joinniyyah.com`: if it still says "No information is available", a block has come back or the gate is on. Bing Webmaster Tools can import the property.

The tools each have their own page, written at build time from `src/data/tools.ts` (`src/lib/toolPages.ts`): `/tools/is-he-serious`, `/tools/is-she-serious`, `/tools/before-you-say-yes` and `/tools/families`. The eleven also exist as `/guides/before-you-say-yes` and `/guides/before-you-say-yes/sample` (`src/lib/guidePages.ts`). After a deploy that changes these pages, `curl -sI` one of them; it should answer 200. A 301 means Netlify's "Pretty URLs" setting is adding a trailing slash, so turn it off under Build & deploy → Post processing. Before a link goes into a pitch, check it against `docs/ASSETS.md`, the one place an address is declared live.

**The offline shell.** The build writes `dist/sw.js` (`src/lib/serviceWorker.ts`), registered in production only. It fetches network first, caches only the shell, and never touches `/.netlify/*`. It caches a page by its path alone, so a `?map=` or `?couple=` code never lands on the phone's disk. The cache name is a hash of the build, so each deploy rotates the cache on its own.

**The "Powered by Netlify" badge** is added at the edge on free projects, not by any file here. Turn it off at Netlify → `getniyyah` → Project configuration → General.

## Health and ops signals

This is a smoke alarm: quiet while things are fine, and loud only when they are not. It counts operations of the service, never members.

### Where to look

1. **The dashboard.** GitHub → Actions → **watch** → the latest **health** run → its Summary. The run happens every three hours and produces one table of checks, each 🟢 🟡 or 🔴 with one sentence. It works on a phone.
2. **The email.** A red check fails the job, and GitHub emails you. That email is the only alert. Each check sends it on its own cadence:

   | Cadence | When a red check emails you | Checks |
   |---|---|---|
   | `now` | The next run | `storage`, `functions`, `claude`, `cost`, `limits`, `client`, `data`, and the app being down |
   | `daily` | The 09:00 UTC run | `safety-urgent` |
   | `weekly` | Monday's 09:00 UTC run | `safety`, `backup`, `sweep` |

   A run you start by hand (Actions → watch → Run workflow → `health`) fails on anything red, whatever its cadence. An amber check never emails.
3. **The raw numbers.** Run `curl -s -H "Authorization: Bearer $FOUNDER_KEY" https://joinniyyah.com/.netlify/functions/health | jq .`. `.checks` is the table and `.days` is seven days of totals per signal. This read costs nothing: it makes no call to Claude.
4. **Whether a deploy landed.** Check GitHub → Actions → **deployed**.
5. **The lines behind a number.** Netlify → Functions → the function → Logs, where every counted failure is also logged with the prefix `[niyyah] <route>:`. Netlify → Deploys for builds, and console.anthropic.com for the real bill.

### 1. Is the app up?

The health job fetches `/` and `/version.json` from outside, the way a visitor would. The check is red when the page does not answer 200 or answers without the app in it. **Do this:** open the site on your phone, then check Netlify's status page and Netlify → Deploys. A failed build leaves the last good deploy live, so a site that is down is a Netlify incident or DNS. If the site asks for a password, `PREVIEW_PASSWORD` is set.

### 2. Are functions failing?

`functions` sums today's `fail.<route>` counts, which is every caught server error by route. It is amber at 1 error today, and red at 5 today or at any errors on two days running. **Do this:** search the named route's Netlify log for `[niyyah] <route>:`. Most failures come from storage; any other error is a bug, and the log line carries the stack. One error on one day is noise. Errors on two days running are not.

### 3. Are storage calls failing?

`storage` writes, reads and deletes one key on every run. It is amber when that takes more than 2 seconds, and red when it throws. The limiter's own storage failures count as `fail.limit`. **Do this:** check Netlify's status page for Blobs. While storage is down, routes answer 503, and the app says "that is us, not you" and keeps everything on the phone (`docs/DESIGN.md`). The limiter lets storage writes through when it cannot count but holds the guide shut, so an outage cannot run up a bill.

### 4. Is Claude failing?

`claude` reads what the guide counted today: `ok` (a whole answer), `auth` (the key was refused), `rate_limited` (Anthropic's rate limit), `upstream` (an Anthropic error), `unexpected` (anything else), `empty` (no text came back), `stream_ended` (the answer stopped midway) and `not_configured` (no key is set). It is red on any `auth`, because every member is then on the offline voice. It is amber on `not_configured`, or when failures are at least 10% of calls and number at least 3. **Do this:** on `auth`, replace `ANTHROPIC_API_KEY` in Netlify and redeploy. `GET /guide` with the founder key tests the key with one live call, which costs about a cent. On `rate_limited` or `upstream`, check status.anthropic.com; members get the offline voice meanwhile, and nothing is lost.

### 5. Are safety reports waiting?

Two checks count open reports and never read what they say. **`safety-urgent`** is red on any open report of `threats` or `sexual`, and emails in the 09:00 run. **`safety`** is red while anything is open, on a weekly cadence: Monday's 09:00 run emails if any report is waiting, so a report is read within the week Trust and the report screen promise. **Do this:** read `/safety` and resolve each report (The readouts, below).

### 6. Are costs abnormal?

`cost` estimates today's guide spend from the tokens the guide counted, at $5 per million tokens in and $25 per million out (the rates in `guide.ts`), and compares it with the past week's average. It is amber when today is over $2 and more than three times the average, and red at `OPS_COST_ALERT_USD`. **Do this:** check `limits` first, since a loop against the guide shows up there. The real figure is at console.anthropic.com; this one is an estimate, and it says so. To stop spending now, lower `GUIDE_DAILY_CAP`. It takes effect on the next call.

### 7. Are rate limits being hit?

`limits` counts today's refusals by kind of cap, never by what the call was about: a refused restore is counted as `cap.restore`, never with the code. It is amber on any refusal, and red on `guide-d`, which means the guide's daily cap is reached and members get the offline voice until midnight UTC. **Do this:** a launch day, or a group arriving at once, is real traffic, so raise that cap's variable. The same cap refusing all day with no launch is a script. Leave the cap alone, since it is doing its job, and read the route's log. Caps reset every hour; the guide's daily cap resets at midnight UTC.

### 8. Did a deployment fail?

`deployed.yml` is red when the live site still reports an older commit after 15 minutes, or reports the new one and fails the smoke test. The failed job names both commits. **Do this:** open Netlify → Deploys → the failed deploy → its log. `npm run verify` runs first, so a failing test fails the deploy exactly as it fails CI. The last good deploy stays live meanwhile, so the site is stale, not down. If the new commit is live and broken, follow "Rolling back" above.

### 9. Did a backup fail?

`backup` counts the days since `/export` last answered the founder, whether a person or the monthly job called it. It is amber after 31 days, and red after 35 days or if no backup was ever taken. Take one with the command under Recovery.

### Also on the table

- **`data`: has stored data gone missing?** `/health` records the size of `maps` (not counting bookkeeping keys), `progress` and `reports` once a day, as population totals only, and compares each day with the last day on record. It is amber on any drop in `reports` or a drop of more than 10% from 8 or more records. It is red on a loss of more than a quarter, from 8 or more records (2 or more for `reports`). When it is red, follow "Deleted data" under Recovery.
- **`sweep`: the weekly clean-up.** Red when it has not run for more than 8 days, amber when its last run had errors. Errors two weeks running mean a record to look at by hand; its key is in the sweep's log.
- **`client`: the app crashing on phones.** Amber at 3 or more reports today. `chunk` means a screen's code never arrived (a bad deploy, or a CDN problem), and `crash` means a screen threw. `src/lib/crash.ts` sends at most one beacon per page load, from the ErrorBoundary.

### What is counted, and what never is

Counts live in the `ops` store, one number per signal per day, under keys `day/<YYYY-MM-DD>/<signal>`. The signals are a closed list, `OPS_SIGNALS` in `netlify/shared/vocab.ts`: `fail.<route>` for `keep`, `couple`, `progress`, `safety`, `export`, `guide`, `sweep`, `limit` and `health`; `cap.<bucket>` for each cap above, with the guide's split into `guide-h` and `guide-d`; `claude.<outcome>`, plus the `claude.in` and `claude.out` token counts; and `client.crash` and `client.chunk`. `note()` drops anything that is not on the list, so no code, city, id or text can ever be counted. The store also keeps `sizes/<day>`, and `last/export` and `last/sweep` (a day, plus the sweep's error count). The weekly sweep deletes days older than 35. From phones the store receives only that the app crashed or that a screen never arrived, with no stack, no screen, no code and no install id.

It never counts anything per person: no visits, sessions, screens, time in the app or "active users". It never counts guide content, per-member latency, or which code or report an event was about. `/export` does not carry the counts, and they are not a readout.

**Files:** `netlify/shared/ops.ts` (`note`, `failed`, `mark`, `readDays`, `pruneOps`, `probe`, the store sizes); `netlify/shared/counter.ts` (the conditional increment, shared with the limiter); `netlify/functions/health.ts` (the checks, their thresholds, and the crash beacon endpoint); `tests/ops.test.ts` (causes each failure and holds `/health` to what it says).

## The readouts

The founder reads the service and the learning record through six routes under `/.netlify/functions/`. Every one requires `Authorization: Bearer $FOUNDER_KEY`. Without the key, each answers `401 {"error":"founder_only"}` with `WWW-Authenticate: Bearer` and `Cache-Control: no-store`, and with `FOUNDER_KEY` unset in Netlify each one answers 401 to everyone. None has a cap; the key is what bounds them.

| Route | Returns | Read it |
|---|---|---|
| `GET /health` | `{at, status, checks, days}`. Each check has its `id`, `question`, `state`, `cadence`, one-sentence `summary` and `numbers`, followed by seven days of signal totals. Costs nothing | When the email comes. `watch.yml` reads it every 3 hours |
| `GET /safety` | `{reports, resolved: {byReason, byOutcome}}`. Open reports come back whole, oldest first: `id`, `code`, `side`, `reason`, her `details` and the day. Resolved reports come back only as counts. Sent with `no-store` | Weekly, and on the day an urgent report emails |
| `GET /progress` | The ladder: `rungs`, `cohorts` (per arrival month, `arrived` and `followedThrough`), the splits `scenes`, `vias`, `sides` and `sidesByVia`, and `facts` with its `decisions` table (how decisions were made, married and ended alike), `seenAt`, and the `marriedBy` and `followedThroughBy` cross-tabs. Splits are floored, so a cell under five reads `null`. The walk also deletes expired records it passes | Monthly (`docs/RESEARCH.md`). The field-by-field table is in `docs/PRIVACY.md` |
| `GET /couple` with no `code` | `{pairs, topics}`: how many pairs have answered, and for each of the eleven, counts of each joint state | Monthly |
| `GET /export` | The backup, version 3, as a download (Recovery, below) | Monthly, or let the artifact job take it |
| `GET /guide` | `route`, `keyPresent`, `keyLooksValid`, `keyLength`, `model`, `effort`, then one live call's `call`, `ms` and `stopReason`, or its `errorName`, `errorStatus` and `errorMessage`. Spends about a cent | When `claude` is red or amber |

```bash
K="Authorization: Bearer $FOUNDER_KEY"; S=https://joinniyyah.com/.netlify/functions
curl -sI "$S/progress" | head -1                  # without the key: HTTP/2 401
curl -s -H "$K" "$S/safety"   | jq .              # weekly: a report is a person waiting
curl -s -H "$K" "$S/progress" | jq .
curl -s -H "$K" "$S/couple"   | jq .
curl -s -H "$K" "$S/guide"    | jq .              # one live call; rarely
curl -s -H "$K" "$S/export"   -o "backup-$(date +%F).json"
# The North Star: followed-through per hundred arrived, by arrival month, the last two months
curl -s -H "$K" "$S/progress" | jq '.cohorts | to_entries | sort_by(.key) | .[-2:]
  | map({month: .key, perHundred: (if .value.arrived > 0 then (100 * .value.followedThrough / .value.arrived | floor) else null end)})'
```

**Resolving a report.** Run `curl -s -X DELETE -H "$K" "$S/safety?code=<code>&side=<woman|man>&id=<id>&outcome=<outcome>"`, taking `id`, `code` and `side` from the report itself. `outcome` is one of `spoke-to-them`, `told-the-family`, `not-enough` or `no-action` (`src/data/safety.ts`). Resolving deletes the report, including her words, and leaves `resolved/<id>` behind. That stub holds the reason, the day filed, the day resolved and the outcome, with no code and no side, and it is what `resolved.byReason` counts.

**Rules around the queue** (`docs/SECURITY.md` has the reasoning):
- **Members cannot withdraw a report.** Forget me does not remove one, and there is no receipt. A member who asks for one to be dropped writes in. Read the report first, then resolve it as `no-action`.
- **A report outlives its sheet.** A deleted or expired couple sheet leaves `gone/<code>` behind, and a report can still be made against that code for ninety days (`netlify/shared/sheet.ts`).
- **Never confirm to anyone whether a person uses Niyyah.** Never send a code or a map to anyone except the member herself, at her request.

**Before the first link is posted,** remove the founder's own test records so the first arrivals counted are strangers. Run `DELETE /progress?id=<install id>` for each of the founder's devices. The id is `installId()` in `src/lib/progress.ts`, stored in that device's localStorage.

**Public routes need no key.** Keeping a map, reporting a rung, answering the eleven, filing a report and the crash beacon are each bounded by an hourly cap instead (Deploy, above).

## Recovery

The strongest recovery property is that the app is local-first. A member's answers, map, read, eleven and guide threads live on her phone. The server holds the copies she chose to send, plus counts. Most disasters cost the founder visibility and cost members a server feature for a while. They do not cost members their own work.

### The backup

`GET /export` returns the learning record as one dated JSON file: `{at, version: 3, progress, joint, omitted, skipped}`. It holds every progress record the store still keeps (records past their year are left out unless they reached `married`) and the joint tally. It names what it leaves out: kept maps (hers, on her phone, under her code) and couple sheets (they expire in ninety days, and the joint tally keeps what they showed). A record that cannot be read is left out and counted in `skipped` and as `fail.export`, so one bad record never costs the whole backup. Every answer marks `last/export`, which the `backup` check reads.

```bash
curl -s -H "Authorization: Bearer $FOUNDER_KEY" https://joinniyyah.com/.netlify/functions/export -o "backup-$(date +%F).json"
```

Save one every month, somewhere that is not Netlify. It is the only copy of this data outside one vendor. Once the repository is private and `BACKUP_TO_ARTIFACT=true`, the `watch.yml` backup job does this on the 1st of each month as a 35-day artifact. Each run replaces the last (`docs/PRIVACY.md`, R5). The monthly step then becomes checking that the artifact exists.

### The restore

`scripts/restore.ts` loads a backup back into the stores, following the rules in `netlify/shared/restore.ts`:

```bash
NETLIFY_AUTH_TOKEN=… npx tsx scripts/restore.ts backup.json --site <site-id>            # dry run: says what it would do
NETLIFY_AUTH_TOKEN=… npx tsx scripts/restore.ts backup.json --site <site-id> --write    # writes
```

- It reads backup **versions 2 and 3**. A version-2 file, from before 2026-09-24, also carries the door's counts, and those are ignored. Any other version, or a file that is not a backup, is refused.
- It restores progress records and the joint tally, and nothing else. A key that is not an install code, or a record without its rungs, is refused.
- **It never writes over newer data.** A record that is already there is kept, and every write is `onlyIfNew`. `--overwrite` exists; use it only when you mean it.
- `tests/recovery.test.ts` runs a round trip on every PR: export, wipe, restore, export again, and compare. It also checks the dry run, the refusal to overwrite, the refusal of non-backups, and a version-2 file.

### Restore drill

Every quarter, run `scripts/restore.ts` with the last real backup against a **scratch Netlify site**, never production. Do a dry run, then `--write`, then export the scratch site and compare. This is the one restore that exercises the real Blobs API and a real token. **Not yet run:** it needs a scratch site and a token.

### The ten scenarios

Each scenario gives detection, the first hour, recovery, how much can be lost, what members see, and prevention.

### 1. Netlify outage

- **Detect:** the health run (the page does not answer), status.netlify.com, members writing to a mailbox that does not depend on Netlify.
- **First hour:** confirm it; there is nothing to operate. If it lasts more than a few hours, post once where members gather to say their answers are safe on their phones. Change nothing in the repository or DNS in a hurry.
- **Recover:** automatic. A Forget me made during the outage finishes the next time the app opens. A keep is retried by her next tap, and its once key makes the retry the same map, never a second one.
- **Loss and what members see:** no data is lost. A phone that has opened Niyyah before has the shell cached, so the read, Before you say yes on one phone, the map and the offline guide all work. Keeping, the two-phone eleven and reports each say *that is us, not you* and lose nothing. A first-time visitor sees nothing.
- **Prevent:** nothing prevents this within one vendor; local-first is the mitigation. Drill: `tests/journeys/netlify-down.test.tsx`.

### 2. Blob data corruption

- **Detect:** `functions` counts `fail.<route>` when a read throws. The sweep's error count turns `sweep` amber, and `/export` reports `skipped`.
- **First hour:** the log line names the key. Read it with `netlify blobs:get <store> <key>`.
- **Recover:** for a corrupt **map**, delete the key (`netlify blobs:delete maps <code>`); her next keep answers 404 and keeps the whole map again from her phone, under a new code. For a corrupt **progress** record, delete it, then run the restore, which writes only absent records. Delete anything else.
- **Loss and what members see:** at most that one record. Its owner sees *that is us, not you* on that action. Every reader skips or isolates a bad record, so nobody else is affected.
- **Prevent:** every write is `setJSON` from code, and readers tolerate old shapes. The drills plant non-JSON, strings, arrays, `null` and wrong shapes in every store.

### 3. A lost environment variable

- **Detect:** a lost `FOUNDER_KEY` makes every health run fail with "/health answered 401". A lost `ANTHROPIC_API_KEY` turns `claude` amber (`not_configured`). A lost cap variable breaks nothing, because the default applies. A lost `VITE_*` variable shows only after the next build, which uses the defaults.
- **First hour:** set it again in Netlify and redeploy. Set `FOUNDER_KEY` in Netlify and in GitHub, with the same value, in the same hour.
- **Recover:** the next deploy. No data is lost. Members see nothing for `FOUNDER_KEY`, the offline guide for `ANTHROPIC_API_KEY`, and the default host and contact address for `VITE_*`.
- **Prevent:** keep the values in the founder's password manager, which is the record because Netlify shows them to the whole team. Drills unset each secret and show it fails closed or goes offline, never open.

### 4. A compromised Anthropic key

- **Detect:** `cost` goes red or amber, `limits` goes red on `guide-d`, or Anthropic sends a usage email. A revoked key shows as `claude` red (`auth`).
- **First hour, in order:** (1) delete the key at console.anthropic.com, which stops spending at once; (2) create a new key; (3) set it as `ANTHROPIC_API_KEY` and redeploy, with the guide safely offline until then; (4) lower `GUIDE_DAILY_CAP` if the traffic itself is hostile; (5) rotate `FOUNDER_KEY` too if the leak came through the Netlify team.
- **Loss and what members see:** money only, bounded by `GUIDE_DAILY_CAP` × about 9¢ (about $36 a day) and by the console limit if one is set. Members get the offline guide for a few minutes.
- **Prevent:** set the console's monthly spend limit, which is **unset** and only the founder can set. Give `guide-eval.yml` a separate key. Rotate quarterly.

### 5. A bad production deploy

- **Detect:** `deployed.yml` goes red, `client` goes amber (`chunk`), or `functions` goes red.
- **First hour:** roll back first and investigate second ("Rolling back", above).
- **Recover:** fix on a branch, merge, start auto publishing again, and confirm `deployed.yml` is green.
- **Loss:** none from the rollback itself, because records are readable in both directions. A deploy that *wrote* wrongly may need a targeted repair; the ops counts say when the failures began.
- **Prevent:** `npm run verify` gates every build, and the post-deploy smoke test catches what gets through.

### 6. Deleted data

- **Detect:** `data` turns red (above).
- **First hour:** do not trigger the sweep. Take a backup now of what remains. Find out how it happened (Netlify's audit log, and who has team access) before restoring, because a deletion that happens again will delete the restore.
- **Recover, by store:**

  | Store | Recovery | Loss |
  |---|---|---|
  | `maps` | Nothing to restore. Each phone keeps its whole map again on its next keep, under a new code (drilled) | None of her map. A restore link carrying the old code answers not found |
  | `progress`, `tallies` | The restore: a dry run, then `--write` | Everything since the last backup: at most 35 days |
  | `couples` | Not backed up, by design. A pair sends the eleven again | All sheets |
  | `reports` | Not backed up. **This is the loss that matters beyond data**, because each one is a concern about a real person | All open reports. Know the same day, and ask members to report again |
  | `ops`, `limits` | Rebuild themselves | Operational history only |

- **Prevent:** keep Netlify team access to the founder alone, rely on the `data` check, and take the monthly backup.

### 7. A broken migration

- **Detect:** before merge, `tests/recovery.test.ts` reads every record shape ever written (`tests/fixtures/records/v0.json` and `v1.json`) through every route. After merge, `functions` goes red on the routes that read the old shape.
- **First hour:** roll back (scenario 5). Nothing here rewrites records in bulk, so reading is the only thing a migration changes.
- **Recover:** make the reader tolerate the old shape. To add a field, default it on read. To change a meaning, bump the record's `v` (`netlify/shared/record.ts`) and branch on it. Nothing is lost, because records are rewritten one at a time on their next write.
- **Prevent:** the golden corpus. A change that introduces a new record shape adds it to the corpus. Regenerate `v1.json` using the note in the test, and never edit `v0.json`.

### 8. Domain failure

- **Detect:** the health run (the page does not answer), the registrar's expiry emails, members writing in.
- **First hour:** at the registrar, renew or unlock and check the nameservers. `getniyyah.netlify.app` keeps serving the same deploy the whole time, so tell members to use it.
- **Recover:** get the domain back. If it is gone for good, point a new domain at Netlify, set `VITE_SITE_HOST`, and redeploy.
- **Loss:** none on the server. **On phones, access is lost rather than data**, because `localStorage` belongs to the origin: on a new address she sees an empty app until she restores with her code.
- **Members see:** every link already sent stops working (restore links, couple links and tool links). The printed sheets carry `joinniyyah.com` and cannot be recalled. Mail to `salaam@joinniyyah.com` stops.
- **Prevent (the founder's, and the most important item here):** auto-renew on, the registrar lock on, a multi-year renewal, and the registrar row in the accounts table filled in. `tests/recovery.test.ts` builds the guide pages with another host and checks that nothing still names the old one. A full build with `VITE_SITE_HOST=getniyyah.netlify.app` leaves `joinniyyah.com` only in the printed sheets and the contact default.

### 9. Guide runaway cost

- **Detect:** `cost` goes red or amber, `limits` goes red on `guide-d`, or the console shows it.
- **First hour:** lower `GUIDE_DAILY_CAP`, which takes effect on the next call. If the key itself is being abused, follow scenario 4.
- **Recover:** raise the cap once the cause is known. No data is lost; money is bounded by the daily cap, and members get the offline guide until midnight UTC.
- **Prevent:** caps that fail closed, a bounded body and thread, and the cost alarm, all drilled in `tests/ops.test.ts`. Outside the code, the console's spend limit.

### 10. Founder laptop loss

- **First hour, from another device, the same day:** (1) on GitHub, sign out every session and revoke personal access tokens; (2) on Netlify, revoke personal access tokens and sign out other sessions; (3) rotate `FOUNDER_KEY` in Netlify and GitHub in the same hour, and rotate `ANTHROPIC_API_KEY`, since both may have been in a local `.env`; (4) sign out other sessions on the mailbox behind `VITE_CONTACT_EMAIL`, and change the registrar password; (5) treat any `backup-*.json` on the laptop as disclosed if the disk was not encrypted (`docs/PRIVACY.md`).
- **Recover:** sign in on a new device with 2FA and recovery codes, and clone the repository. Nothing the product needs lives only on the laptop. None of the product's data is lost; the backups on the laptop are lost, and possibly exposed.
- **Prevent:** 2FA and recovery codes on every account in the table, stored off the laptop and sealed with one trusted person, plus full-disk encryption.

### Tested, drilled, or written down

| Procedure | How it is held |
|---|---|
| Restore, corruption, migrations, `maps` recovered from phones, detecting deletion, lost or rotated secrets, Netlify down, guide runaway | **Every PR:** `tests/recovery.test.ts`, `tests/ops.test.ts`, `tests/journeys/netlify-down.test.tsx` |
| Restore on a real store | **Quarterly:** the "Restore drill" above |
| Secret rotation | **Quarterly:** the real rotation is the drill |
| Rollback | **Once, then after any change to Netlify's interface** |
| Laptop loss | **A tabletop twice a year:** from a clean browser, sign in to GitHub, Netlify, Anthropic, the registrar and the mailbox using only 2FA and recovery codes, then rotate `FOUNDER_KEY`. Any sign-in that fails is the finding |
| Domain loss | **Written down only:** the registrar steps cannot be drilled safely |

The split follows one rule. What code does on the worst day is **tested**, because it breaks silently and only on old or broken data. What depends on a vendor's interface or an account is **drilled by hand**, because no test can reach it and it changes without notice. What cannot be simulated without doing it for real is **written down**. As of 2026-09-24, every PR drill passes. The rollback, the restore drill and the laptop tabletop have **not yet been run**, and the 2FA and recovery-code cells above are still blank.

### What is the founder's alone

No code can reach these five settings, and each one closes a scenario above:
1. The Anthropic console's **monthly spend limit** (scenarios 4 and 9).
2. The registrar's **auto-renew and lock**, and its row in the table (scenario 8).
3. **2FA and recovery codes** on every account, sealed with one trusted person (scenario 10).
4. **Making the repository private**, then setting `BACKUP_TO_ARTIFACT=true` (scenario 6).
5. The three drills not yet run.

## Time

This section covers what runs on a clock, how long each thing is kept, and what still needs a person. The test is whether the promises made to a member stay true through thirty days with nobody watching.

### What runs on a clock

| What | When | Does |
|---|---|---|
| The sweep, `netlify/functions/sweep.ts` | `@weekly` on Netlify's scheduler: Sundays, 00:00 UTC | Removes kept maps past their year, and tombstones and once keys past theirs. Retires couple sheets past ninety days, and deletes their `gone/` keys once the reporting window ends. Deletes step counts past their year unless they reached `married`. Rolls back or finishes changes of code abandoned more than two days ago. Deletes ops counts older than 35 days. **Empties the retired `cohort`, `contacts` and `vouches` stores**, which the door and the family vouch left behind on 2026-09-24. Marks `last/sweep` with its error count. It never touches reports, tallies or limits, and a record it cannot read is counted and tried again the next week |
| `watch.yml` health job | Every 3 hours, on the hour UTC. The 09:00 run is the daily one; Monday's 09:00 run is the weekly one | Reads `/` and `/version.json`, then `/health`. Emails on each check's cadence |
| `watch.yml` backup job | The 1st of each month, 09:30 UTC, only once `BACKUP_TO_ARTIFACT` is `true` | Saves `/export` as a 35-day artifact |
| `deployed.yml` | Every push to `main` | Waits for the commit, then smoke-tests it |
| The limiter | The first call of each new hour or day | Resets the count and deletes the bucket's older keys |

### How long things are kept

| Record | Kept |
|---|---|
| A kept map | A year after its last keep. Its tombstone lasts a year, and a first keep's once key lasts a day |
| A couple sheet | Ninety days. After that, `gone/<code>` keeps the code reportable for ninety more days |
| A progress record | A year, refreshed on every report. Kept for good once it reaches `married`. A `/progress` read also deletes expired records as it walks past them |
| An open report | Until the founder resolves it. The resolved stub has no expiry |
| The joint tally | Kept. It holds no one |
| Ops counts and store sizes | 35 days |
| The backup artifact | 35 days; each run replaces the last |
| The `guide-eval` artifact | 14 days |

### The founder's calendar

| When | What |
|---|---|
| Weekly | Read `/safety`. Trust promises it |
| Monthly | The readouts (`docs/RESEARCH.md`); check the backup artifact or take a backup by hand; run `npm run eval:guide` once, because the model can change under an unchanged prompt |
| Quarterly | Rotate `ANTHROPIC_API_KEY` and `FOUNDER_KEY`; run the restore drill |
| Twice a year | The laptop tabletop |
| Yearly | Check every number in `src/data/help.ts` against that service's own site, and move `HELP_CHECKED` (last moved 2026-09-23) |

### What needs a person, on purpose

Onboarding, every instrument, recovery by code (keep, restore, forget, change my code) and recording outcomes all run with nobody involved. So do the sweep, the health run and the deploy check. Two things are left to the founder deliberately:

- **Acting on a report.** There are no accounts, so no ban button would mean anything. The real levers are social: a conversation, or a word to the person's family (`src/data/safety.ts`). Resolving a report records which lever was used. Automating it further would mean building an identity system, or pretending consequences exist that do not.
- **Support mail.** It all goes to one inbox. At today's volume that costs nothing. The trigger to change it is under Scale.

A report is a person who may be waiting, not a constant to calibrate. That is why the safety queue has its own weekly cadence and an urgent report emails the same morning, while the readouts stay monthly. The ending this plans for is one safety failure in a community this close. If a failure has to be stopped the minute it is learned of, the close switch (Deploy, above) shuts the site within one deploy.

## Scale triggers

The architecture is Netlify Functions over Blobs on a free plan, and the only query is listing by prefix. There is no secondary index, there are no transactions, and every founder readout rebuilds itself from every record in one invocation. That holds for a product with zero to a few hundred members. The readouts reach their ceiling near a thousand records, and the public routes around a hundred thousand. Every public write already sits behind an hourly cap (Deploy, above). A `keep` loop is the cheapest way to spend the free plan's storage, and a `progress` loop the cheapest way to make a readout time out. A cap does not stop a patient script, but it makes one slow and visible.

| When | Change |
|---|---|
| A link is first posted into a large group, or on a launch day | Raise whichever cap `limits` shows refusing, then trigger a deploy so functions read it |
| `GUIDE_DAILY_CAP` goes red on a day of real traffic | Raise `GUIDE_DAILY_CAP`, after checking `cost` and the console limit |
| `/progress` passes about 2,000 records, or gives its first 503 | Pre-aggregate: write `tallies/progress` on each report using `couple.ts`'s etag pattern, decrement it on forget, and keep today's full recompute as the monthly repair. At about 1,000 records `/progress` makes 1,000 concurrent reads in one invocation, and `/export` does the same. That is where the first timeout is expected |
| The backup outgrows one response | Page `/export` by prefix. Never widen what it returns |
| About 10,000 members, or functions time out | A paid plan, for secret variables and longer timeouts |
| Any store passes about 50,000 keys | Move to a real database. Every member record carries `v` (`netlify/shared/record.ts`), so the move can branch on a number |
| More than a handful of support emails in a week | A FAQ drawn from the inbox, then a shared inbox, then a person who is not the founder |
| A payment gate passes (`docs/PRODUCT.md`) | A hosted payment link, never inside an app-store binary. Revisit Time as well: a stuck payment is a sharper thirty days of silence |
| About 100,000 members | A backend with identity, so "removed" becomes a button rather than a phone call |
| About 1,000,000 members | Multi-region hosting and data residency (EU, UK). Nothing here survives that, and that is fine |

`tallies/joint` is a single key. It only becomes contended past about ten answers a second, so there is nothing to do below that.
