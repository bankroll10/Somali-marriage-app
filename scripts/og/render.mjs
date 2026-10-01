// Renders scripts/og/og.html to the social card (1200×630) with a local
// headless Chromium, and writes it to BOTH public/og-pilot.png (the file the
// metadata names, src/data/brand.ts OG_IMAGE) and public/og.png (the address
// earlier links already carry, kept as an identical copy). No dependency: set
// CHROMIUM to a headless_shell binary, or it looks for the one Playwright
// installs under PLAYWRIGHT_BROWSERS_PATH (default /opt/pw-browsers).
//   npm run og
//
// The render goes to a fresh temporary file, and the two public files are only
// written from it after it has been checked: Chromium exited cleanly, the file
// is new, and it is a 1200×630 PNG. A failed render therefore throws and
// leaves both public files exactly as they were; it can never copy an old
// output and report success.
import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const root = resolve(import.meta.dirname, '..', '..')
const TARGETS = [join(root, 'public', 'og-pilot.png'), join(root, 'public', 'og.png')]
const WIDTH = 1200
const HEIGHT = 630

function chromium() {
  if (process.env.CHROMIUM) return process.env.CHROMIUM
  // The headless shell, because it gives the page the full window as its
  // viewport; full Chromium's headless screenshot leaves the page ~85px short.
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers'
  const dirs = existsSync(base) ? readdirSync(base) : []
  const shell = dirs.find((d) => /^chromium_headless_shell-\d+$/.test(d))
  const bin = shell && join(base, shell, 'chrome-linux', 'headless_shell')
  if (bin && existsSync(bin)) return bin
  throw new Error('No headless Chromium found: set CHROMIUM=/path/to/headless_shell')
}

const work = mkdtempSync(join(tmpdir(), 'niyyah-og-'))
const rendered = join(work, 'card.png')
try {
  const started = Date.now()
  execFileSync(
    chromium(),
    [
      '--headless', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
      '--allow-file-access-from-files', '--force-device-scale-factor=1',
      `--window-size=${WIDTH},${HEIGHT}`, '--virtual-time-budget=3000',
      `--screenshot=${rendered}`, pathToFileURL(join(root, 'scripts', 'og', 'og.html')).href,
    ],
    { stdio: 'inherit' },
  )
  if (!existsSync(rendered) || statSync(rendered).mtimeMs < started - 1000) throw new Error('Chromium did not write a new image')
  const png = readFileSync(rendered)
  if (png.subarray(1, 4).toString() !== 'PNG' || png.readUInt32BE(16) !== WIDTH || png.readUInt32BE(20) !== HEIGHT) {
    throw new Error(`Rendered file is not a ${WIDTH}×${HEIGHT} PNG`)
  }
  // Copy beside the target, then rename: a target is never left half-written.
  for (const target of TARGETS) {
    const part = `${target}.part`
    copyFileSync(rendered, part)
    renameSync(part, target)
    console.log(`wrote ${target}`)
  }
} finally {
  rmSync(work, { recursive: true, force: true })
}
