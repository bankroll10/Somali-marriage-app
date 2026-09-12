import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { DESCRIPTION, OG_ALT, TAGLINE, TITLE } from './src/data/brand.js'

/** Must match DEFAULT_SITE_HOST in src/lib/site.ts. */
const DEFAULT_SITE_HOST = 'joinniyyah.com'

/**
 * The brand strings index.html carries, filled from src/data/brand.ts at
 * build time so the community's name has one home (docs/BACKWARD.md's
 * institution rule, made enforceable — see that file).
 */
const BRAND: Record<string, string> = {
  '%BRAND_TITLE%': TITLE,
  '%BRAND_DESCRIPTION%': DESCRIPTION,
  '%BRAND_TAGLINE%': TAGLINE,
  '%BRAND_OG_ALT%': OG_ALT,
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // The social-card tags need an absolute URL, which means the host has to be
  // known at build time. Reading it here keeps index.html free of a hostname
  // we do not own — see the note in src/lib/site.ts.
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const host = env.VITE_SITE_HOST || DEFAULT_SITE_HOST

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'niyyah-site-host',
        transformIndexHtml: (html: string) =>
          Object.entries(BRAND).reduce((out, [key, value]) => out.replaceAll(key, value), html.replaceAll('%SITE_HOST%', host)),
      },
    ],
  }
})
