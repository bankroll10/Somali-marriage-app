/**
 * Put a backup back: `npx tsx scripts/restore.ts <backup.json> --site <site-id> [--write] [--overwrite]`
 *
 * A dry run unless `--write` is given. Needs NETLIFY_AUTH_TOKEN (a personal
 * access token: Netlify → User settings → Applications). Rehearse it against a
 * scratch Netlify site before the day it is needed — never production
 * (docs/RECOVERY.md, "Restore drill"). The rules are netlify/shared/restore.ts's:
 * progress records and the joint tally, never over anything already there.
 */
import { readFileSync } from 'node:fs'
import { getStore } from '@netlify/blobs'
import { restore } from '../netlify/shared/restore'

const args = process.argv.slice(2)
const file = args.find((a) => !a.startsWith('--'))
const siteID = args[args.indexOf('--site') + 1]
const token = process.env.NETLIFY_AUTH_TOKEN
const write = args.includes('--write')
const overwrite = args.includes('--overwrite')

if (!file || !args.includes('--site') || !siteID || siteID.startsWith('--')) {
  console.error('usage: npx tsx scripts/restore.ts <backup.json> --site <site-id> [--write] [--overwrite]')
  process.exit(2)
}
if (!token) {
  console.error('NETLIFY_AUTH_TOKEN is not set. Netlify → User settings → Applications → New access token.')
  process.exit(2)
}

const backup = JSON.parse(readFileSync(file, 'utf8'))
const report = await restore(backup, (name) => getStore({ name, siteID, token, consistency: 'strong' }), { write, overwrite })
console.log(JSON.stringify(report, null, 2))
if (!write) console.log('\nA dry run: nothing was written. Add --write to restore.')
