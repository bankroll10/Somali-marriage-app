import { ALL_HAD, OWN_ANSWER_FIRST, SAY_THE_LINE, TOPICS, WORK_IT_OUT, type ElevenScript, type Topic } from '../data/eleven.js'
import { toolPath, type Guide } from '../data/tools.js'

/**
 * The eleven as a page, written at build.
 *
 * A mosque scheduling a nikah, a counselling service before a premarital
 * session, an institute's resource list: each hands a couple a link or a
 * printed sheet, and neither a link preview nor a printer runs our app. So
 * the guide is plain HTML written from src/data/eleven.ts when the site is
 * built — the same words the interactive eleven uses, all of them on one
 * page, with a stylesheet for a phone and one for paper.
 *
 * Three things about it are deliberate:
 *
 *   1. **The voice is for two readers.** Everything in eleven.ts is written to
 *      one person about the person they are talking to, in pronoun tokens.
 *      Here the tokens resolve to they / them / their, and the preface says
 *      the words are for either of you to say. The two lines that name a
 *      side by role rather than pronoun stay as written: they are the
 *      observation, not a token.
 *   2. **It says what it is on page one.** Who made it, that it is free and
 *      needs no account, that nothing here is recorded, what the app version
 *      does with answers, that the app has a guide that uses an AI model and
 *      this page does not, and that the topics include qabiil and a second
 *      wife. An institution reviewing it should see all of that before the
 *      first conversation, not discover it.
 *   3. **Nothing runs on it but five lines.** The only script forwards a
 *      `?via=` on the page's own address onto the links into the app, so an
 *      arrival from a placement is remembered as what kind of link it was —
 *      exactly as src/main.tsx does for every other link. Opening the page
 *      itself counts nothing, anywhere.
 *
 * Pure: no DOM, no `import.meta.env`, `.js` on the relative imports — this is
 * loaded by vite.config.ts under tsconfig.node.json, like toolPages.ts.
 */

/** A couple reading together. Longest tokens first, as read.ts's `say()` does, so {He} can never eat {His}. */
export function neutral(text: string): string {
  return text
    .replace(/\{himself\}/g, 'themselves')
    .replace(/\{His\}/g, 'Their')
    .replace(/\{Him\}/g, 'Them')
    .replace(/\{He\}/g, 'They')
    .replace(/\{his\}/g, 'their')
    .replace(/\{him\}/g, 'them')
    .replace(/\{he\}/g, 'they')
}

function esc(s: string): string {
  return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
}

/** The approved Somali line for the eleven — the same one BeforeYes.tsx shows (src/data/somali.ts). */
export const SOMALI_INTRO = 'Wada hadallada muhiimka ah.'

export interface GuideOptions {
  host: string
  /** The built stylesheet, for the two self-hosted fonts and the palette. Optional: the page reads without it. */
  cssHref?: string
}

function head(title: string, description: string, url: string, host: string, cssHref?: string): string {
  const t = esc(title)
  const d = esc(description)
  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="UTF-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />',
    `<title>${t}</title>`,
    `<meta name="description" content="${d}" />`,
    `<link rel="canonical" href="${url}" />`,
    '<link rel="icon" type="image/svg+xml" href="/favicon.svg" />',
    '<meta name="theme-color" content="#16271f" />',
    `<meta property="og:title" content="${t}" />`,
    `<meta property="og:description" content="${d}" />`,
    '<meta property="og:type" content="article" />',
    '<meta property="og:site_name" content="Niyyah" />',
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="https://${host}/og.png" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${t}" />`,
    `<meta name="twitter:description" content="${d}" />`,
    `<meta name="twitter:image" content="https://${host}/og.png" />`,
    ...(cssHref ? [`<link rel="stylesheet" href="${esc(cssHref)}" />`] : []),
    `<style>${CSS}</style>`,
    '</head>',
  ].join('\n')
}

/**
 * The page's own stylesheet. The palette and the two typefaces are the app's
 * (src/index.css); the layout is a document, not a screen — one column,
 * measured line length, generous white space, and on paper one conversation
 * per block with nothing split across a page.
 */
const CSS = `
:root{--cream:#f7f2e8;--sand:#e7dcc6;--ink:#1f2420;--ink-soft:#3c423b;--muted:#75726a;--forest:#1d3a2c;--gold:#c19a4b;--line:#ddd2bd}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--cream);color:var(--ink);font:16px/1.55 Inter,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.page{max-width:42rem;margin:0 auto;padding:2.5rem 1.25rem 4rem}
h1,h2,h3,.eyebrow{font-family:Fraunces,Georgia,"Times New Roman",serif;font-weight:500;letter-spacing:-.01em}
.eyebrow{font-family:Inter,system-ui,sans-serif;font-size:.72rem;font-weight:600;letter-spacing:.22em;text-transform:uppercase;color:var(--gold);margin:0 0 .75rem}
h1{font-size:2rem;line-height:1.15;margin:0 0 .5rem;text-wrap:balance}
.somali{font-style:italic;color:var(--ink-soft);margin:0 0 1.5rem;font-size:1.05rem}
.whole{margin:-.9rem 0 1.5rem;font-size:.95rem;color:var(--muted)}
.whole a{color:var(--forest);font-weight:500}
.preface p{margin:0 0 .9rem;color:var(--ink-soft)}
.about{border-left:2px solid var(--gold);padding-left:1rem;margin:1.5rem 0 0;color:var(--muted);font-size:.92rem}
.about p{margin:0 0 .6rem}
.talks{list-style:none;padding:0;margin:2.5rem 0 0}
.talk{border-top:1px solid var(--line);padding:1.75rem 0 1.5rem;break-inside:avoid;page-break-inside:avoid}
.talk h2{font-size:1.45rem;line-height:1.2;margin:0 0 .35rem}
.talk .n{color:var(--gold);font-variant-numeric:tabular-nums;margin-right:.5rem}
.talk .prompt{margin:0 0 1rem;color:var(--ink-soft);font-size:1.02rem}
.talk h3{font-family:Inter,system-ui,sans-serif;font-size:.72rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin:1.1rem 0 .3rem}
.talk p{margin:0}
.talk blockquote{margin:0;padding:.85rem 1rem;border-left:3px solid var(--gold);background:rgba(255,255,255,.55);font-family:Fraunces,Georgia,serif;font-size:1.08rem;line-height:1.5}
.mark{display:none}
.close{border-top:1px solid var(--line);margin-top:2.5rem;padding-top:1.5rem}
.close h2{font-size:1.25rem;margin:0 0 .5rem}
.close p{margin:0 0 .75rem;color:var(--ink-soft)}
.cta{display:inline-block;margin-top:.5rem;padding:.7rem 1.1rem;border-radius:999px;background:var(--forest);color:var(--cream);text-decoration:none;font-weight:500}
footer{margin-top:2.5rem;padding-top:1.25rem;border-top:1px solid var(--line);color:var(--muted);font-size:.85rem}
footer a{color:var(--forest)}
.sample .talk{padding:1.1rem 0 1rem}
.sample .talk h2{font-size:1.2rem}
.sample .talk blockquote{font-size:.98rem;padding:.6rem .85rem}
.sample .talk h3{margin:.7rem 0 .2rem}
.sample .preface p,.sample .about p{font-size:.9rem;margin-bottom:.5rem}
@media print{
  @page{size:Letter;margin:14mm 16mm}
  body{background:#fff;color:#000;font-size:10.5pt;line-height:1.4}
  .page{max-width:none;padding:0}
  .about{color:#333}
  .talk{padding:.85rem 0 .75rem}
  .talk blockquote{background:none;border-left-color:#999;font-size:10.5pt}
  .cta{display:none}
  a[data-app]::after,a[data-guide]::after{content:" (" attr(href) ")";color:#555;font-weight:400}
  .noprint{display:none}
  .mark{display:flex;flex-wrap:wrap;gap:.2rem 1.4rem;margin:.6rem 0 0;font-size:8.5pt;color:#333;break-before:avoid;page-break-before:avoid}
  .mark span{display:inline-flex;align-items:center}
  .mark span::before{content:"";display:inline-block;width:9pt;height:9pt;margin-right:.3rem;border:.6pt solid #666}
  body.sample{font-size:9.2pt;line-height:1.28}
  body.sample h1{font-size:15pt;margin-bottom:.2rem}
  body.sample .somali{font-size:9.5pt;margin-bottom:.5rem}
  body.sample .eyebrow{margin-bottom:.3rem}
  body.sample .preface p,body.sample .about p{font-size:8.8pt;margin-bottom:.35rem}
  body.sample .whole{margin:-.25rem 0 .4rem;font-size:8.8pt}
  body.sample .about{margin-top:.5rem;padding-left:.7rem}
  body.sample .talks{margin-top:.8rem;columns:2;column-gap:1.3rem}
  body.sample .talk{break-inside:auto;page-break-inside:auto;padding:.45rem 0 .4rem;border-top:none}
  body.sample .talk h2{font-size:11.5pt;margin-bottom:.15rem}
  body.sample .talk .prompt{font-size:9pt;margin-bottom:.35rem}
  body.sample .talk h3{font-size:6.8pt;margin:.45rem 0 .1rem;break-after:avoid;page-break-after:avoid}
  body.sample .talk blockquote,body.sample .talk h3+p{break-before:avoid;page-break-before:avoid}
  body.sample .talk blockquote{font-size:9.2pt;padding:.35rem .6rem}
  body.sample .close{margin-top:.6rem;padding-top:.5rem}
  body.sample .close h2{font-size:10.5pt;margin-bottom:.2rem}
  body.sample .close p{font-size:8.8pt;margin-bottom:.3rem}
  body.sample .mark{gap:.15rem .6rem;margin-top:.35rem;font-size:7.2pt}
  body.sample .mark span::before{width:7pt;height:7pt;margin-right:.2rem}
  body.sample footer{margin-top:.5rem;padding-top:.4rem;font-size:8pt}
}
`

function talk(topic: Topic, n: number): string {
  const s: ElevenScript = topic.script
  return [
    '<li class="talk">',
    `<h2><span class="n">${n}.</span>${esc(neutral(topic.label))}</h2>`,
    `<p class="prompt">${esc(neutral(topic.prompt))}</p>`,
    '<h3>Why ask it early</h3>',
    `<p>${esc(neutral(topic.why))}</p>`,
    '<h3>The words</h3>',
    `<blockquote>${esc(neutral(s.words))}</blockquote>`,
    '<h3>What to listen for</h3>',
    `<p>${esc(neutral(s.tells))}</p>`,
    // Print only. On screen the interactive eleven records these states
    // properly; a row of boxes that cannot be ticked is dead interface. On
    // paper it is what turns a handout into something two people work
    // through, which is what a coordinator means by preparation materials.
    // "Still discussing" was the only box for a difference, so on paper a
    // difference could only be unfinished; not agreeing comes in three kinds
    // (docs/DECISIONS.md Part 8).
    '<p class="mark"><span>Agreed</span><span>Worked out</span><span>Still open</span><span>A line</span><span>Need help</span></p>',
    '</li>',
  ].join('\n')
}

/**
 * What the page says about itself, before the first conversation. Every
 * sentence here is held by tests/guides.test.ts and must match what the app
 * does (src/components/Trust.tsx says the same things to a member).
 */
function about(host: string, guide: Guide, sample = false): string {
  if (sample) {
    return [
      '<div class="about">',
      `<p><strong>Made by Niyyah</strong>, a marriage product for the Somali diaspora, built by a Somali. Free, needs no account, and nothing you read or decide here is recorded. The <a href="${toolPath(guide.toolSlug)}" data-app>interactive version</a> keeps your answers on your own phone unless you choose to send the two-sided sheet to your partner; the app also has a guide that uses an AI model; this page does not. The eleven include qabiil and a second wife, named as such — we take no position on any of them.</p>`,
      '</div>',
    ].join('\n').replace('joinniyyah.com', host)
  }
  return [
    '<div class="about">',
    `<p><strong>Made by Niyyah</strong>, a marriage product for the Somali diaspora, built by a Somali. This guide is free, needs no account, and nothing you read or decide here is recorded — opening this page counts nothing, anywhere.</p>`,
    `<p>There is also an <a href="${toolPath(guide.toolSlug)}" data-app>interactive version</a> at joinniyyah.com that asks which of the eleven you two have had and hands you the one to open first. It keeps your answers on your own phone unless you choose to send the two-sided sheet to your partner, who answers on theirs. The app also has a guide that uses an AI model; this page does not.</p>`,
 `<p>The eleven include qabiil and a second wife, named as such. We take no position on any of them. Every conversation ends in words you can say.</p>`,
    '</div>',
  ].join('\n')
    .replace('joinniyyah.com', host)
}

function preface(sample: boolean): string {
  if (sample) {
    return [
      '<div class="preface">',
      '<p>The apps ask who is available. These ask what the two of you have said — where you’ll live, money sent home, who is in the house. Found out after the families are involved, any of them is harder to say no to. These are three of the eleven, asked early. Read them separately first, then together; the words are for either of you to say.</p>',
      '</div>',
    ].join('\n')
  }
  return [
    '<div class="preface">',
 '<p>The apps ask who is available. These ask what the two of you have said: where you’ll live and whether a mother is in the house, money sent home, whether she keeps working, what “practising” means on a Tuesday, qabiil at somebody’s table, a second wife. Found out after the families are involved, any of them is harder to say no to.</p>',
    '<p>This is the list, asked early. Read it separately first, then together. For each one: why to ask it early, the words to open it — for either of you to say — and what to listen for in the answer. Nothing here scores anyone. It only asks whether the two of you have had the conversation.</p>',
    '</div>',
  ].join('\n')
}

function closing(guide: Guide, full: boolean, host: string): string {
  const own = OWN_ANSWER_FIRST
  const all = ALL_HAD
  const open = WORK_IT_OUT
  const line = SAY_THE_LINE
  return [
    '<section class="close">',
    ...(full
      ? [
          '<h2>When you don’t know your own answer yet</h2>',
          `<p>${esc(neutral(own.why))}</p>`,
          `<blockquote>${esc(neutral(own.words))}</blockquote>`,
          `<p>${esc(neutral(own.tells))}</p>`,
          '<h2>When you see it differently</h2>',
          `<p>${esc(neutral(open.why))}</p>`,
          `<blockquote>${esc(neutral(open.words))}</blockquote>`,
          `<p>${esc(neutral(open.tells))}</p>`,
          '<h2>When it is a line for one of you</h2>',
          `<p>${esc(neutral(line.why))}</p>`,
          `<blockquote>${esc(neutral(line.words))}</blockquote>`,
          '<h2>When you have had them all</h2>',
          `<p>${esc(neutral(all.why))}</p>`,
          `<blockquote>${esc(neutral(all.words))}</blockquote>`,
        ]
      : [
          '<h2>The other eight</h2>',
          `<p>Whether you’d work, children, deen day to day, the aroos and the mahr, qabiil, going back, a second wife, and when the families disagree — each with its words, in the full guide at <a href="${guide.path}">${host + guide.path}</a>.</p>`,
        ]),
    `<a class="cta" href="${toolPath(guide.toolSlug)}" data-app>See which of the eleven you two have had →</a>`,
    '</section>',
  ].join('\n')
}

/** Forwards a `?via=` on this page's address to the links into the app, and nothing else. */
const VIA_SCRIPT = `<script>
(function(){var v=new URLSearchParams(location.search).get('via');if(!v||!/^[a-z]+$/.test(v))return;
document.querySelectorAll('a[data-app],a[data-guide]').forEach(function(a){var u=new URL(a.getAttribute('href'),location.origin);u.searchParams.set('via',v);a.setAttribute('href',u.pathname+u.search)})})()
</script>`

function page(guide: Guide, opts: GuideOptions, sample: boolean): string {
  const topics = sample ? guide.sample.map((id) => TOPICS.find((t) => t.id === id)).filter((t): t is Topic => !!t) : TOPICS
  if (sample && topics.length !== guide.sample.length) throw new Error('guide sample names a topic the eleven does not have')
  const url = `https://${opts.host}${sample ? guide.samplePath : guide.path}`
  const title = sample ? guide.sampleTitle : guide.title
  const description = sample ? guide.sampleDescription : guide.description
  return [
    head(title, description, url, opts.host, opts.cssHref),
    `<body class="${sample ? 'sample' : 'full'}">`,
    '<div class="page">',
    '<header>',
    // The two pages were indistinguishable above the fold on a phone: the same
    // eyebrow, headings that differed by two words, the same Somali line, and
    // then the same first conversation. A reviewer could land on the sample and
    // take it for the whole resource. So the sample says what it is in the
    // first line read, and links the full guide before the conversations
    // rather than only after them.
    `<p class="eyebrow">Before you say yes${sample ? ' \u00b7 three of the eleven' : ''}</p>`,
    `<h1>${sample ? 'Three of the eleven conversations to have before the families do' : 'The eleven conversations to have before the families do'}</h1>`,
    `<p class="somali" lang="so">${SOMALI_INTRO} <span lang="en">The important conversations, before the families have them for you.</span></p>`,
    ...(sample
      ? [`<p class="whole">A sample. <a href="${guide.path}" data-guide>The full guide has all eleven \u2192</a></p>`]
      : []),
    preface(sample),
    about(opts.host, guide, sample),
    '</header>',
    '<main>',
    `<ol class="talks">`,
    ...topics.map((t, i) => talk(t, sample ? i + 1 : TOPICS.indexOf(t) + 1)),
    '</ol>',
    closing(guide, !sample, opts.host),
    '</main>',
    '<footer>',
    `<p>Niyyah — <a href="https://${opts.host}/">${opts.host}</a>. ${sample ? 'A one-page sample; the full guide is at ' + `<a href="${guide.path}">${opts.host}${guide.path}</a>.` : 'This page may be printed and shared as it is.'} No account, nothing recorded.</p>`,
    '</footer>',
    '</div>',
    VIA_SCRIPT,
    '</body>',
    '</html>',
    '',
  ].join('\n')
}

export function guideHtml(guide: Guide, opts: GuideOptions): string {
  return page(guide, opts, false)
}

export function sampleHtml(guide: Guide, opts: GuideOptions): string {
  return page(guide, opts, true)
}
