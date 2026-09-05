# Niyyah — Operating the loop

> Every constant in `src/data/` ships in the bundle. A competent team could
> copy all of them by Friday. What they could not copy is the process that
> revises those constants from what actually happened to real people — and a
> process only exists if it is written down and run. This is it.

## Why this file exists

The product records, under "Count me", what its rungs were made of: which
ground read thin, how a read came out, which of the eleven got said, who she
married. It records how pairs come out on the two-sided eleven. It records
which kind of link brought each person here. None of that is worth anything
sitting in a store. It is worth something the day a number in `src/` moves
because of it, and that day has to be scheduled or it never comes.

Read the readouts **monthly**, not daily. Read daily, a readout becomes a
dashboard; a dashboard becomes a metric; a metric becomes the thing the
product optimises for. The ladder is the only metric. Everything below is
calibration.

## The readouts

All four are aggregate and return no person. All four sit behind
`FOUNDER_KEY` (`netlify/shared/founder.ts`); see the README for setting it.

```bash
K="Authorization: Bearer $FOUNDER_KEY"; S=https://<your-site>/.netlify/functions
curl -s -H "$K" $S/progress | jq .     # the ladder, and the facts
curl -s -H "$K" $S/cohort   | jq .     # the door: every city, hardest parts, ledgers
curl -s -H "$K" $S/couple   | jq .     # how pairs come out on the eleven
curl -s -H "$K" $S/guide    | jq .     # the guide's health — one live call, so rarely
```

What each field in `/progress` means:

| Field | Reads as |
|---|---|
| `rungs[id]` | People who ever reached this rung. `followed-through / arrived` is the North Star |
| `scenes[city][rung]`, `vias[via][rung]` | The same, by city and by what kind of link brought them |
| `arrivedByWeek` | The denominator over time, so a cohort can be followed |
| `facts.grounds[dim][state]` | How many maps read thin / steady / strong on each ground |
| `facts.read.band[band]`, `facts.read.thin[dim]` | How reads come out; which ground men here most often have not shown |
| `facts.eleven.open[topic]` | Which of the eleven the product most often told someone to open first |
| `facts.eleven.{agree,differ,notTalked,unknown}[n]` | How many people had *n* topics in that state |
| `facts.through["source:topic"]`, `facts.throughByTopic[topic]` | Which conversations were actually confirmed as had |
| `facts.ending.{who,mattered,used}[id]` | Who they married, what decided it, what here was real |
| `facts.marriedBy.through[topic]` | `{through, married}`: of people who confirmed this conversation, how many went on to marry |
| `facts.marriedBy.readThin[dim]` | `{read, married}`: of people whose read found this ground thinnest, how many married |
| `facts.marriedBy.open[topic]` | `{eleven, married}`: of people told to open this topic first, how many married |

`marriedBy` is the first outcome table this product has. Every row in the
next section is a way of reading it.

## The loop: readout → constant

Each row is one question the founder asks the readout, the constant it may
move, and the rule of thumb for moving it. A revision is a commit whose
message cites the readout row and the month.

| Constant | File | Revised by | Rule of thumb |
|---|---|---|---|
| `consequence` per topic | `src/data/beforeYes.ts` | `eleven.open` × `throughByTopic` × `marriedBy.through` | A topic often opened, rarely confirmed as said, and under-represented among the married carries more than its number says. Raise it |
| `WEIGHTS` | `src/lib/read.ts` | `read.thin` × `marriedBy.readThin` | A ground that reads thinnest as often for people who marry as for people who do not is over-weighted. Lower it |
| `stateOf` thresholds (0.75 / 0.5) | `src/lib/reflection.ts` | `grounds[dim]` | If one ground reads thin for most of the community, the threshold is measuring the community, not the person. Move it |
| Step order | `src/data/nextStep.ts` | `grounds[dim]` | The most common thin ground gets the best-written step |
| Scripts | `src/data/read.ts` `SCRIPTS`, `src/data/beforeYes.ts` `script`, `src/data/families.ts` | `through["source:topic"]` against how often that script was handed out (`eleven.open`, `read.thin`) | Words handed out often and said rarely get rewritten. Words never once confirmed get cut |
| Joint `URGENCY` | `src/lib/couple.ts` | `/couple` `topics[topic][joint]` | The joint state pairs most often land in for a topic is the one that topic's line should name |
| `alignment` scales | `src/lib/matching.ts` | only once `ending.who.here > 0` | Nothing to calibrate against until this product has introduced two people who married. Do not touch |
| The order of the four questions on the ending | `src/data/ending.ts` | `ending.*` answer rates against `rungs.married` | A question skipped by most is asked last, or dropped |

Rules for the loop itself:

- **One revision per readout.** If three constants look wrong, move one, wait
  a month, look again. Two moves at once cannot be told apart.
- **Never move a constant on fewer than a hundred records** for the row in
  question. Below that the readout is anecdote.
- **The ladder decides, not the facts.** A constant that makes a fact look
  better while `followed-through / arrived` falls is wrong.
- **Nothing here ever becomes a score on a person.** The tables are about
  the community and the product. The rule on the read and the map stands.

## Keeping the vocabularies in sync

Every set the server validates against lives in one file,
`netlify/shared/vocab.ts`, and each set has a twin in `src/`.
`tests/vocab-sync.test.ts` fails the moment either moves without the other.

Renaming or adding an id — a topic, a family script, an ending option — is
therefore a two-file change: the `src/data` file and `vocab.ts`. Old records
keep the old id; the tally shows both until they age out, and that is fine.
Do not migrate stored records.

## Housekeeping (rarely)

Two kinds of blob outlive their purpose and have no sweep:

- **Vouches for maps that lapsed.** A vouch lives while its map does, and a
  map lapses a year after its last keep. The vouch blob stays, harmless and
  unreadable through any route. Once a year: list `maps`, list `vouches`,
  delete vouches whose code has no map.
- **Maps kept before the guide's threads were left out.** Each re-keep
  overwrites the blob, so these age out on their own. If you want them gone
  sooner, list `maps` and re-write any blob whose snapshot has a
  `coachThreads` key without it.

```bash
netlify blobs:list maps --json | jq -r '.[].key' > /tmp/maps
netlify blobs:list vouches --json | jq -r '.[].key' | grep -vxFf /tmp/maps   # orphaned vouches
```

## The monthly hour

In this order, because each question only means something after the last:

1. **Is anyone being helped?** `followed-through` per hundred `arrived`, this
   month against last, by city. If this is flat, nothing below matters yet.
2. **Which door brings people who follow through?** `vias[via]` — the ratio
   of `followed-through` to `arrived` per via. The best door is the share the
   product should offer first.
3. **Which conversations get had, and which only get handed out?**
   `eleven.open` against `throughByTopic`. The gap is the next script to
   rewrite.
4. **What do couples miss?** `/couple` `topics` — the topics where
   `one-thinks-talked` and `both-not-talked` lead.
5. **Who did they marry?** `ending.who`. Until `here` is more than zero, the
   instruments are the product and the marketplace is not. When it is, the
   city is ready to open.
6. **One revision.** Pick the single row above with the clearest signal, move
   its constant, and write the line below.

## Revisions

_Dated, one line each: the month, the readout row, the constant, the move._

- _(none yet — the first hundred records are not in)_
