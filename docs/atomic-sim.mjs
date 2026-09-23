// The simulation behind docs/ATOMIC.md. Run it: `node docs/atomic-sim.mjs`.
//
// Layer 1 is the pool exactly as netlify/functions/pool.ts computes it —
// eligible(w, m) means both are aged and neither side's checkable
// non-negotiables block the other (netlify/shared/gate.ts, since 2026-09-23:
// `faith-nn` against his practice being cultural; `kids-nn` against want
// facing no). The age band — he at most ten years older, three younger — is
// our assumption, and since docs/ALIGNMENT.md G3 it is reported beside the
// gate, never inside it: the "with our age band" rows are /pool's
// `withinAgeGap` columns. It reports what /pool would report: the
// eligible-pair share `p`, and the share of each side with at least three
// eligible partners, by pool size and ratio.
//
// Layer 2 adds the two quantities the architecture does not hold and cannot
// see: `q`, the share of eligible pairs where an introduction would be welcome
// on both sides once made (the five uncheckable non-negotiables, the map,
// family, qabiil, relocation, attraction, timing); and `a`, the share of
// counted members who would answer an introduction this fortnight (a kept map
// is live for a year; live is not active). It reports what a new arrival
// would actually find: the chance of at least one, and at least three,
// genuinely compatible, active options.
//
// Every distribution below is a HYPOTHESIS. The point of the exercise is not
// the numbers; it is that layer 1 is flat in N and layer 2 is not — the
// readout the product has cannot answer the question the founder asked.
// The seed is fixed so two runs agree.

let seed = 42
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}
const pick = (table) => {
  let r = rnd()
  for (const [k, p] of table) if ((r -= p) <= 0) return k
  return table[table.length - 1][0]
}

// gate.ts, transcribed.
const CLASH = new Set(['want/no', 'no/want'])
const blocked = (nn, hers, his) =>
  (nn.includes('faith-nn') && his.practice === 'cultural') ||
  (nn.includes('kids-nn') && CLASH.has(`${hers.children}/${his.children}`))
// pool.ts, transcribed: AGE_GAP = { olderBy: 10, youngerBy: 3 } — reported, not gated.
const inBand = (w, m) => !(m.age - w.age > 10 || w.age - m.age > 3)
const eligible = (w, m) => !blocked(w.nn, w, m) && !blocked(m.nn, m, w)

// The assumed community. Women 24–34, men 26–36; practice 30/40/20/10
// devout / consistent / returning / cultural; children 70/25/5 want / open /
// no; faith-nn named by 60% of women and 50% of men; kids-nn by 40% and 30%.
const PRACTICE = [['devout', 0.3], ['consistent', 0.4], ['returning', 0.2], ['cultural', 0.1]]
const CHILDREN = [['want', 0.7], ['open', 0.25], ['no', 0.05]]
const person = ([lo, hi], faithNN, kidsNN, active) => {
  const nn = []
  if (rnd() < faithNN) nn.push('faith-nn')
  if (rnd() < kidsNN) nn.push('kids-nn')
  return { age: lo + Math.floor(rnd() * (hi - lo + 1)), practice: pick(PRACTICE), children: pick(CHILDREN), nn, active: rnd() < active }
}
const women = (n, a = 1) => Array.from({ length: n }, () => person([24, 34], 0.6, 0.4, a))
const men = (n, a = 1) => Array.from({ length: n }, () => person([26, 36], 0.5, 0.3, a))

const pct = (x) => `${Math.round(x * 100)}%`.padStart(4)
const share = (inv, k) => inv.filter((n) => n >= k).length / inv.length

// ---------------------------------------------------------------- layer 1
function layer1(label, W, M, { ageOn = false, gateOn = true } = {}, trials = 300) {
  const ok = (w, m) => (!ageOn || inBand(w, m)) && (!gateOn || (!blocked(w.nn, w, m) && !blocked(m.nn, m, w)))
  let p = 0, w3 = 0, m3 = 0, w6 = 0
  for (let t = 0; t < trials; t++) {
    const ws = women(W), ms = men(M)
    const invW = ws.map((w) => ms.filter((m) => ok(w, m)).length)
    const invM = ms.map((m) => ws.filter((w) => ok(w, m)).length)
    p += invW.reduce((s, n) => s + n, 0) / (W * M)
    w3 += share(invW, 3); m3 += share(invM, 3); w6 += share(invW, 6)
  }
  console.log(`  ${label.padEnd(26)} p ${pct(p / trials)}   women ≥3 ${pct(w3 / trials)}   men ≥3 ${pct(m3 / trials)}   women 6+ ${pct(w6 / trials)}`)
}

console.log('LAYER 1 — the readout /pool would give (pool.ts eligibility; 300 trials each)')
layer1('40/40, age band only', 40, 40, { ageOn: true, gateOn: false })
layer1('40/40, as built (gate)', 40, 40)
layer1('40/40, with our age band', 40, 40, { ageOn: true })
layer1('12/12', 12, 12)
layer1('8/8', 8, 8)
layer1('40/13 (3:1)', 40, 13)
layer1('40/7 (6:1)', 40, 7)
console.log('  where the checklist’s λ ≥ 5 first holds (λ = other side × p), equal sides:')
for (const N of [5, 8, 9, 10, 12]) layer1(`${N}/${N}`, N, N)

// ---------------------------------------------------------------- layer 2
function layer2(W, M, q, a, trials = 400) {
  let w1 = 0, w3 = 0, m1 = 0, m3 = 0
  for (let t = 0; t < trials; t++) {
    const ws = women(W, a), ms = men(M, a)
    // Welcome both ways, and the other side still there to answer. The age
    // band stays in here as part of the hypothesis of what is welcome: the
    // product no longer assumes it (docs/ALIGNMENT.md G3), but a simulation of
    // what families will say yes to still may, so this layer stays
    // conservative and moves only with the narrowed gate.
    const welcome = (w, m) => eligible(w, m) && inBand(w, m)
    const good = (w, m) => m.active && welcome(w, m) && rnd() < q
    const invW = ws.map((w) => ms.filter((m) => good(w, m)).length)
    const invM = ms.map((m) => ws.filter((w) => w.active && welcome(w, m) && rnd() < q).length)
    w1 += share(invW, 1); w3 += share(invW, 3); m1 += share(invM, 1); m3 += share(invM, 3)
  }
  return `women ≥1 ${pct(w1 / trials)} ≥3 ${pct(w3 / trials)}   men ≥1 ${pct(m1 / trials)} ≥3 ${pct(m3 / trials)}`
}

console.log('\nLAYER 2 — what a new arrival finds: ≥1 / ≥3 compatible AND active options (400 trials each)')
for (const [q, a] of [[0.3, 1], [0.15, 1], [0.08, 1], [0.15, 0.5]]) {
  console.log(`  q = ${q} (share of eligible pairs welcome both ways), a = ${a} (share who would answer this fortnight)`)
  for (const [W, M] of [[20, 20], [25, 20], [40, 40], [60, 60], [100, 100], [40, 13], [40, 7], [120, 40]]) {
    console.log(`    ${String(W).padStart(3)}/${String(M).padEnd(3)}  ${layer2(W, M, q, a)}`)
  }
}
