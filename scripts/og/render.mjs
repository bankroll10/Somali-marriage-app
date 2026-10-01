// Renders scripts/og/og.html to public/og-pilot.png (1200×630) with a local
// headless Chromium. No dependency: set CHROMIUM to a headless_shell binary, or
// it looks for the one Playwright installs under PLAYWRIGHT_BROWSERS_PATH
// (default /opt/pw-browsers).
//   npm run og
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const root = resolve(import.meta.dirname, '..', '..')
const out = join(root, 'public', 'og-pilot.png')

function chromium() {
  if (process.env.CHROMIUM) return process.env.CHROMIUM
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers'
  // The headless shell, because it gives the page the full window as its
  // viewport; full Chromium's headless screenshot leaves the page ~85px short.
  const dirs = existsSync(base) ? readdirSync(base) : []
  const shell = dirs.find((d) => /^chromium_headless_shell-\d+$/.test(d))
  const bin = shell && join(base, shell, 'chrome-linux', 'headless_shell')
  if (bin && existsSync(bin)) return bin
  throw new Error('No headless Chromium found: set CHROMIUM=/path/to/headless_shell')
}

execFileSync(
  chromium(),
  [
    '--headless', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
    '--allow-file-access-from-files', '--force-device-scale-factor=1',
    '--window-size=1200,630', '--virtual-time-budget=3000',
    `--screenshot=${out}`, pathToFileURL(join(root, 'scripts', 'og', 'og.html')).href,
  ],
  { stdio: 'inherit' },
)
console.log(`wrote ${out}`)
