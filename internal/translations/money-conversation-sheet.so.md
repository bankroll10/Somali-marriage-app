# Somali translation of the money conversation sheet — reviewed and approved

> Reviewed and approved by the founder, 2026-09-20. This is the approved
> source for `public/niyyah-money-conversation-sheet-so.html`,
> `public/niyyah-money-conversation-sheet-1page-so.html`, and
> `public/niyyah-money-conversation-sheet-so.txt`. IDs match the English
> sheet's element IDs, so a future correction can be traced straight to the
> HTML it belongs in.
>
> Kept here as the reference record — what each line says and why a given
> phrasing was chosen — for whoever edits the Somali sheet next. It is not
> itself served: `internal/` sits outside Vite's `publicDir`, so nothing in
> this file reaches a public URL on its own; the built HTML files under
> `public/` are what ships.

## Notes on terminology and choices

**Person and number.** Plural address (`idinka`) for the shared
instructions, singular (`adiga`) for each individual's own answer column —
matching the worksheet's actual structure. `Labadiinna` names both
participants explicitly where useful. Inclusive `aynu` / `aynaan` are used
in the two shared boxes at the end of every section. Grammatical gender on
a word like `qof` is not the same thing as assigning a *person* a gendered
role, and no question assigns payment, receipt, representation, or debt
management to a husband or a wife specifically.

**Terminology and spelling.**

| English term | Convention used | Note |
|---|---|---|
| mahr | `meher` (`meherka` / `meherku`) | Somali spelling, used consistently. |
| nikah | `nikaax` (`nikaaxa` / `nikaaxu`) | Kept distinct from the wedding's other events. |
| walima | `waliimo` (`waliimada`) | Kept specific — `aroos` would lose the distinction. |
| wedding | `aroos`, inflected by sentence role | Not the subject form `aroosku` everywhere. |
| partner | `qofka aad guurka ka wada fikiraysaan` | Names the relationship (considering marriage together) instead of an ambiguous "the person you're with." |
| debt | `deyn` (plural `deymo`) | `dayn` also exists; `deyn` used for consistency. |
| Person A / Person B | `Qofka A` / `Qofka B` | Preserves the English column labels rather than renumbering them. |

**Voice.** Plain written Somali for a private adult conversation, with no
English carryovers (`waa okay` and similar removed).

**Neutrality and scope.** The mahr questions ask what the reader expects
without naming them payer or recipient. The debt-management question
(`q3d`) asks about an *expectation* after marriage, not a claim that
marriage transfers legal debt. The family-support heading names the
subject, not an obligation under religion or law. "Settled before the
nikah" (`q3e`) stays broad enough to mean *any* resolution, not an
instruction to repay everything first. Different family-support amounts
(`q4e`) stay something to discuss — no equalization rule is implied. Every
instruction to write or complete the sheet is a worksheet instruction, not
financial advice.

**Debt direction, specifically.** `q3a` and `s3-framing` ask what the
reader owes and to whom (`lagugu leeyahay` / `lagu leeyahay`), not what the
reader has — a real direction, checked against general Somali financial
usage (e.g. MyBank's Somali-language materials) as well as read aloud.

**Numbers.** The sheet's own rule against figures applies to the sheet's
*own prose* (no stated benchmarks or suggested amounts) — it was never
meant to stop the *reader's own answer* from containing a number, and the
English questions themselves ask for amounts in several places (`q2d`,
`q2e`, `q3b`). Every number-inviting Somali question is translated the same
way its English original asks it.

**Worth knowing if this gets edited later.** `lede-2`'s "at home or
abroad" is rendered geographically (`halkan ama dibadda`), not as a
specific home country. `q2c`'s "because of you" is read as guests
attending from the reader's side. `q3d`'s "stay yours" is rendered as
continuing to handle the debt individually, not a statement about legal
ownership. None of these change the approved text — they're recorded here
so a future edit starts from the same understanding.

---

## Header

| ID | English | Somali (approved) | Notes |
|---|---|---|---|
| title | The money conversation | Sheekada lacagta | |
| h1 | The money conversation | Sheekada lacagta | |
| lede-1 | A sheet for two adults considering marriage, to work through before the families discuss numbers. Each of you answers in your own column. | Waa xaashi loogu talagalay laba qof oo qaangaar ah oo ka fikiraya inay is guursadaan. Wada buuxiya ka hor inta aysan qoysasku ka wada hadlin lacagta. Qof walba ha ku jawaabo tiirka u gaarka ah. | Clarifies the two people are considering marrying *each other*; plural instructions, then an individual-column instruction. |
| lede-2 | The four subjects are kept apart on purpose. Mahr is not the wedding. The wedding is not what either of you already owes. And none of the three is the money that leaves your account every month for people at home or abroad. | Afartan arrimood si gaar ah ayaa loo kala saaray. Meherka, kharashka arooska iyo deymaha hore ee midkiin ama labadiinnaba lagu leeyahay waa arrimo kala duwan. Lacagta bil kasta akoonnadiinna ka baxda ee aad u dirtaan dad ku nool halkan ama dibadda iyaduna waa arrin gaar ah. | Preserves all four categories; plural accounts without implying a joint one. |
| note-1 | Nothing on this page is saved or sent. What you type stays in this window until you close it, and there is nothing to submit. | Waxa aad boggan ku qortaan lama kaydiyo, lamana diro. Qoraalkiinnu wuxuu ku sii jiraa daaqaddan ilaa aad xirtaan. Wax aad gudbisaan ma jiraan. | |
| note-2 | Print this and write on it — typing here is fine, but long answers may be cut off when printed. | Daabaca xaashidan oo gacanta ku buuxiya. Halkan sidoo kale waad ku qori kartaan, laakiin jawaabaha dhaadheer waxaa laga yaabaa inaysan si buuxda uga muuqan marka la daabaco. | |
| who-a | Person A | Qofka A | |
| who-b | Person B | Qofka B | |
| who-date | Date | Taariikhda | |

## 1. Mahr

| ID | English | Somali (approved) | Notes |
|---|---|---|---|
| s1-h | 1. Mahr | 1. Meherka | |
| s1-framing | This section is about mahr only — what each of you expects, and who has heard that expectation so far. | Qaybtani waxay ku saabsan tahay meherka oo keliya: waxa qofkiin kasta filayo iyo cidda arrintaas ilaa hadda loo sheegay. | |
| q1a | What do you expect the mahr to be? Write it in your own words, in whatever form you expect it. | Maxaad filaysaa inuu meherku noqdo? Ku sharax erayadaada, adigoo sheegaya qaabka aad filayso inuu noqdo. | |
| q1b | Who have you said that to so far — your partner, your own family, anyone else? | Yaad ilaa hadda u sheegtay waxa aad filayso: qofka aad guurka ka wada fikiraysaan, qoyskaaga ama cid kale? | |
| q1c | How much of it do you expect at the nikah, and how much deferred? | Intee ka mid ah meherka ayaad filaysaa in la bixiyo marka nikaaxu dhacayo, inteese dib loo dhigo? | |
| q1d | If your family names something different from what you just wrote, what would you want to happen next? | Haddii qoyskaagu soo jeediyo wax ka duwan waxa aad hadda qortay, maxaad jeclaan lahayd in marka xigta la sameeyo? | |
| q1e | Who speaks for you when that conversation happens, and have you asked them? | Yaa magacaaga ku hadlaya marka wada hadalkaasi dhacayo, mase ka codsatay arrintaas? | |
| s1-agree | What we agree on | Waxa aynu isku raacsan nahay | |
| s1-open | What we're still deciding | Waxa aynaan weli go'aan ka gaarin | |

## 2. The wedding — one-time expenses

| ID | English | Somali (approved) | Notes |
|---|---|---|---|
| s2-h | 2. The wedding — one-time expenses | 2. Arooska: kharashaadka hal mar ku baxa | |
| s2-framing | This section is about the one-time cost of the wedding itself — the nikah, the walima, and whatever either side expects around them. It is separate from mahr. | Qaybtani waxay ku saabsan tahay kharashaadka hal mar ku baxa arooska laftiisa: nikaaxa, waliimada iyo wax kasta oo kale oo labada dhinac midkood ka filayo munaasabadahaas. Meherka si gaar ah ayaa looga hadlayaa. | |
| q2a | Which parts of the wedding do you expect to pay for yourself? | Qaybahee ka mid ah kharashka arooska ayaad filaysaa inaad adigu bixiso? | |
| q2b | Which parts do you expect someone else to pay for, and have you asked them? | Qaybahee ayaad filaysaa in cid kale bixiso, mase weydiisatay? | |
| q2c | Of the people who would be there, how many are there because of you? | Martida arooska iman lahayd, immisa ayaa dhinacaaga ka imanaysa? | |
| q2d | What is the most you are willing to spend in total? Write your own ceiling, not a guess at what it will cost. | Waa immisa lacagta ugu badan ee aad diyaar u tahay inaad guud ahaan ku bixiso arooska? Qor xadka aad adigu dejisatay; ha qorin qiyaasta kharashka arooska. | |
| q2e | If the cost goes past that ceiling, what is the first thing you would cut — and what would you cut last? | Haddii kharashku dhaafo xadkaas, maxaad marka hore ka dhimi lahayd, maxaadse ugu dambayn ka dhimi lahayd? | |
| s2-agree | What we agree on | Waxa aynu isku raacsan nahay | |
| s2-open | What we're still deciding | Waxa aynaan weli go'aan ka gaarin | |

## 3. Debt either of you already carries

| ID | English | Somali (approved) | Notes |
|---|---|---|---|
| s3-h | 3. Debt either of you already carries | 3. Deymaha hore ee midkiin ama labadiinnaba lagu leeyahay | |
| s3-framing | This section is about money either of you already owes, from before anything about this marriage was decided. | Qaybtani waxay ku saabsan tahay deymaha midkiin ama labadiinnaba weli lagu leeyahay ee jiray ka hor intaan wax go'aan ah laga gaarin guurkan. | Debt direction: what the reader owes, not what they have. |
| q3a | What do you owe right now, and to whom? Include anything that has someone else's name on it. | Waa maxay deymaha hadda lagugu leeyahay, yaase kugu leh? Ku dar deyn kasta oo ku qoran magaca qof kale. | Debt direction: what the reader owes, not what they have. |
| q3b | What are you paying toward it each month, and how long is left? | Immisa ayaad bil kasta ka bixisaa deyntaas, intee waqti ah ayaase ka harsan bixinteeda? | |
| q3c | Who already knows about it — your partner, your own family, your partner's family? | Yaa hadda ka warqaba deyntaas: qofka aad guurka ka wada fikiraysaan, qoyskaaga ama qoyska qofkaas? | |
| q3d | After the marriage, do you expect this to stay yours, or to be something you both handle? | Guurka ka dib, ma filaysaa inaad deyntan adigu keliya sii maareyso, mise inaad labadiinnu wada maareysaan? | "Stay yours" is continued individual handling, not a legal-ownership claim. |
| q3e | Is there anything here you would want settled before the nikah rather than after? | Ma jiraan arrimo ku saabsan deyntan oo aad jeclaan lahayd in la xalliyo ka hor nikaaxa, halkii laga xallin lahaa ka dib? | |
| s3-agree | What we agree on | Waxa aynu isku raacsan nahay | |
| s3-open | What we're still deciding | Waxa aynaan weli go'aan ka gaarin | |

## 4. Ongoing obligations to family

| ID | English | Somali (approved) | Notes |
|---|---|---|---|
| s4-h | 4. Ongoing obligations to family | 4. Waajibaadka dhaqaale ee joogtada ah ee qoyska | |
| s4-framing | This section is about money that leaves your account regularly for people outside this marriage — parents, siblings, relatives here or abroad. | Qaybtani waxay ku saabsan tahay lacagta si joogto ah uga baxda akoonnadiinna ee aad u dirtaan dad kale oo aan labadiinna ahayn: waalidiin, walaalo iyo qaraabo ku nool halkan ama dibadda. | |
| q4a | Who do you send money to now, and how often? | Yaad hadda lacag u dirtaa, intee jeerna ayaad u dirtaa? | |
| q4b | What does that come to, against what you earn? | Wadarta lacagta aad dirto waa immisa marka loo eego dakhligaaga? | Amounts or proportions are valid answers, matching the English. |
| q4c | Is the amount fixed, or does it change when something happens? | Qaddarkaasi ma go'an yahay, mise wuu is beddelaa marka wax dhacaan? | |
| q4d | Who knows what you send — your partner, your own family, the people you send it to? | Yaa og inta lacag ah ee aad dirto: qofka aad guurka ka wada fikiraysaan, qoyskaaga ama dadka aad lacagta u dirto? | |
| q4e | After the marriage, do you expect this to stay the same, go up, or come down — and if yours and your partner's are different sizes, how do you want that handled? | Guurka ka dib, ma filaysaa in lacagta aad dirto ay sidii hore ahaan doonto, kordhi doonto, mise yaraan doonto? Haddii adiga iyo qofka aad guurka ka wada fikiraysaan aad dirtaan lacag kala badan, sidee ayaad rabtaa in arrintaas loo maareeyo? | Split into two sentences for readability; no equalization suggested. |
| s4-agree | What we agree on | Waxa aynu isku raacsan nahay | |
| s4-open | What we're still deciding | Waxa aynaan weli go'aan ka gaarin | |

## Legend (one-page file only)

| ID | English | Somali (approved) | Notes |
|---|---|---|---|
| legend | Each question below: Person A on the left, Person B on the right. | Su'aal kasta oo hoos ku qoran, Qofka A ha ku jawaabo dhanka bidix, Qofka B-na dhanka midig. | |

## Footer

| ID | English | Somali (approved) | Notes |
|---|---|---|---|
| footer-pub | Published by Niyyah — joinniyyah.com | Waxaa daabacay Niyyah — joinniyyah.com | Brand name and URL unchanged in any language. |
| footer-note | This sheet is for conversation. It is not religious or legal advice, and it is not a substitute for guidance from someone you trust. | Xaashidan waxaa loogu talagalay wada hadal. Ma aha talo diini ah ama sharci ah, mana beddelayso talada qof aad ku kalsoon tahay. | |
| version | v1.0 — 2026-09-20 | v1.0 — 2026-09-20 | Not translated — a version string, same in every language. |

---

## Two lines not on this list

Two operational, non-content sentences exist only in the built HTML, not
in the 49 approved rows above, because they didn't exist in this form when
those rows were reviewed: the four-page file's cross-reference to the
one-page file, and the one-page file's combined "this is the one-page
version" note. Both are purely wayfinding (which file to use, printed
where), translated directly in the HTML build rather than routed through
this table. Worth a look if this file is ever revisited.

## What's built from this

- `public/niyyah-money-conversation-sheet-so.html` — four printed pages,
  the same structure as the English sheet.
- `public/niyyah-money-conversation-sheet-1page-so.html` — the same
  twenty questions condensed to one printed page.
- `public/niyyah-money-conversation-sheet-so.txt` — plain-text twin.
- Catalog rows in `docs/ASSETS.md` (N3-so, N3-1page-so), `built, not yet
  checked` — same as every other asset, a URL is not "live and checked"
  until a person opens it on a session-less device.
- Structural tests in `tests/sheet-so.test.ts`.
