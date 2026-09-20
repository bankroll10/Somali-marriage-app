# UNREVIEWED — Somali draft of the money conversation sheet

> **DO NOT PUBLISH. DO NOT LINK. DO NOT COPY INTO `public/`.**
>
> This file has now been through two AI passes and zero human ones.
> **Pass 1** (2026-09-20) was a machine-drafted translation, produced by
> Claude (an LLM), not by a native or fluent Somali speaker. **Pass 2**
> (2026-09-20, same day) was an AI editorial review of Pass 1 against the
> English source, checking all 49 rows and proposing corrections — also not
> performed by a native or fluent Somali speaker. Both passes are recorded
> below with their own findings. **No human or native-speaker approval is
> recorded anywhere in this document.** It has **not** been checked by one.
> Status: AI editorial review with proposed corrections, not a cleared
> translation.
>
> It lives in `internal/` specifically so it is never built, never served,
> and never reachable at a public URL — `internal/` is outside Vite's
> `public/` directory and nothing in `vite.config.ts` touches it. That
> boundary, and the fact that no row here has been promoted to
> `docs/ASSETS.md` or a public file, is checked directly by
> `tests/somali-gate.test.ts`, not left to convention.
>
> **Why this matters more than a normal typo.** Niyyah's own operating
> convention — see `src/data/somali.ts`'s `approved` field and
> `docs/PROTOCOL.md`'s Somali-line review process — is that no Somali text
> reaches a reader until someone who actually speaks the language has read
> it and said it sounds like something a Somali person would say. Neither
> pass on this file has cleared that bar. Nothing here changes `approved`
> anywhere in the codebase, requests HTML generation, or touches a public
> asset — this is a source document only.
>
> **What a human reviewer should do:** read the Somali column against the
> English column, row by row, in the tables below, and either confirm it,
> replace it, or leave a note. The "Editorial assessment" column records
> what the *AI* pass concluded (Keep / Revise) — it is not a record of human
> approval, however confident the wording sounds. Once a native or fluent
> speaker has actually read every row, a *separate* task builds an actual
> `niyyah-money-conversation-sheet-so.html` from the approved text — this
> file is source material for that, not a preview of it.

---

## Pass 2 — AI editorial review (2026-09-20)

Reviewer: an AI editorial pass (not a human, not a native or fluent Somali
speaker credentialed as such). Scope: all 49 rows from Pass 1, checked
against the English source. This section records that review's own
findings, decisions, and limits, largely in the reviewer's own words.

### Findings that mattered most

1. **Direction of the debt was backwards in Pass 1.** `lacagta uu ...
   leeyahay` reads as money someone *has*, not money someone *owes* —
   `q3a`'s Pass-1 wording did not actually ask what the reader owes and to
   whom. Corrected throughout section 3 using `lagugu leeyahay` / `lagu
   leeyahay`, which name the reader as the one owing and the creditor
   explicitly.
2. **"Speaks for you" was mistranslated.** Pass 1's `Yaa kaa hadla` reads as
   "who speaks *about* you," not "who speaks *on your behalf*." Corrected
   to `Yaa magacaaga ku hadlaya` in `q1e`.
3. **The mahr framing lost "has heard the expectation."** Pass 1's `cidda
   uu ka hadlay` can mean whom someone spoke *about*, not to whom an
   expectation was *told*. `s1-framing` now says explicitly who has been
   told.
4. **The shared answer labels were ambiguous, not wrong.** Pass 1's `aan`
   is not automatically incorrect, but it can read as more than one
   person/number — `aynu` makes "we" explicit in every `*-agree` row, and
   the `*-open` rows now say plainly that a decision has not yet been
   reached (`Waxa aynaan weli go'aan ka gaarin`).
5. **The footer needed two repairs.** `Xaashidani waa wada-hadal`
   literally claims the sheet *is* a conversation rather than saying it is
   *for* one; and `qof aad kalsoon tahay` was missing the `ku` that "trust
   *in* someone" needs in Somali (`qof aad ku kalsoon tahay`).
6. **A real risk of over-correcting the content rules, caught and not
   applied.** The English sheet legitimately asks for amounts, a maximum,
   monthly payments, and a guest count (`q2d`, `q2e`, `q3b`, `q4b`) — the
   repo's own "no figures" rule (`tests/sheet.test.ts`) bans the *sheet's
   own prose* from stating a figure or benchmark; it has never meant the
   *reader's answer* can't contain a number, and every English question
   above already invites one. Pass 1's note on `q4b` tried to phrase that
   question to avoid inviting a numeric answer at all, which is not what
   the English asks and would have quietly weakened the Somali relative to
   its own source. That note is removed; `q4b` and every other
   amount-inviting question are translated the same way their English
   original asks the question, no more cautious and no less.

### Decisions on the four Pass-1 open questions

**1. Person and number.** Plural address (`idinka`) for the shared
instructions, singular (`adiga`) for each individual's own answer column —
that fits the worksheet's actual structure, and is *not* the English-style
informal/formal switch Pass 1 framed it as. `Labadiinna` names both
participants explicitly where useful. Inclusive `aynu` / `aynaan` are used
in the two shared boxes at the end of every section. These are
grammatical person/number and inclusivity choices, not claims that other
regional uses of `aan` are wrong — Somali has real colloquial variation
here (Nilsson, *Beginner's Somali Grammar*, pp. 53–55). Separately:
grammatical gender on a word like `qof` is not the same thing as assigning
a *person* a gendered role, and no question below assigns payment,
receipt, representation, or debt management to a husband or a wife
specifically.

**2. Terminology and spelling.**

| English term | Convention used below | Note |
|---|---|---|
| mahr | `meher` (`meherka` / `meherku`) | Somali spelling, used consistently. A style choice, not audience-tested. |
| nikah | `nikaax` (`nikaaxa` / `nikaaxu`) | Kept distinct from the wedding's other events. |
| walima | `waliimo` (`waliimada`) | Kept specific — `aroos` would lose the distinction. |
| wedding | `aroos`, inflected by sentence role | Not the subject form `aroosku` everywhere. |
| partner | `qofka aad guurka ka wada fikiraysaan` | Longer than a single word, but names the relationship (considering marriage together) instead of an ambiguous "the person you're with." |
| debt | `deyn` (plural `deymo`) | `dayn` also exists; `deyn` used for consistency. |
| Person A / Person B | `Qofka A` / `Qofka B` | Preserves the English column labels rather than renumbering them. |

**3. Voice.** Plain written Somali for a private adult conversation. This
pass removes the clearest English carryovers (`waa okay`), repairs several
literal mistranslations, and keeps sensitive questions descriptive rather
than clinical. Naturalness and regional spelling preference still vary by
speaker — this is still an editorial recommendation, not a claim that
every Somali speaker would phrase it identically. A human read-aloud pass
should pay particular attention to the long introductory sentences, the
partner wording, and `q2c` (the guest-count question).

**4. Neutrality and question scope, re-checked row by row.** The mahr
questions ask what the reader expects without naming them payer or
recipient. The debt-management question (`q3d`) asks about an
*expectation* after marriage, not a claim that marriage transfers legal
debt. The family-support heading names the subject, not an obligation
under religion or law. "Settled before the nikah" (`q3e`) stays broad
enough to mean *any* resolution, not an instruction to repay everything
first. Different family-support amounts (`q4e`) stay something to discuss
— no equalization rule is implied. Every instruction to write or complete
the sheet is a worksheet instruction, not financial advice. The privacy
and print statements (`note-1`, `note-2`) are translated as given; whether
they're actually true of the app is an implementation question outside a
language review.

### What's still open after this pass

- `lede-2`'s "at home or abroad" is rendered geographically (`halkan ama
  dibadda` — "here or abroad"), not as a specific home country. If the
  English intends something narrower, that needs a source-language
  decision, not a Somali-side guess.
- `q2c` ("because of you") is read as *guests attending from your side*,
  the natural wedding-context reading — not necessarily people you
  personally invited. Worth confirming against what the English author
  meant.
- `q3d` ("stay yours") is rendered as continuing to handle the debt
  individually, not as a statement about legal ownership changing or not
  changing at marriage. That distinction matters and should be checked.
- The debt-direction construction `lagugu leeyahay deyn` is attested in
  general Somali financial usage (e.g. MyBank's Somali-language materials)
  — that supports the *direction* of the correction, not every sentence
  built from it, and it is not itself native-speaker approval.

None of the above is resolved by this pass. They're flagged so a human
reviewer starts from a list, not a blank page.

---

## Pass 1 — original open questions (2026-09-20, superseded by Pass 2 above)

Pass 1 left four open questions for a reviewer. Pass 2 answered all four —
see "Decisions on the four Pass-1 open questions" above — but a human
native-speaker review may still reach a different answer than an AI
editorial pass did, on any of them.

---

## Header

| ID | English | Somali (Pass 2, unreviewed by a human) | Editorial assessment |
|---|---|---|---|
| title | The money conversation | Sheekada lacagta | Keep — understandable, approachable title. |
| h1 | The money conversation | Sheekada lacagta | Revise — consistent sentence capitalization; Pass 1's wording was otherwise acceptable. |
| lede-1 | A sheet for two adults considering marriage, to work through before the families discuss numbers. Each of you answers in your own column. | Waa xaashi loogu talagalay laba qof oo qaangaar ah oo ka fikiraya inay is guursadaan. Wada buuxiya ka hor inta aysan qoysasku ka wada hadlin lacagta. Qof walba ha ku jawaabo tiirka u gaarka ah. | Revise — repairs a Pass-1 typo, clarifies the two people are considering marrying *each other*, and uses plural instructions followed by an individual-column instruction. "Discuss numbers" is rendered conversationally as discussing money. |
| lede-2 | The four subjects are kept apart on purpose. Mahr is not the wedding. The wedding is not what either of you already owes. And none of the three is the money that leaves your account every month for people at home or abroad. | Afartan arrimood si gaar ah ayaa loo kala saaray. Meherka, kharashka arooska iyo deymaha hore ee midkiin ama labadiinnaba lagu leeyahay waa arrimo kala duwan. Lacagta bil kasta akoonnadiinna ka baxda ee aad u dirtaan dad ku nool halkan ama dibadda iyaduna waa arrin gaar ah. | Revise — restores the debt meaning Pass 1 got backwards, and preserves all four categories. Uses plural accounts without implying a joint account. "At home or abroad" is read geographically; see "What's still open" above. |
| note-1 | Nothing on this page is saved or sent. What you type stays in this window until you close it, and there is nothing to submit. | Waxa aad boggan ku qortaan lama kaydiyo, lamana diro. Qoraalkiinnu wuxuu ku sii jiraa daaqaddan ilaa aad xirtaan. Wax aad gudbisaan ma jiraan. | Revise — clearer wording and consistent plural address. Translation of the stated privacy claim only; not a verification that the app actually behaves this way. |
| note-2 | Print this and write on it — typing here is fine, but long answers may be cut off when printed. | Daabaca xaashidan oo gacanta ku buuxiya. Halkan sidoo kale waad ku qori kartaan, laakiin jawaabaha dhaadheer waxaa laga yaabaa inaysan si buuxda uga muuqan marka la daabaco. | Revise — removes `waa okay`, keeps plural address, explains clipping as answers not appearing in full on the printout. |
| who-a | Person A | Qofka A | Revise — preserves the A/B column convention (see terminology table above). |
| who-b | Person B | Qofka B | Revise — preserves the A/B column convention. |
| who-date | Date | Taariikhda | Keep — correct label. |

## 1. Mahr

| ID | English | Somali (Pass 2, unreviewed by a human) | Editorial assessment |
|---|---|---|---|
| s1-h | 1. Mahr | 1. Meherka | Revise — consistent Somali terminology. |
| s1-framing | This section is about mahr only — what each of you expects, and who has heard that expectation so far. | Qaybtani waxay ku saabsan tahay meherka oo keliya: waxa qofkiin kasta filayo iyo cidda arrintaas ilaa hadda loo sheegay. | Revise — corrects who was told about the expectation; Pass 1's `cidda uu ka hadlay` did not express that. |
| q1a | What do you expect the mahr to be? Write it in your own words, in whatever form you expect it. | Maxaad filaysaa inuu meherku noqdo? Ku sharax erayadaada, adigoo sheegaya qaabka aad filayso inuu noqdo. | Revise — complete, natural construction; keeps the expected form open, doesn't restrict the answer to cash. |
| q1b | Who have you said that to so far — your partner, your own family, anyone else? | Yaad ilaa hadda u sheegtay waxa aad filayso: qofka aad guurka ka wada fikiraysaan, qoyskaaga ama cid kale? | Revise — "told" is clearer than Pass 1's `kula hadashay`; applies the partner convention. |
| q1c | How much of it do you expect at the nikah, and how much deferred? | Intee ka mid ah meherka ayaad filaysaa in la bixiyo marka nikaaxu dhacayo, inteese dib loo dhigo? | Revise — expresses timing clearly and uses neutral payment wording; doesn't cast the reader as the recipient. |
| q1d | If your family names something different from what you just wrote, what would you want to happen next? | Haddii qoyskaagu soo jeediyo wax ka duwan waxa aad hadda qortay, maxaad jeclaan lahayd in marka xigta la sameeyo? | Revise — repairs agreement and the relative phrase; asks what the reader would *want* done next without prescribing it. |
| q1e | Who speaks for you when that conversation happens, and have you asked them? | Yaa magacaaga ku hadlaya marka wada hadalkaasi dhacayo, mase ka codsatay arrintaas? | Revise — "speaks on your behalf," followed by whether the reader has requested that role. No representative is assumed. |
| s1-agree | What we agree on | Waxa aynu isku raacsan nahay | Revise — explicitly shared "we"; clearer separation of the adjective and verb. |
| s1-open | What we're still deciding | Waxa aynaan weli go'aan ka gaarin | Revise — "what we have not yet reached a decision on." Removes Pass 1's ambiguous negative wording. |

## 2. The wedding — one-time expenses

| ID | English | Somali (Pass 2, unreviewed by a human) | Editorial assessment |
|---|---|---|---|
| s2-h | 2. The wedding — one-time expenses | 2. Arooska: kharashaadka hal mar ku baxa | Revise — proper heading form and clearer expense wording. "One-time" refers to wedding-event expenses, not a requirement to pay every bill in a single installment. |
| s2-framing | This section is about the one-time cost of the wedding itself — the nikah, the walima, and whatever either side expects around them. It is separate from mahr. | Qaybtani waxay ku saabsan tahay kharashaadka hal mar ku baxa arooska laftiisa: nikaaxa, waliimada iyo wax kasta oo kale oo labada dhinac midkood ka filayo munaasabadahaas. Meherka si gaar ah ayaa looga hadlayaa. | Revise — repairs Pass 1's noun construction, preserves "either side," keeps walima specific, separates mahr. |
| q2a | Which parts of the wedding do you expect to pay for yourself? | Qaybahee ka mid ah kharashka arooska ayaad filaysaa inaad adigu bixiso? | Revise — corrects Pass 1's `Qaybaha aroosku kee`; asks which parts of the wedding cost the reader expects to cover. |
| q2b | Which parts do you expect someone else to pay for, and have you asked them? | Qaybahee ayaad filaysaa in cid kale bixiso, mase weydiisatay? | Revise — smoother interrogative and explicit request wording; payment stays an expectation, not a demand. |
| q2c | Of the people who would be there, how many are there because of you? | Martida arooska iman lahayd, immisa ayaa dhinacaaga ka imanaysa? | Revise — reads "because of you" as guests attending *from your side*; see "What's still open" above for the alternate reading. |
| q2d | What is the most you are willing to spend in total? Write your own ceiling, not a guess at what it will cost. | Waa immisa lacagta ugu badan ee aad diyaar u tahay inaad guud ahaan ku bixiso arooska? Qor xadka aad adigu dejisatay; ha qorin qiyaasta kharashka arooska. | Revise — supplies the missing noun, asks for the reader's own maximum, preserves the distinction from a cost estimate. No suggested maximum supplied. |
| q2e | If the cost goes past that ceiling, what is the first thing you would cut — and what would you cut last? | Haddii kharashku dhaafo xadkaas, maxaad marka hore ka dhimi lahayd, maxaadse ugu dambayn ka dhimi lahayd? | Revise — keeps both ends of the prioritization question explicit. |
| s2-agree | What we agree on | Waxa aynu isku raacsan nahay | Revise — same shared-agreement label as section 1. |
| s2-open | What we're still deciding | Waxa aynaan weli go'aan ka gaarin | Revise — same unresolved-decision label as section 1. |

## 3. Debt either of you already carries

| ID | English | Somali (Pass 2, unreviewed by a human) | Editorial assessment |
|---|---|---|---|
| s3-h | 3. Debt either of you already carries | 3. Deymaha hore ee midkiin ama labadiinnaba lagu leeyahay | Revise — explicitly covers debt owed by either person or both. |
| s3-framing | This section is about money either of you already owes, from before anything about this marriage was decided. | Qaybtani waxay ku saabsan tahay deymaha midkiin ama labadiinnaba weli lagu leeyahay ee jiray ka hor intaan wax go'aan ah laga gaarin guurkan. | Revise — **critical meaning repair**: existing debts still owed, from before decisions about this marriage. Pass 1's `lacagta uu midkiin hore u leeyahay` did not establish that direction (see Findings above). |
| q3a | What do you owe right now, and to whom? Include anything that has someone else's name on it. | Waa maxay deymaha hadda lagugu leeyahay, yaase kugu leh? Ku dar deyn kasta oo ku qoran magaca qof kale. | Revise — **critical meaning repair**: asks about debts owed *by* the reader and who is owed. Preserves inclusion of debts in someone else's name without making a legal-liability claim. |
| q3b | What are you paying toward it each month, and how long is left? | Immisa ayaad bil kasta ka bixisaa deyntaas, intee waqti ah ayaase ka harsan bixinteeda? | Revise — makes clear the second half asks about remaining *time*, not the remaining balance. |
| q3c | Who already knows about it — your partner, your own family, your partner's family? | Yaa hadda ka warqaba deyntaas: qofka aad guurka ka wada fikiraysaan, qoyskaaga ama qoyska qofkaas? | Revise — present-tense awareness is clearer than Pass 1's past-tense `ogaa`; identifies the debt and both families explicitly. |
| q3d | After the marriage, do you expect this to stay yours, or to be something you both handle? | Guurka ka dib, ma filaysaa inaad deyntan adigu keliya sii maareyso, mise inaad labadiinnu wada maareysaan? | Revise — "stay yours" rendered as *continued individual handling*, contrasted with shared handling — a practical expectation, not a claim about legal ownership changing. See "What's still open" above. |
| q3e | Is there anything here you would want settled before the nikah rather than after? | Ma jiraan arrimo ku saabsan deyntan oo aad jeclaan lahayd in la xalliyo ka hor nikaaxa, halkii laga xallin lahaa ka dib? | Revise — clarifies the referent and repairs wording. "Resolved" stays broad; not an instruction to repay everything before marriage. |
| s3-agree | What we agree on | Waxa aynu isku raacsan nahay | Revise — consistent shared-agreement label. |
| s3-open | What we're still deciding | Waxa aynaan weli go'aan ka gaarin | Revise — consistent unresolved-decision label. |

## 4. Ongoing obligations to family

| ID | English | Somali (Pass 2, unreviewed by a human) | Editorial assessment |
|---|---|---|---|
| s4-h | 4. Ongoing obligations to family | 4. Waajibaadka dhaqaale ee joogtada ah ee qoyska | Revise — adds "financial" to scope the heading. Names obligations as the conversation's topic; adds no ruling about which obligations exist. |
| s4-framing | This section is about money that leaves your account regularly for people outside this marriage — parents, siblings, relatives here or abroad. | Qaybtani waxay ku saabsan tahay lacagta si joogto ah uga baxda akoonnadiinna ee aad u dirtaan dad kale oo aan labadiinna ahayn: waalidiin, walaalo iyo qaraabo ku nool halkan ama dibadda. | Revise — plural shared address; "people other than the two of you" avoids Pass 1's awkward literal phrasing. Preserves regular transfers and the local/abroad scope. |
| q4a | Who do you send money to now, and how often? | Yaad hadda lacag u dirtaa, intee jeerna ayaad u dirtaa? | Revise — minor fluency edit; keeps recipient and frequency open. Pass 1's basic meaning was already acceptable. |
| q4b | What does that come to, against what you earn? | Wadarta lacagta aad dirto waa immisa marka loo eego dakhligaaga? | Revise — identifies total transfers and income explicitly. Amounts or proportions are valid answers here, matching the English; Pass 1's note suggesting numeric answers should be avoided is withdrawn (see Findings, item 6). |
| q4c | Is the amount fixed, or does it change when something happens? | Qaddarkaasi ma go'an yahay, mise wuu is beddelaa marka wax dhacaan? | Revise — clearer reference to the amount and repaired subordinate verb. Introduces no particular emergency or trigger. |
| q4d | Who knows what you send — your partner, your own family, the people you send it to? | Yaa og inta lacag ah ee aad dirto: qofka aad guurka ka wada fikiraysaan, qoyskaaga ama dadka aad lacagta u dirto? | Revise — makes knowledge of the transfer *amount* explicit and applies the partner convention. |
| q4e | After the marriage, do you expect this to stay the same, go up, or come down — and if yours and your partner's are different sizes, how do you want that handled? | Guurka ka dib, ma filaysaa in lacagta aad dirto ay sidii hore ahaan doonto, kordhi doonto, mise yaraan doonto? Haddii adiga iyo qofka aad guurka ka wada fikiraysaan aad dirtaan lacag kala badan, sidee ayaad rabtaa in arrintaas loo maareeyo? | Revise — names the transfer amount, preserves all three possible changes plus the unequal-amounts question. Split into two sentences for readability; suggests no equalization. |
| s4-agree | What we agree on | Waxa aynu isku raacsan nahay | Revise — consistent shared-agreement label. |
| s4-open | What we're still deciding | Waxa aynaan weli go'aan ka gaarin | Revise — consistent unresolved-decision label. |

## Legend (one-page file only)

| ID | English | Somali (Pass 2, unreviewed by a human) | Editorial assessment |
|---|---|---|---|
| legend | Each question below: Person A on the left, Person B on the right. | Su'aal kasta oo hoos ku qoran, Qofka A ha ku jawaabo dhanka bidix, Qofka B-na dhanka midig. | Revise — keeps A/B labels and explicitly assigns each answer to the correct side. |

## Footer

| ID | English | Somali (Pass 2, unreviewed by a human) | Editorial assessment |
|---|---|---|---|
| footer-pub | Published by Niyyah — joinniyyah.com | Waxaa daabacay Niyyah — joinniyyah.com | Keep — appropriate publisher attribution; preserves brand and URL. Retaining this string does not mean the Somali sheet has been published — it has not. |
| footer-note | This sheet is for conversation. It is not religious or legal advice, and it is not a substitute for guidance from someone you trust. | Xaashidan waxaa loogu talagalay wada hadal. Ma aha talo diini ah ama sharci ah, mana beddelayso talada qof aad ku kalsoon tahay. | Revise — restores "for conversation" (Pass 1 claimed the sheet *is* a conversation), preserves both advice exclusions, corrects the missing `ku` in "trust." |
| version | v1.0 — 2026-09-20 | v1.0 — 2026-09-20 | Keep — exact version string, not translated in any language. |

---

## Evidence and remaining limits (Pass 2's own account)

The grammatical distinction among `adiga`, `idinka`, and inclusive `aynu`
is supported by Nilsson's grammar, pp. 53–55, which also notes colloquial
variation — these choices should not be presented as proof every
alternative is wrong. The debt construction `lagugu leeyahay deyn` is also
attested in general Somali-language financial usage (e.g. MyBank); that
supports the *direction* of the correction, not every sentence built from
it, and is not independent native-speaker approval. The complete Pass-2
translation and its naturalness judgments are AI editorial work. A human
reviewer should check the proposed text itself — particularly the
contextual interpretations flagged for `lede-2`, `q2c`, and `q3d` above —
rather than treating either pass as a substitute for that review.

---

## What still needs building, after human review

1. A native or fluent Somali speaker reviews every row above, confirms or
   replaces it, and specifically weighs in on the four items under "What's
   still open after this pass." A blank or unconfirmed row is **not
   reviewed**, whatever the AI editorial assessment says.
2. Once fully reviewed, a real `niyyah-money-conversation-sheet-so.html`
   (or a `lang="so"` variant of the existing files) gets built from the
   approved text — following the same content rules as the English sheet
   (`tests/sheet.test.ts`), plus `docs/PROTOCOL.md`'s rule: read aloud to a
   Somali person of the target age before it ships, not just read.
3. `docs/ASSETS.md` gets a row for it **only once it is built, checked,
   and a person has opened it on a session-less device** — the same rule
   every other asset in that catalog already follows. It does not belong
   there while it is a draft like this one, however many AI passes it has
   had.
