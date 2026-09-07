# Niyyah — the operating loop

> MJ DeMarco's Process Principle: product development is not a sequence of
> launches, it is a loop — observe, name the problem, form a hypothesis,
> build the smallest version, ship it, measure, talk to the people it
> touched, learn, and go again. Most of that loop already exists in this
> repository, built one "Commandment" pass at a time and scattered across
> half a dozen docs. This file is the map of where each step already lives,
> the handful of pieces that were missing, and the rules that make the loop
> repeatable by someone who is not the person who built it.

## The loop, and what already runs each step

| Step | What does it today |
|---|---|
| **Observe** | The weekly pulse (`docs/OPERATING.md`) and the monthly hour's readouts — the ladder, the door, the couple tally, the guide's health |
| **Identify problem** | `docs/GAPS.md` — every belief the product rests on, classed and ranked by how dangerous it is if wrong |
| **Form hypothesis** | `docs/EXPERIMENTS.md`'s eight-field template, below, reused for every new bet |
| **Build** | The smallest slice that tests the hypothesis — one commit, `npm run verify` green, the standing rules in "Release review," below |
| **Ship** | A pull request against `main`, `.github/workflows/verify.yml` green, merge — `docs/DEPLOY.md` |
| **Measure** | `docs/OPERATING.md`'s readouts, read at the two cadences below |
| **Talk to users** | `docs/GAPS.md`'s ten behaviour-anchored conversations, and every passive channel, logged in `docs/FEEDBACK.md` |
| **Learn** | The dated logs — `docs/GAPS.md`'s reclassification log, `docs/EXPERIMENTS.md`'s results log, `docs/OPERATING.md`'s revisions log |
| **Iterate** | The next roadmap pick (`docs/PRODUCT.md` §10), prioritised as below, closing back to Observe |

Nothing here replaces those docs. This one exists because the loop only
works if each step hands cleanly to the next, and until now that handoff was
implicit — held in one person's head rather than written down.

## Weekly product metrics: the pulse, not the hour

`docs/OPERATING.md` already drew this line for one thing — `GET /safety` is
checked weekly, on its own, because a report is a person waiting, not a
metric to accumulate. This generalises that same distinction rather than
adding a second cadence next to it: reading is weekly, **revising is still
monthly**. The rule that makes this safe is the one `docs/OPERATING.md`
already states — *read daily, a readout becomes a dashboard; a dashboard
becomes a metric; a metric becomes the thing the product optimises for* —
and it holds exactly as well at a week as at a day if the weekly read is
allowed to change anything. It is not. The pulse is five numbers and a
question, never a decision.

**The weekly pulse**, five minutes, no action taken from it beyond the two
named below:

```bash
curl -s -H "$K" $S/safety   | jq .   # any report — act on it now, not at the pulse
curl -s -H "$K" $S/progress | jq '.rungs, .facts.began'   # arrived, and who finished what they began
curl -s -H "$K" $S/cohort   | jq '.countries'              # the door: women and men, every open pool
```

The two things a pulse is allowed to do: **act on an open safety report**
(already the rule), and **notice a cliff** — a number that was moving and
stopped, or a rung that went to zero. A cliff is not a revision; it is a
reason to look sooner than the next monthly hour, not a reason to skip it.
Everything else waits.

**The monthly hour does the revising**, unchanged: `docs/OPERATING.md`'s
seven-step order, one constant moved per month, never on fewer than a
hundred records, written to its revisions log.

## Identify problem → form hypothesis

`docs/GAPS.md` is where a problem gets named: every belief classed KNOWN,
LIKELY, ASSUMED or UNKNOWN, ranked by the cost of being wrong. A new problem
— something the weekly pulse or a conversation surfaces that is not already
in that table — gets a row there first, before it gets a build.

Every hypothesis, from there, uses the same template `docs/EXPERIMENTS.md`
already established. Copy this stub for a new one:

```markdown
### <id> · <one-line name>

- **HYPOTHESIS.** <the belief, stated as a claim about behaviour>
- **WHY WE BELIEVE IT.** <opinion, culturally attested, or reasoned from
  mechanics — say which. "Because it seems right" is opinion; write that.>
- **WHAT WOULD CONFIRM IT.**
- **WHAT WOULD DISPROVE IT.**
- **METRIC.** <a field in an existing readout, if one exists>
- **SMALLEST CREDIBLE TEST.** <no build, if the data already exists; one
  field, if it doesn't; never more than the hypothesis needs>
- **TIME TO LEARN.**
- **DECISION RULE.** <fixed now, in numbers, before the result exists>
```

The rule that makes this worth doing: **the decision rule is written before
the build**, not after the numbers arrive. A rule invented after seeing the
result is not a rule, it is a justification. `docs/EXPERIMENTS.md`'s five
entries are the worked examples.

## Build → ship: release review

Every standing rule already scattered across this repository's docs,
gathered into one checklist. `.github/pull_request_template.md` puts this in
front of every PR so it is not a thing to remember, and CI
(`.github/workflows/verify.yml`) enforces the first two lines regardless of
whether anyone reads the rest:

1. `npm run verify` is green — typecheck, lint, the whole suite.
2. `npm run build` succeeds.
3. Any new value the server accepts is a closed id in
   `netlify/shared/vocab.ts` with a pointer comment to its `src/` twin, and
   `tests/vocab-sync.test.ts` proves the two match.
4. A new file in `netlify/functions/` is added to the allowlist in
   `tests/deploy-layout.test.ts`, or the build silently deploys it wrong.
5. Trust screen copy moves in the **same commit** as the payload it
   describes. This is the oldest standing rule in the repository
   (`docs/LEARNING.md`) and the one most likely to drift if skipped.
6. A new closed list or readout field is documented where the others are:
   `docs/OPERATING.md`'s field table if it reaches a readout,
   `docs/LEARNING.md`'s collected list if a member's action produces it.
7. If the change carries a hypothesis bigger than a copy fix, it has an
   entry in `docs/EXPERIMENTS.md` with a decision rule already written.
8. One commit per logical slice, so the history reads as the loop it came
   from rather than a single undifferentiated diff.

## Talk to users: `docs/FEEDBACK.md`

`docs/GAPS.md` already named the method for the two things no instrument can
answer — ten behaviour-anchored conversations with real counted members, and
the questions to ask. What was missing was somewhere to put the answers.
`docs/FEEDBACK.md` is that log: one dated entry per conversation, email, or
comment, whether it came from the founder's own outreach or the passive
channel (`CONTACT_EMAIL`, "we read every one," `src/lib/site.ts`).

Two rules that keep the log itself honest with the rest of the product:

- **No name, ever — paraphrase, not verbatim, if a direct quote could
  identify someone.** The same discipline the product holds about its own
  members applies to notes about them. A city and a stage are enough
  context; a name or a detail that narrows to one person is not.
- **Every entry says which claim it bears on** — a row in `docs/GAPS.md`, an
  experiment in `docs/EXPERIMENTS.md`, or "none yet" if it is genuinely new,
  in which case it becomes a new row before anything else happens to it.

This is founder research, kept in the repository's docs like every other
process record — not a member-facing store, and never confused with one; the
product's own no-free-text rule (`docs/LEARNING.md`) governs what the
*product* asks members, not what the founder writes down about a
conversation they chose to have.

## Iterate: roadmap prioritisation

`docs/PRODUCT.md` §10 lists what comes next; this is how an item earns its
place in that order, or loses it. The same three axes
`docs/EXPERIMENTS.md`'s ranking table already used, qualitative on purpose —
a numeric score would claim precision the product does not have over
questions it classes as ASSUMED:

| Axis | The question |
|---|---|
| **Learning value** | Does this answer something in `docs/GAPS.md`'s ranked table, or just add a feature? |
| **Business importance** | Where does it sit in `docs/EXPERIMENTS.md`'s ranking — top-of-funnel and wedge-critical outranks everything else |
| **Runnable now** | Blocked by a promise (A5's free-for-a-year), by scale (SCALE.md's triggers), or buildable today? |

Applied to the current roadmap (`docs/PRODUCT.md` §10):

| Item | Learning value | Business importance | Runnable now |
|---|---|---|---|
| 0 Run the loop | — | Foundational; nothing else means anything without it | Yes, always |
| 1 Your record | Low | Medium — a trust promise, not a funnel step | Yes |
| 2 First-year sheet | Medium | Low until married pairs exist | Blocked, in practice |
| 3 Live Claude behind the map | Low | Low — a seam, not a bottleneck | Yes |
| 4 Real backend | — | High, eventually | Blocked by scale (`docs/SCALE.md`) |
| 5 First pool opens | High | Highest — the whole marketplace | Blocked on `ending.who.here > 0` |
| 6 Concierge | High | High | Blocked on 5 |
| 7 The door, for men — `docs/MACHINE.md` M0–M2 | High — tests `docs/GAPS.md` gap #1 directly | Highest — the only thing that can unblock 5 and 6 | Yes |

Item 0 is not really an item — it is the precondition for the table meaning
anything, which is the whole argument for this file existing.

## Feature kill criteria

A decision rule that was written before the build is also a kill switch: if
the number named in it is crossed, the feature changes or stops, without a
re-litigation. Every one below already exists in another doc; this is the
one place to see them together.

| Feature | Kill / change criterion | Where it's defined |
|---|---|---|
| The live guide (Claude, not the local voice) | Named by fewer than one in five people who reach an ending | `docs/EXPERIMENTS.md` A3 |
| Family scripts as the path forward | No script confirmed as said by twenty people who built maps | `docs/EXPERIMENTS.md` A4 |
| The family vouch as verification | Asks below one in four kept maps (the ask is the problem), or asks healthy but vouches below half (his screen is the problem) | `docs/EXPERIMENTS.md` A2 |
| The wedge channel (alumni/professional group links, Minneapolis) | Fewer than twenty women or five men counted after eight weeks of the playbook — change channel first, city second | `docs/WEDGE.md` |
| Onboarding length (the thirteen-question map, the read, the eleven) | Completion under the thresholds in A1 — shorten, cut to one chapter, or fix the two-sided flow, by instrument | `docs/EXPERIMENTS.md` A1 |
| Support as one founder inbox | More than a handful of emails in a week | `docs/TIME.md` |
| The `door` link and the second ask on the door | After four weeks: under five men arrived → the channel pivots (WEDGE); five or more and under one in four `mapped` → cut the men's map first (A1); women's `counted` per hundred `arrived` falls → back to one ask | `docs/MACHINE.md`, logged as A6 |

A feature with no decision rule is not yet a feature this process can
govern — it is an opinion running in production. Writing the rule is part of
shipping the feature, not a follow-up task.

## Considered and declined

- **A member-facing feedback form.** A new server surface with no owner yet,
  and it would need an account or a code to route a reply — this product has
  neither. The founder's own conversations are the credible channel at this
  scale. *Trigger: the same one `docs/TIME.md` already named for support
  volume generally.*
- **A numeric roadmap score (RICE, ICE, or similar).** Rejected for the same
  reason `docs/GAPS.md` refuses to average KNOWN and ASSUMED claims into one
  number: false precision over questions the product itself has not
  answered yet. The qualitative table above is the honest version.
- **A weekly revision cadence.** Considered and explicitly refused — see
  "Weekly product metrics" above. Reading often is fine; deciding often is
  the thing `docs/OPERATING.md` was written to prevent.

## Changes to this loop

_Dated, one line each: what changed about how work happens here, and why._

- 2026-09-07 — The roadmap table gains its first row from a whole-machine read rather than a feature list: `docs/MACHINE.md` maps the thirteen stages, names the weakest link, and the plan for it takes the top slot.
