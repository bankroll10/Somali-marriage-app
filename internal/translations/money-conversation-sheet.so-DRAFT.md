# UNREVIEWED — Somali draft of the money conversation sheet

> **DO NOT PUBLISH. DO NOT LINK. DO NOT COPY INTO `public/`.**
>
> This is a machine-drafted translation, produced by Claude (an LLM), not by
> a native or fluent Somali speaker. It has **not** been checked by one. It
> lives in `internal/` specifically so it is never built, never served, and
> never reachable at a public URL — `internal/` is outside Vite's `public/`
> directory and nothing in `vite.config.ts` touches it.
>
> **Why this matters more than a normal typo.** Niyyah's own operating
> convention — see `src/data/somali.ts`'s `approved` field and
> `docs/PROTOCOL.md`'s Somali-line review process — is that no Somali text
> reaches a reader until someone who actually speaks the language has read
> it and said it sounds like something a Somali person would say. A wrong
> word here is a worse failure than a wrong word in English: it's the one
> thing this brand cannot afford to get caught faking. This draft has not
> cleared that bar and must not be treated as if it has.
>
> **What a reviewer should do:** read the Somali column against the English
> column, question by question, and either mark it correct, replace it, or
> leave a note in the fourth column. Anything not explicitly marked
> reviewed should be treated as wrong. Once every row is reviewed, a
> *separate* task builds an actual `niyyah-money-conversation-sheet-so.html`
> from the approved text — this file is source material for that, not a
> preview of it.
>
> Drafted 2026-09-20, alongside the English sheet (`docs/SHEET.md`,
> `public/niyyah-money-conversation-sheet*.html`). IDs match the English
> file's element IDs where one exists, so an approved line can be dropped
> straight into the HTML later.

## Open questions for the reviewer, before anything else

These are the calls I'm least confident I got right, and where a wrong
answer would be wrong for everyone reading the sheet, not just one line:

1. **Register: `adiga` (singular, informal "you") vs `idinka` (plural /
   formal "you two").** The sheet is addressed to two people at once in the
   shared prose (lede, framings) but to one person at a time inside each
   answer column. I drafted the shared prose in a plural/formal register and
   the per-question prose in singular — a real inconsistency I'm not
   confident is the right call rather than a mistake to fix.
2. **Whether "mahr", "nikah", and "walima" should stay exactly as in the
   English sheet, or take a Somali spelling/inflection** (e.g. *nikaax*,
   *aroos* for the wedding generally vs *walimo/walima* for the specific
   feast). The English sheet's own rule (`docs/SHEET.md`) is to use only
   terms the reader already uses without explaining them — I don't know
   which spelling a Somali-American reader already uses.
3. **Whether any of this reads as too formal, too written, or like it was
   translated** — the exact failure mode `docs/PROTOCOL.md` calls
   "outsider-ish" and "performative" for Somali lines already in the
   product. I have no way to catch that myself.
4. **Every question mark, every "no advice" framing sentence** — the
   English content rules (no ruling, no figure, no advice, no gendered
   language) have to hold in Somali too, and phrasing that's neutral in
   English can carry an implied instruction or a gendered assumption in
   Somali that I would not necessarily notice.

---

## Header

| ID | English | Somali (unreviewed) | Reviewer note |
|---|---|---|---|
| title | The money conversation | Sheekada lacagta | |
| h1 | The money conversation | Sheekada Lacagta | |
| lede-1 | A sheet for two adults considering marriage, to work through before the families discuss numbers. Each of you answers in your own column. | Waa xaashi loogu talagalay laba qof oo qaan-gaar ah oo guur ka fikirreya, si ay uga hadlaan intaan qoysaska ka hadlin lacagta. Midkiin kastaa wuxuu ku jawaabayaa tiirkiisa gaarka ah. | [UNCERTAIN: register — see open question 1] |
| lede-2 | The four subjects are kept apart on purpose. Mahr is not the wedding. The wedding is not what either of you already owes. And none of the three is the money that leaves your account every month for people at home or abroad. | Afarta mawduuc waxa loo kala saaray si ula kac ah. Mahrku ma aha aroosku. Aroosku ma aha waxa midkiin hore u lahaa (deynta). Saddexdaana midna ma aha lacagta bishii ka baxda akoonkaaga oo loo diro dad joogo guriga ama dibadda. | |
| note-1 | Nothing on this page is saved or sent. What you type stays in this window until you close it, and there is nothing to submit. | Wax boggan ku qoran lama kaydiyo, lamana diro. Waxa aad qorto wuxuu ku hadhayaa daaqaddan ilaa aad xirto, wax la gudbiyana ma jiraan. | |
| note-2 | Print this and write on it — typing here is fine, but long answers may be cut off when printed. | Daabac boggan oo ku qor gacanta — inaad halkan ku qorto waa okay, laakiin jawaabaha dhaadheer marka la daabaco way go'i karaan. | |
| who-a | Person A | Qofka 1aad | [UNCERTAIN: "Qofka Koowaad" or "Qofka 1aad" — which reads more natural] |
| who-b | Person B | Qofka 2aad | |
| who-date | Date | Taariikhda | |

## 1. Mahr

| ID | English | Somali (unreviewed) | Reviewer note |
|---|---|---|---|
| s1-h | 1. Mahr | 1. Mahr | |
| s1-framing | This section is about mahr only — what each of you expects, and who has heard that expectation so far. | Qaybtan waxay ku saabsan tahay mahr kaliya — waxa midkiin kastaa filayo, iyo cidda uu ka hadlay ilaa hadda. | |
| q1a | What do you expect the mahr to be? Write it in your own words, in whatever form you expect it. | Maxaad filaysaa in mahrku ahaado? Ku qor ereyadaada, nooca aad filaysona. | |
| q1b | Who have you said that to so far — your partner, your own family, anyone else? | Yaad taas kula hadashay ilaa hadda — qofka aad la socotid, qoyskaaga, ama qof kale? | |
| q1c | How much of it do you expect at the nikah, and how much deferred? | Immisa ka mid ah ayaad filaysaa in nikaaxa la siiyo, immisana dib loo dhigo? | |
| q1d | If your family names something different from what you just wrote, what would you want to happen next? | Haddii qoyskaagu ku sheegaan wax ka duwan waxaad hadda qortay, maxaad rabtaa inuu dhaco marka xigta? | |
| q1e | Who speaks for you when that conversation happens, and have you asked them? | Yaa kaa hadla marka wada-hadalkaasi dhaco, oo ma weydiisay? | |
| s1-agree | What we agree on | Waxa aan isku raacsanahay | |
| s1-open | What we're still deciding | Waxa aan wali go'aansanayn | |

## 2. The wedding — one-time expenses

| ID | English | Somali (unreviewed) | Reviewer note |
|---|---|---|---|
| s2-h | 2. The wedding — one-time expenses | 2. Aroosku — kharashka hal-mar ah | [UNCERTAIN: "hal-mar ah" for "one-time" — is there a more natural phrase] |
| s2-framing | This section is about the one-time cost of the wedding itself — the nikah, the walima, and whatever either side expects around them. It is separate from mahr. | Qaybtan waxay ku saabsan tahay kharashka hal-mar ah ee aroosku keligiis — nikaaxa, walimada, iyo wax kasta oo labada dhinac ka filayaan. Waxay ka duwan tahay mahrka. | |
| q2a | Which parts of the wedding do you expect to pay for yourself? | Qaybaha aroosku kee ayaad filaysaa inaad adigu bixiso? | |
| q2b | Which parts do you expect someone else to pay for, and have you asked them? | Qaybaha kee ayaad filaysaa in qof kale bixiyo, oo ma weydiisay? | |
| q2c | Of the people who would be there, how many are there because of you? | Dadka joogi lahaa, immisa ayaa jooga sababtoo ah adiga? | |
| q2d | What is the most you are willing to spend in total? Write your own ceiling, not a guess at what it will cost. | Waa maxay ugu badnaan aad diyaar u tahay inaad bixiso guud ahaan? Ku qor xadkaaga, hana qorin qiyaas ku saabsan intay ku kici doonto. | |
| q2e | If the cost goes past that ceiling, what is the first thing you would cut — and what would you cut last? | Haddii kharashku ka gudbo xadkaas, waa maxay waxa ugu horreeya ee aad ka gooyn lahayd — waase maxay ugu dambeysa? | |
| s2-agree | What we agree on | Waxa aan isku raacsanahay | |
| s2-open | What we're still deciding | Waxa aan wali go'aansanayn | |

## 3. Debt either of you already carries

| ID | English | Somali (unreviewed) | Reviewer note |
|---|---|---|---|
| s3-h | 3. Debt either of you already carries | 3. Deynta uu midkiin hore u qabo | [UNCERTAIN: "carries" as ongoing debt — "hore u qabo" may need adjustment] |
| s3-framing | This section is about money either of you already owes, from before anything about this marriage was decided. | Qaybtan waxay ku saabsan tahay lacagta uu midkiin hore u leeyahay, tan iyo intaan wax laga go'aansan guurkan. | |
| q3a | What do you owe right now, and to whom? Include anything that has someone else's name on it. | Maxaad hadda leedahay (deyn ahaan), yaana leedahay? Ku dar wax kasta oo qof kale magiciisu ku qoran yahay. | |
| q3b | What are you paying toward it each month, and how long is left? | Immisa ayaad bishiiba u bixinaysaa, oo intee in le'eg ayaa haray? | |
| q3c | Who already knows about it — your partner, your own family, your partner's family? | Yaa hore u ogaa — qofka aad la socotid, qoyskaaga, ama qoyska qofka aad la socotid? | |
| q3d | After the marriage, do you expect this to stay yours, or to be something you both handle? | Guurka ka dib, ma filaysaa in tani ay sii ahaato tan adiga kaligaa, mise wax aad labadiinu wada maareysaan? | |
| q3e | Is there anything here you would want settled before the nikah rather than after? | Ma jiraa wax halkan ah oo aad rabto in la xaliyo ka hor nikaaxa, halkii laga xali lahaa dabadeed? | |
| s3-agree | What we agree on | Waxa aan isku raacsanahay | |
| s3-open | What we're still deciding | Waxa aan wali go'aansanayn | |

## 4. Ongoing obligations to family

| ID | English | Somali (unreviewed) | Reviewer note |
|---|---|---|---|
| s4-h | 4. Ongoing obligations to family | 4. Waajibaadka joogtada ah ee qoyska | |
| s4-framing | This section is about money that leaves your account regularly for people outside this marriage — parents, siblings, relatives here or abroad. | Qaybtan waxay ku saabsan tahay lacagta joogtada ah ee akoonkaaga ka baxda oo loo diro dad ka baxsan guurkan — waalidiin, walaalo, iyo qaraabo ha joogaan halkan ama dibadda. | |
| q4a | Who do you send money to now, and how often? | Yaad hadda lacag u dirtaa, oo imisa jeer? | |
| q4b | What does that come to, against what you earn? | Taasi waa immisa marka la barbardhigo waxa aad soo qaadato? | [UNCERTAIN: "what you earn" without a figure — I tried to phrase this as a proportion, not an amount, to hold the sheet's own no-figures rule; a reviewer should check it doesn't invite a number as an answer] |
| q4c | Is the amount fixed, or does it change when something happens? | Qadarku ma go'an yahay, mise wuu isbeddelaa marka wax dhaco? | |
| q4d | Who knows what you send — your partner, your own family, the people you send it to? | Yaa og waxa aad dirto — qofka aad la socotid, qoyskaaga, ama dadka aad u dirto? | |
| q4e | After the marriage, do you expect this to stay the same, go up, or come down — and if yours and your partner's are different sizes, how do you want that handled? | Guurka ka dib, ma filaysaa inay sii ahaato sidii, kordho, mise hoos u dhacdo — haddii kaaga iyo kan qofka aad la socotidna ay kala duwan yihiin, sidee ayaad rabtaa in loo maareeyo? | |
| s4-agree | What we agree on | Waxa aan isku raacsanahay | |
| s4-open | What we're still deciding | Waxa aan wali go'aansanayn | |

## Legend (one-page file only)

| ID | English | Somali (unreviewed) | Reviewer note |
|---|---|---|---|
| legend | Each question below: Person A on the left, Person B on the right. | Su'aal kasta oo hoose: Qofka 1aad bidix, Qofka 2aad midig. | |

## Footer

| ID | English | Somali (unreviewed) | Reviewer note |
|---|---|---|---|
| footer-pub | Published by Niyyah — joinniyyah.com | Waxaa daabacay Niyyah — joinniyyah.com | [The brand name "Niyyah" and the URL stay unchanged in any language — not translated.] |
| footer-note | This sheet is for conversation. It is not religious or legal advice, and it is not a substitute for guidance from someone you trust. | Xaashidani waa wada-hadal. Maahan talo diini ah ama sharci, mana beddesho talada qof aad kalsoon tahay. | |
| version | v1.0 — 2026-09-20 | v1.0 — 2026-09-20 | Not translated — a version string, same in every language. |

---

## What still needs building, after review

1. A native speaker reviews every row above, table by table, and either
   confirms it or replaces it. Anything left blank in the "Reviewer note"
   column should be treated as **not yet reviewed**, not as approved by
   silence.
2. Once fully reviewed, a real `niyyah-money-conversation-sheet-so.html` (or
   a `lang="so"` variant of the existing files) gets built from the approved
   text — following the same content rules as the English sheet
   (`tests/sheet.test.ts`), plus `docs/PROTOCOL.md`'s Somali-line rule: read
   aloud to a Somali person of the target age before it ships, not just
   read.
3. `docs/ASSETS.md` gets a row for it **only once it is built, checked, and
   a person has opened it on a session-less device** — the same rule every
   other asset in that catalog already follows. It does not belong there
   while it is a draft like this one.
