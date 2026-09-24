# Operations: is Niyyah all right? (2026-09-24)

This is the founder's runbook for the service. It covers whether the site is up, whether it is failing, and whether it is costing more than it should. It is **not** a readout of members. Those are `docs/OPERATING.md`, read monthly on purpose.

This page is a smoke alarm: quiet when things are fine, and loud only when they are not.

## Where to look

**1. The dashboard.** GitHub → Actions → **watch** → the latest **health** run, then its Summary.
- It runs every three hours.
- It is one table: nine questions, each 🟢 🟡 or 🔴, each with one sentence.
- It works on a phone, and it needs no new account.

**2. The email.** When a check goes red, the job fails, and GitHub emails you. That email is the alert; there is no other.
- A red check emails you on its own cadence, so one old report does not send eight emails a day:

  | Cadence | When a red check emails you |
  |---|---|
  | `now` | The next run: storage down, a broken key, spend over the line, the guide's daily cap reached |
  | `daily` | The 09:00 UTC run: an urgent safety report |
  | `weekly` | Monday's 09:00 UTC run: any open report, a stale backup, a stopped sweep |

- A run you start by hand (Actions → watch → Run workflow → `health`) fails on anything red, whatever its cadence.

**3. The raw numbers.** These need the founder key:

```bash
curl -s -H "Authorization: Bearer $FOUNDER_KEY" https://<site>/.netlify/functions/health | jq .
```

- `.checks` is the table.
- `.days` is seven days of totals per signal, for a trend by eye.
- It costs nothing: no call to Claude, only counts.

**4. Whether a deploy landed.** GitHub → Actions → **deployed**, on every push to `main`.

**5. The lines behind a number.**
- **Netlify → Functions → the function → Logs.** Every counted failure is still logged, prefixed `[niyyah] <route>:`.
- **Netlify → Deploys** for builds.
- **console.anthropic.com** for the real bill.

## The nine questions

### 1. Is the app up?

**What checks it.** The health job fetches the home page and `/version.json` from outside, as a visitor would.

**Red means** the page did not answer 200, or answered without the app in it.

**Do this:**
1. Open the site on your phone.
2. Check Netlify's status page and the latest deploy in Netlify → Deploys. A failed build leaves the last good one live; a site that is down is a Netlify incident or a DNS problem.
3. If the site is gated, `PREVIEW_PASSWORD` is set (`docs/DEPLOY.md`, "The gate").

### 2. Are functions failing?

**What checks it.** Check `functions` sums `fail.<route>` for today: every caught server error, by route.

**Thresholds:**
- 🟡 at 1 or more today.
- 🔴 at 5 or more today, or any error on two days running.

**Do this:**
1. The route is named in the numbers. Open that function's log in Netlify and search `[niyyah] <route>:`.
2. Most are storage (below). An error that is not a storage error is a bug: the log line carries the stack.
3. One error on one day with nothing the next is weather. Two days running is not.

### 3. Are storage calls failing?

**What checks it.** Check `storage` writes, reads and deletes a key right now.

**Thresholds:**
- 🟡 when that takes over 2 seconds.
- 🔴 when it throws.

Each route's storage failures also show under `functions`, and the limiter's show as `fail.limit`.

**Do this:**
1. Check Netlify's status page for Blobs.
2. While storage is down, routes answer 503, and the app says "that is us, not you" and keeps everything on the phone (`docs/FAIL.md`).
3. The limiter lets storage writes through when it cannot count (fail-open), and holds the guide shut (fail-closed), so a storage outage cannot run up a bill.

### 4. Is Claude failing?

**What checks it.** Check `claude` reads what the guide itself counted today:

| Signal | Meaning |
|---|---|
| `ok` | A whole answer |
| `auth` | The key was refused |
| `rate_limited` | Anthropic's limit |
| `upstream` | An Anthropic error |
| `unexpected` | Anything else |
| `empty` | No text came back |
| `stream_ended` | It stopped mid-answer |
| `not_configured` | No key is set |

**Thresholds:**
- 🔴 on any `auth`: every member is on the offline voice.
- 🟡 on `not_configured`, or when failures are 10% or more of calls, with at least 3.

**Do this:**
1. `auth`: replace `ANTHROPIC_API_KEY` in Netlify → Environment variables, then redeploy.
2. Check the key and one live call with `GET /.netlify/functions/guide` and the founder key. It spends about a cent.
3. `rate_limited` or `upstream`: check status.anthropic.com. Members get the offline voice meanwhile; nothing is lost.

### 5. Are safety reports waiting?

**What checks it.** Checks `safety-urgent` and `safety` count open reports, never their contents.

**Thresholds:**
- `safety-urgent` 🔴 on any open report of threats or something explicit. **Daily.**
- `safety` 🟡 on anything open, 🔴 on Mondays or once the oldest is over a week old. **Weekly.**

**Do this:** read `/safety` and resolve each report as `docs/OPERATING.md` says. Trust promises every week and no later. `docs/ABUSE.md` says what each reason calls for.

### 6. Are costs abnormal?

**What checks it.** Check `cost` estimates today's guide spend from the tokens the guide counted, at $5 per million in and $25 per million out. These are the rates `guide.ts`'s own arithmetic uses. It is compared with the past week's average.

**Thresholds:**
- 🟡 when today is over $2 and over 3× the average.
- 🔴 at `OPS_COST_ALERT_USD`, which defaults to $20. The worst possible day under the caps is about $36.

**Do this:**
1. Check `limits` (below). A loop against the guide shows there first.
2. Check the real figure at console.anthropic.com. This one is an estimate, and it is labelled as one.
3. To stop it now, lower `GUIDE_DAILY_CAP` in Netlify. It takes effect on the next call. The console's monthly spend limit is the bound outside the code (`docs/CONTROL.md`).

### 7. Are rate limits being hit?

**What checks it.** Check `limits` counts refusals today, by kind of cap. It never counts what the refused call was about: a city's door cap is counted as `door-city`, not the city.

**Thresholds:**
- 🟡 on any refusal.
- 🔴 on `guide-d`: the guide's daily cap is reached, and members get the offline voice until midnight UTC.

**Do this:**
1. A launch day, or a mosque group arriving at once, is real traffic. Raise the cap's variable in Netlify; `docs/DEPLOY.md` names each one.
2. The same cap refusing all day with no launch is a script. Leave the cap where it is, since it is doing its job, and look at which route in the function log.
3. Caps reset every hour, and the guide's daily cap resets at midnight UTC.

### 8. Did a deployment fail?

**What checks it.** Each build writes `/version.json` with its commit. The **deployed** workflow waits up to 15 minutes after each push to `main` for the site to report that commit.

**Red means** the live site still reports an older commit. The failed job names both.

**Do this:**
1. Netlify → Deploys → the failed one → its log. `npm run verify` runs first in the build, so a red test fails the deploy exactly as it fails CI.
2. `docs/DEPLOY.md` has the two failure signatures, and how to tell which commit is live.
3. The last good deploy stays live meanwhile. Nothing is down; it is only stale.

### 9. Did a backup fail?

**What checks it.** Check `backup` counts the days since `/export` last answered the founder. That is a backup taken, whether by hand or by the monthly job.

**Thresholds:**
- 🟡 after 31 days.
- 🔴 after 35 days, or if none was ever taken. **Weekly.**

**Do this:**
- Take one:

  ```bash
  curl -s -H "Authorization: Bearer $FOUNDER_KEY" https://<site>/.netlify/functions/export -o "backup-$(date +%F).json"
  ```

- The monthly job saves it as a 35-day artifact, but only once `BACKUP_TO_ARTIFACT` is `true`. That waits on the repository being private, because an artifact on a public repository can be downloaded by anyone signed in to GitHub.
- Contacts are backed up by hand (`docs/OPERATING.md`).

### Also on the table

- **`data` — has stored data gone missing?** Red when a store has lost more
  than a quarter of itself since the last day on record (from at least 8
  records), or the safety queue has lost reports (from at least 2). `/health`
  records each store's size once a day to compare — population totals, never
  a record. Stop the sweep, take a backup of what is left, and follow
  `docs/RECOVERY.md`, scenario 6.

- **`sweep`: the weekly clean-up.**
  - 🔴 when it has not run for over 8 days. It runs on Sundays, from `netlify/functions/sweep.ts`'s own schedule.
  - 🟡 when it ran with errors. The sweep's log line names the counts.
  - Errors two weeks running are a record to look at by hand (`docs/OPERATING.md`).
- **`client`: the app crashing on phones.**
  - 🟡 at 3 or more crashes reported today.
  - `chunk` means a screen's code never arrived: a bad deploy, or a CDN problem.
  - `crash` means a screen threw.
  - The browser console on a test phone, or the build's own test run, shows which screen.

## When it is worse than a red check

`docs/RECOVERY.md` walks ten disasters — Netlify down, corruption, a lost
variable, a leaked key, a bad deploy, deleted data, a broken migration, the
domain lost, runaway cost, the founder's laptop — with detection, the first
hour, recovery, the data-loss bound, what members see and the prevention; and
which of those procedures are tested on every PR.

## What is counted, and what never is

It is counted in the `ops` store, one number per signal per day. Keys are `day/<YYYY-MM-DD>/<signal>`.
- The signals are a closed list: `OPS_SIGNALS` in `netlify/shared/vocab.ts`. `note()` drops anything else, so no code, city, id or text can ever be counted.
- They are deleted after 35 days by the weekly sweep.
- Two markers say when the backup and the sweep last ran: a day, and the sweep's error count.
- One thing comes from phones: that the app crashed, or that a screen never arrived. There is no stack, no screen, no code and no install id. Trust says so in one clause.

It never counts:
- anything per person: no visits, sessions, screens, time in the app, or "active users";
- anything from the guide's content;
- latency per member;
- which city, code or report an event was about.

`docs/LEARNING.md`'s field test is: does this describe a person, a pairing, a conversation or a question? Every signal here describes an operation of the service instead: a route failing, a cap refusing, a call to Claude, a phone reporting a crash.

It is not the learning record either. `/export` does not carry it, and it is not a readout. It exists to say whether the service is all right this week, and a thirty-five-day window is all that question needs.

## What is yours to set, once

- **`FOUNDER_KEY`** in GitHub (Settings → Secrets → Actions), matching Netlify's. Without it, every health run is red with a note saying so (`docs/DEPLOY.md`).
- **`OPS_COST_ALERT_USD`** in Netlify, if $20 is not where you want the cost alarm.
- **The Anthropic console's monthly spend limit.** This is the bound outside the code, and the one number no code here can set (`docs/CONTROL.md`).
- **Making the repository private,** then setting `BACKUP_TO_ARTIFACT=true` under Settings → Variables, so the monthly backup saves itself.
- **Optionally, Netlify → Site → Notifications → Deploy failed → email,** a second channel for question 8.

## Files

- **`netlify/shared/ops.ts`:** `note`, `failed`, `mark`, `readDays`, `pruneOps` and `probe`.
- **`netlify/shared/counter.ts`:** the conditional increment, shared with the rate limiter.
- **`netlify/functions/health.ts`:** the checks and their thresholds, plus the crash beacon.
- **`src/lib/crash.ts`:** sends the crash beacon once per page load, from the ErrorBoundary.
- **`.github/workflows/watch.yml`:** the health job, which renders the dashboard and sends the alerts.
- **`.github/workflows/deployed.yml`:** the deploy check.
- **`tests/ops.test.ts`:** causes each of the nine failures and holds `/health` to what it says. It also proves nothing counted or returned is about a person, and that counting cannot break a route. `docs/TESTING.md` lists the mutations it catches.
