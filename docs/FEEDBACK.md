# Niyyah — what real people have said

> The "talk to users" step of `docs/PROCESS.md`'s loop. `docs/GAPS.md` names
> the method: behaviour-anchored conversations with real counted members,
> because two of the ranked gaps — the alternatives people tried before this,
> and whether they would pay — cannot be answered by any instrument. This is
> where the answers go.

## How an entry gets written

One entry per conversation, email, or comment. Two rules, without exception:

- **No name, ever.** Not hers, not a family member's, not anyone she
  mentioned. A city and a stage (`preparing` / `talking` / `deciding` /
  `married`) are enough context to make an entry useful; anything narrower
  is a way of writing a name without writing it.
- **Paraphrase a quote that could identify someone**, even to a small
  audience. This log is committed to the repository like every other
  process document — treat anything in it as something that could be read
  by someone other than the founder, because eventually it might be.

Every entry closes with **what it bears on**: a row in `docs/GAPS.md`, an
experiment in `docs/EXPERIMENTS.md`, or `new` if it names something neither
file has yet — in which case the next step is adding that row, not letting
the entry sit unconnected.

```markdown
### <date> · <source: conversation | email | comment>

**Context.** <city, stage, how they found the product — never a name>

**What they said.** <paraphrased, in the third person>

**Bears on.** <GAPS row id, EXPERIMENTS id, or "new" — and what changed, if anything>
```

## Log

_Newest first._

### 2026-09-12 · walk

**Context.** The founder, on a phone, on the live site, having deleted
`PREVIEW_PASSWORD` an hour earlier. Not a member — but the first person to
walk the deployed product from outside a test, and the first entry this log
has ever held.

**What they said.** Reached question 7 of the read as a man ("If you stop
texting first, what happens? — She reaches out the same day") and asked
whether the answers were right or a bug.

**What it turned out to be.** The answers were right: the pronouns resolve
for whoever is reading. Three things behind that screen were not.

1. The *result* still called her "he". `buildRead` resolved the questions for
   the reader and not its own copy, so a man who finished was told "we cannot
   tell you what he intends", that this was "the shape that leaves women
   without anyone to compare notes with", and to go and tell "an older woman
   you trust". Nine strings and two dimension labels. Fixed; every sentence a
   result returns now passes through `speak()`, and `tests/mens-read.test.ts`
   reads every band from both sides.
2. Three of the eleven questions graded him backwards. The worst was the
   family question: the product's own scripts tell a woman that a serious man
   asks how to approach *her* family and that she should ask him to send his
   people — and the read then asked a man whether *she* had asked how to
   approach *his*, full marks for yes, zero for no. Never texting first and
   asking for discretion, the two sharpest signals a woman has, are ordinary
   on his side and are no longer scored at zero for him.
3. A man who reached the family ask had no words behind it: two scripts were
   women-only and none was his. `approach-her-family` is now there.

**Bears on.** `docs/GAPS.md` "the men's side" and `docs/REDTEAM.md`
conviction 1. Not an answer to either — the founder is not a member, and
none of this tests whether men want the read at all. It does close the
objection that the men's read was her read with the pronouns flipped: three
questions of the eleven were, and are not now. **New rule, from one walk:**
nothing ships to a side of the product nobody has walked on a phone.

- _(nothing before this — the first conversations are the first ten counted
  members; `docs/GAPS.md` has the questions to ask)_
