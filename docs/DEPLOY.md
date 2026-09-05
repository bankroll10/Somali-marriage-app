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

## At real launch

Three things come off together, and forgetting one undoes the others:

1. The `[[headers]]` block in `netlify.toml` (the `X-Robots-Tag: noindex`).
2. `public/robots.txt`.
3. `netlify/edge-functions/gate.ts`, and the `PREVIEW_PASSWORD` variable.

Before that day, the Trust screen and `src/data/plus.ts` both promise
reporting and blocking that do not exist yet. That promise has to become true
or come off the screen.
