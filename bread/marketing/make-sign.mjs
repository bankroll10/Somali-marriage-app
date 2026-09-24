/**
 * Makes the plain QR code, the printable QR sign and the phone-screen card
 * for the shop, from the same shared/config.ts the site runs on — so the
 * prices, days, hours, pickup, deadline and phone number on paper are the
 * ones customers will see online. Re-run it whenever any of those change.
 *
 *   cd bread/marketing
 *   npm install --no-save qrcode jsqr pngjs playwright
 *   node --experimental-strip-types make-sign.mjs
 *
 * Writes qr.png and qr.svg (the bare code, for her own signs and cards),
 * sign.pdf (US Letter), sign.png and phone-card.png to bread/public/share/,
 * where the site serves them and the admin Share page links to them, then
 * decodes the QR code back out of every image and refuses to finish if it
 * does not read exactly the site's address. A sign that does not scan is
 * worse than no sign.
 *
 * Optional: PLAYWRIGHT_MODULE (path to playwright's index.mjs) and
 * CHROMIUM_PATH, for machines where they are installed somewhere unusual.
 */
import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import QRCode from 'qrcode'
import jsQR from 'jsqr'
import { PNG } from 'pngjs'
import * as config from '../shared/config.ts'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const here = (name) => fileURLToPath(new URL(name, import.meta.url))
// The finished files are served by the site, so Biz can download them from
// Admin → Share. The generated HTML stays here, next to this script.
const SHARE_DIR = '../public/share/'
const out = (name) => here(SHARE_DIR + name)

// ── Everything the sign says, read from the site's own config ─────────────
const url = config.SITE_URL
const shownUrl = url.replace(/^https:\/\//, '')
const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const pickupDays = config.PICKUP_WEEKDAYS.map((d) => days[d].slice(0, 3)).join(' · ')
const hour12 = (h) => `${h > 12 ? h - 12 : h} ${h >= 12 ? 'PM' : 'AM'}`
const hours = `${hour12(config.PICKUP_START_HOUR).replace(' PM', '')}–${hour12(config.PICKUP_END_HOUR)}`
const cutoff = `${hour12(config.ORDER_CUTOFF_HOUR)} the day before`
// Sizes of one bread share a line: "Banana bread $3 small / $7 large".
const menu = []
for (const p of config.PRODUCTS) {
  const size = /^(Small|Large) /.exec(p.name)?.[1]
  const base = size ? p.name.slice(size.length + 1).replace(/^./, (c) => c.toUpperCase()) : p.name
  const price = { price: config.formatMoney(p.priceCents), size: size?.toLowerCase() }
  const line = menu.find((m) => m.name === base)
  if (line) line.prices.push(price)
  else menu.push({ name: base, prices: [price] })
}
const pickup = config.PICKUP_SHORT
const phone = config.CONTACT_PHONE

// High error correction: a creased, glare-y or slightly torn print still scans.
const qr = await QRCode.toString(url, { type: 'svg', errorCorrectionLevel: 'H', margin: 4, color: { dark: '#2a1d14', light: '#ffffff' } })

// The bare code, black on white with its quiet zone, for her own signs and
// cards: a large PNG for phones and printing, and an SVG that stays sharp at
// any size.
const plain = { errorCorrectionLevel: 'H', margin: 4, color: { dark: '#000000', light: '#ffffff' } }
await QRCode.toFile(out('qr.png'), url, { ...plain, type: 'png', width: 1200 })
writeFileSync(out('qr.svg'), await QRCode.toString(url, { ...plain, type: 'svg' }))

const loaf = `<svg viewBox="0 0 96 72" aria-hidden="true"><ellipse cx="48" cy="46" rx="34" ry="17" fill="#9a5426"/><ellipse cx="48" cy="40" rx="34" ry="17" fill="#c2743a"/><ellipse cx="46" cy="36" rx="24" ry="9" fill="#e0a26a" opacity="0.55"/><path d="M30 34 q6 -4 12 0 M42 30 q6 -4 12 0 M54 34 q6 -4 12 0" stroke="#fbf6ee" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>`

const css = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #fbf6ee; color: #3b2a1e; font-family: 'DejaVu Sans', 'Helvetica Neue', Arial, sans-serif; }
  .serif { font-family: 'DejaVu Serif', Georgia, 'Times New Roman', serif; }
  .kicker { color: #9a5426; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; }
  .qr { background: #fff; border-radius: 18px; overflow: hidden; }
  .qr svg { display: block; width: 100%; height: 100%; }
  .menu { display: flex; flex-direction: column; align-items: center; gap: 0.15em; font-weight: 700; }
  .menu span { white-space: nowrap; }
  .menu span b { color: #9a5426; }
  .menu .size { font-weight: 400; color: #6b5545; }
  .soft { color: #6b5545; }
`

const facts = `
  <div class="menu">${menu
    .map((m) => `<span>${m.name} ${m.prices.map((p) => `<b>${p.price}</b>${p.size ? ` <span class="size">${p.size}</span>` : ''}`).join(' / ')}</span>`)
    .join('')}</div>`

const signHtml = `<!doctype html><html><head><meta charset="utf-8"><style>${css}
  @page { size: 8.5in 11in; margin: 0; }
  body { width: 8.5in; height: 11in; padding: 0.6in 0.7in; display: flex; flex-direction: column; align-items: center; text-align: center; }
  .loaf { width: 1.3in; height: 1in; }
  .kicker { font-size: 15pt; margin-top: 0.1in; }
  h1 { font-size: 64pt; line-height: 1; margin: 0.08in 0 0.12in; }
  .menu { font-size: 22pt; }
  .qr { width: 4.1in; height: 4.1in; margin: 0.22in 0 0.1in; border: 3px solid #e6dac6; }
  .scan { font-size: 20pt; font-weight: 700; }
  .url { font-size: 15pt; margin-top: 0.04in; }
  .pickup { margin-top: 0.22in; font-size: 16pt; line-height: 1.45; }
  .pickup b { color: #3b2a1e; }
  .foot { margin-top: auto; font-size: 10pt; line-height: 1.4; }
</style></head><body>
  <div class="loaf">${loaf}</div>
  <div class="kicker">Pre-order · pay online · pick up</div>
  <h1 class="serif">${config.SHOP_NAME}</h1>
  ${facts}
  <div class="qr">${qr}</div>
  <div class="scan">Scan to order</div>
  <div class="url soft">${shownUrl}</div>
  <div class="pickup soft">
    Pick up <b>${pickupDays}, ${hours}</b><br>
    <b>${pickup}</b> — text <b>${phone}</b> for the spot<br>
    Order by <b>${cutoff}</b>
  </div>
</body></html>`

const cardHtml = `<!doctype html><html><head><meta charset="utf-8"><style>${css}
  body { width: 1080px; height: 1920px; padding: 100px 80px 80px; display: flex; flex-direction: column; align-items: center; text-align: center; }
  .loaf { width: 190px; height: 142px; }
  .kicker { font-size: 32px; margin-top: 10px; }
  h1 { font-size: 132px; line-height: 1; margin: 16px 0 24px; }
  .menu { font-size: 46px; }
  .qr { width: 620px; height: 620px; margin: 40px 0 22px; border: 6px solid #e6dac6; }
  .scan { font-size: 48px; font-weight: 700; }
  .url { font-size: 34px; margin-top: 10px; }
  .pickup { margin-top: 34px; font-size: 34px; line-height: 1.45; }
  .pickup b { color: #3b2a1e; }
  .foot { margin-top: auto; font-size: 26px; line-height: 1.45; }
</style></head><body>
  <div class="loaf">${loaf}</div>
  <div class="kicker">Pre-order · pay online · pick up</div>
  <h1 class="serif">${config.SHOP_NAME}</h1>
  ${facts}
  <div class="qr">${qr}</div>
  <div class="scan">Scan to order</div>
  <div class="url soft">${shownUrl}</div>
  <div class="pickup soft">
    Pick up <b>${pickupDays}, ${hours}</b><br>
    <b>${pickup}</b> — text <b>${phone}</b> for the spot<br>
    Order by <b>${cutoff}</b>
  </div>
</body></html>`

writeFileSync(here('sign.html'), signHtml)
writeFileSync(here('phone-card.html'), cardHtml)

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {})
try {
  const sign = await browser.newPage({ viewport: { width: 816, height: 1056 }, deviceScaleFactor: 2.5 })
  await sign.setContent(signHtml, { waitUntil: 'load' })
  await sign.pdf({ path: out('sign.pdf'), width: '8.5in', height: '11in', printBackground: true, pageRanges: '1' })
  await sign.screenshot({ path: out('sign.png'), fullPage: false })
  const spill = () => Math.max(document.body.scrollHeight - window.innerHeight, document.body.scrollWidth - window.innerWidth, ...[...document.querySelectorAll('.menu, .pickup')].map((e) => e.scrollWidth - e.clientWidth))
  const overflowSign = await sign.evaluate(spill)

  const card = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 })
  await card.setContent(cardHtml, { waitUntil: 'load' })
  await card.screenshot({ path: out('phone-card.png'), fullPage: false })
  const overflowCard = await card.evaluate(spill)
  if (overflowSign > 0 || overflowCard > 0) throw new Error(`content spills off the page (sign ${overflowSign}px, card ${overflowCard}px)`)

  // Render the SVG the way a print shop or a card app would, to prove it scans too.
  const svg = await browser.newPage({ viewport: { width: 800, height: 800 } })
  await svg.setContent(`<body style="margin:0"><img src="data:image/svg+xml;base64,${readFileSync(out('qr.svg')).toString('base64')}" style="width:800px;height:800px;display:block"></body>`, { waitUntil: 'load' })
  await svg.screenshot({ path: here('.qr-svg-check.png') })
} finally {
  await browser.close()
}

// ── Prove the codes scan ──────────────────────────────────────────────────
for (const [name, file] of [['qr.png', 'qr.png'], ['qr.svg (rendered)', '.qr-svg-check.png'], ['sign.png', 'sign.png'], ['phone-card.png', 'phone-card.png']]) {
  const png = PNG.sync.read(readFileSync(file === '.qr-svg-check.png' ? here(file) : out(file)))
  const found = jsQR(new Uint8ClampedArray(png.data), png.width, png.height)
  if (!found || found.data !== url) throw new Error(`${name}: QR reads ${found ? JSON.stringify(found.data) : 'nothing'}, expected ${url}`)
  console.log(`${name}: ${png.width}×${png.height}, QR decodes to ${found.data}`)
}
rmSync(here('.qr-svg-check.png'))
console.log('sign.pdf written (US Letter)')
