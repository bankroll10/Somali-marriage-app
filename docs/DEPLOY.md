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
| `PREVIEW_PASSWORD` | The founding-preview gate (`netlify/edge-functions/gate.ts`). Any username, this password. | **No gate. The site is open to anyone with the link.** |
| `ANTHROPIC_API_KEY` | Switches on the live Guide (`netlify/functions/guide.ts`). | The Guide answers from its offline voice; no error shown. |
| `FOUNDER_KEY` | Bearer token on every readout (`netlify/shared/founder.ts`). | **The readouts are public to anyone who guesses the URL.** |
| `VITE_WAITLIST_FORM` | Names the Netlify form signups post to. Already set in `netlify.toml`. | The signup card falls back to a mailto. |
| `VITE_SITE_HOST` | The domain the app calls itself, in every link it hands out and every share card. | `getniyyah.netlify.app` — a subdomain we do not own. See `docs/CONTROL.md`. |
| `VITE_CONTACT_EMAIL` | Where a signup reaches a human when the form is down. | `salaam@niyyah.app`, which is only real if that domain is owned and receiving. |
| `GUIDE_HOURLY_CAP` | The circuit breaker on the live Guide (`netlify/shared/limit.ts`) — the most calls it will answer in one hour, from anyone, combined. | `300`, chosen well above any real hour this product has seen. See `docs/TIME.md`. |
| `COHORT_HOURLY_CAP` | Joins the door will count in one hour, from everyone. | `200`. See `docs/SCALE.md`. |
| `KEEP_HOURLY_CAP` | Maps kept in one hour — the cheapest way to spend a free plan's storage, bounded. | `300` |
| `VOUCH_HOURLY_CAP` | Vouch links minted and vouches given in one hour. | `100` |
| `COUPLE_HOURLY_CAP` | Elevens *started* in one hour. His answer is never capped. | `200` |
| `SAFETY_HOURLY_CAP` | Reports filed in one hour — a flood is the one way to bury a real one. | `30` |
| `PROGRESS_HOURLY_CAP` | Rung reports in one hour — a loop of made-up install codes is the cheapest way to make the readout time out. | `1000` |

Every `*_HOURLY_CAP` is a circuit breaker, not a member limit: one counter per
route per hour, with no identity attached, refused with the same quiet 503 a
client already treats as "try later". Past the cap a real member sees exactly
what she sees when storage is unreachable, which is to say nothing that looks
like a wall. The defaults sit well above any real hour this product has seen.
**The one time to raise them is the week a pool opens**, when a city's worth of
people may arrive in an afternoon — set the variable, no deploy needed.

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
`docs/OPERATING.md` calls for checking it weekly. Resolving a report is
`DELETE /.netlify/functions/safety?code=<code>&side=<woman|man>`, which
deletes it — a report is a live concern to act on, not a record to keep.

## At real launch

Three things come off together, and forgetting one undoes the others:

1. The `[[headers]]` block in `netlify.toml` (the `X-Robots-Tag: noindex`).
2. `public/robots.txt`.
3. `netlify/edge-functions/gate.ts`, and the `PREVIEW_PASSWORD` variable.

Before that day: `netlify/functions/safety.ts` gives reporting a real channel
(see above), but this product has no accounts, so "removed" still means a
founder's phone call, not a button. Trust's promise of real consequences is
true as far as a report reaching a person goes; keep it worded that way, not
as a claim of automatic enforcement this product cannot yet make. See
`docs/TIME.md`.
